-- ============================================================================
-- 0019 CATALOG FACETS: category counts for the sidebar's "Categories" section
-- ============================================================================
-- The owner moved the subcategories off the top of the category page and into the filter
-- sidebar (2026-09-15), where each one needs a product count. The section lists the CHILDREN of
-- the current category; on a leaf (no children) it lists the leaf's siblings instead, so the
-- shopper can move sideways. Counts honour every other filter (brand, price, stock, sale, search)
-- but not the category itself — the same disjunctive rule the brand counts follow.
-- Same signature; one more key in the jsonb: categories [{id, slug, count}].
create or replace function public.catalog_facets(
  p_store_id    uuid,
  p_category_id uuid    default null,
  p_q           text    default null,
  p_brand_ids   uuid[]  default null,
  p_price_min   integer default null,
  p_price_max   integer default null,
  p_in_stock    boolean default false,
  p_on_sale     boolean default false
) returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
with base as (                          -- every filter except the category
  select v.id, v.brand_id, v.price, v.category_ids
  from public.v_catalog_products v
  where v.store_id = p_store_id
    and (p_q is null or p_q = '' or v.search_text like '%' || lower(p_q) || '%')
    and (not p_in_stock or v.in_stock)
    and (not p_on_sale or v.on_sale)
),
scope as (
  select * from base
  where p_category_id is null or category_ids @> array[p_category_id]
),
priced as (
  select * from scope
  where (p_price_min is null or price >= p_price_min)
    and (p_price_max is null or price <= p_price_max)
),
branded as (
  select * from scope
  where p_brand_ids is null or brand_id = any(p_brand_ids)
),
matched as (
  select * from priced
  where p_brand_ids is null or brand_id = any(p_brand_ids)
),
-- the sidebar lists the children of the current category, or its siblings on a leaf
nav_parent as (
  select case
    when p_category_id is null then null
    when exists (select 1 from public.categories c where c.parent_id = p_category_id and c.is_active) then p_category_id
    else (select c.parent_id from public.categories c where c.id = p_category_id)
  end as id
),
nav_cats as (
  select c.id, c.slug, c.sort_order,
         (select count(*) from base b
            where b.category_ids @> array[c.id]
              and (p_brand_ids is null or b.brand_id = any(p_brand_ids))
              and (p_price_min is null or b.price >= p_price_min)
              and (p_price_max is null or b.price <= p_price_max)) as n
  from public.categories c, nav_parent np
  where c.store_id = p_store_id and c.is_active
    and c.parent_id is not distinct from np.id
)
select jsonb_build_object(
  'total', (select count(*) from matched),
  'brands', coalesce((
    select jsonb_agg(jsonb_build_object('id', b.id, 'slug', b.slug, 'name', b.name, 'count', x.n) order by b.sort_order, b.name)
    from (select brand_id, count(*) as n from priced where brand_id is not null group by brand_id) x
    join public.brands b on b.id = x.brand_id and b.is_active
  ), '[]'::jsonb),
  'categories', coalesce((
    select jsonb_agg(jsonb_build_object('id', id, 'slug', slug, 'count', n) order by sort_order, slug) from nav_cats
  ), '[]'::jsonb),
  'priceMin', (select min(price) from branded),
  'priceMax', (select max(price) from branded),
  'p25', (select percentile_cont(0.25) within group (order by price)::integer from branded),
  'p50', (select percentile_cont(0.5)  within group (order by price)::integer from branded),
  'p75', (select percentile_cont(0.75) within group (order by price)::integer from branded)
);
$$;

comment on function public.catalog_facets is
  'Filter facets for one listing scope: brand counts (other filters applied, brand not), category counts for the sidebar (children of the scope, or siblings on a leaf; other filters applied, category not), price bounds + quartiles (brand applied, price not), total (all applied). Store-scoped by p_store_id.';
