-- ============================================================================
-- 0018 CATALOG FACETS: price quartiles for the one-tap price buckets
-- ============================================================================
-- The quick price ranges were cut from min/max, and one ₺32,945 item in "Cats" turned them into
-- "under ₺10,000 / ₺10,000–₺20,000 / …" for a shelf where nearly everything costs under ₺1,000.
-- Quartiles of the scope's real prices give buckets a shopper actually uses. Same signature,
-- three more keys in the jsonb (p25, p50, p75; brand filter applied, price filter not).
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
with scope as (
  select v.id, v.brand_id, v.price
  from public.v_catalog_products v
  where v.store_id = p_store_id
    and (p_category_id is null or v.category_ids @> array[p_category_id])
    and (p_q is null or p_q = '' or v.search_text like '%' || lower(p_q) || '%')
    and (not p_in_stock or v.in_stock)
    and (not p_on_sale or v.on_sale)
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
)
select jsonb_build_object(
  'total', (select count(*) from matched),
  'brands', coalesce((
    select jsonb_agg(jsonb_build_object('id', b.id, 'slug', b.slug, 'name', b.name, 'count', x.n) order by b.sort_order, b.name)
    from (select brand_id, count(*) as n from priced where brand_id is not null group by brand_id) x
    join public.brands b on b.id = x.brand_id and b.is_active
  ), '[]'::jsonb),
  'priceMin', (select min(price) from branded),
  'priceMax', (select max(price) from branded),
  'p25', (select percentile_cont(0.25) within group (order by price)::integer from branded),
  'p50', (select percentile_cont(0.5)  within group (order by price)::integer from branded),
  'p75', (select percentile_cont(0.75) within group (order by price)::integer from branded)
);
$$;

comment on function public.catalog_facets is
  'Filter facets for one listing scope: brand counts (other filters applied, brand not), price bounds + quartiles (brand applied, price not), total (all applied). Store-scoped by p_store_id.';
