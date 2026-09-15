-- ============================================================================
-- 0017 CATALOG LISTING: the storefront's product listing moves into the database.
-- ============================================================================
-- Before this, /shop, /c/<slug> and /b/<slug> fetched a page of products by created_at and then
-- sorted THAT PAGE by price in JS (so "price: low to high" page 2 could be cheaper than page 1),
-- walked the category tree in JS and pulled every product_categories row of the subtree with no
-- limit (PostgREST caps a response at 1,000 rows, silently), and searched product names across
-- every store. With 832 imported products and a three-level category tree that stopped being a
-- theoretical problem. This migration gives the listing one row per sellable product with the
-- fields it filters and sorts on, plus a facets function for the filter sidebar (brand counts,
-- price bounds).
--
-- Also here: `products.is_bestseller`, the owner's hand-picked "Best sellers" flag (the home
-- section ranks by real sales first and pads with these), exposed by the view so the same listing
-- query serves it, and `v_product_sales`, the sales ranking source.
--
-- Everything is `security_invoker`: through the anon key the base tables' RLS applies (active
-- products of public stores), and the service-role client that the storefront actually uses
-- filters `status = 'active'` here anyway — the same "matches what anon RLS would allow" contract
-- as src/lib/catalog/queries.ts. Views and functions carry no RLS themselves (rls_enabled.test.sql
-- scans tables only).

-- ---------- hand-picked best sellers ----------
alter table public.products add column is_bestseller boolean not null default false;
create index products_bestseller_idx on public.products(store_id) where is_bestseller;

-- ---------- indexes the listing leans on ----------
create index if not exists categories_parent_idx on public.categories(parent_id);
create index if not exists product_variants_product_active_idx on public.product_variants(product_id) where is_active;

-- ---------- the listing row ----------
-- price / in_stock / on_sale replicate toCard() in src/lib/catalog/queries.ts exactly: the price
-- shown is the cheapest variant a shopper can actually buy, else the cheapest active one; in stock
-- = any buyable variant; on sale = that same variant's compare-at price is higher. Keeping the two
-- in step is what stops a "-20%" badge from appearing on a product the "on sale" filter hides.
-- category_ids holds the product's categories AND every ancestor, so a parent page filters with a
-- single array containment instead of a subtree walk.
create or replace view public.v_catalog_products
with (security_invoker = true) as
with recursive
chain as (                                  -- (category, ancestor-or-self) pairs
  select id as category_id, id as ancestor_id, parent_id
  from public.categories
  union all
  select ch.category_id, c.id, c.parent_id
  from chain ch
  join public.categories c on c.id = ch.parent_id
),
cats as (
  select pc.product_id, array_agg(distinct ch.ancestor_id) as category_ids
  from public.product_categories pc
  join chain ch on ch.category_id = pc.category_id
  group by pc.product_id
),
shown as (                                  -- the variant whose price the card shows
  select distinct on (v.product_id)
         v.product_id,
         v.price,
         v.compare_at_price,
         (not v.track_inventory or v.allow_backorder or v.stock_qty > 0) as buyable
  from public.product_variants v
  where v.is_active
  order by v.product_id,
           (not v.track_inventory or v.allow_backorder or v.stock_qty > 0) desc,
           v.price asc,
           v.id
),
names as (
  select t.product_id, string_agg(t.name, ' ') as names
  from public.product_translations t
  group by t.product_id
)
select
  p.id,
  p.store_id,
  p.brand_id,
  p.slug,
  p.created_at,
  p.is_featured,
  p.is_bestseller,
  p.rating_avg,
  p.rating_count,
  coalesce(s.price, 0)                                                 as price,
  s.compare_at_price,
  coalesce(s.buyable, false)                                           as in_stock,
  (s.compare_at_price is not null and s.compare_at_price > s.price)    as on_sale,
  coalesce(c.category_ids, '{}'::uuid[])                               as category_ids,
  lower(coalesce(n.names, '') || ' ' || coalesce(b.name, ''))          as search_text
from public.products p
left join shown s on s.product_id = p.id
left join cats c on c.product_id = p.id
left join names n on n.product_id = p.id
left join public.brands b on b.id = p.brand_id and b.is_active
where p.status = 'active';

comment on view public.v_catalog_products is
  'One storefront listing row per active product: card price/stock/sale flags, category_ids INCLUDING ancestors, lowercased search text. RLS of the base tables applies.';

-- ---------- facets for the filter sidebar ----------
-- Standard "disjunctive" semantics: a brand's count answers "how many results if I also tick this
-- brand" (every other filter applied, the brand filter not); the price bounds answer "what range
-- exists inside my current brand choice" (brand applied, price not); total has everything applied.
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
  'priceMax', (select max(price) from branded)
);
$$;

comment on function public.catalog_facets is
  'Filter facets for one listing scope: brand counts (other filters applied, brand not), price bounds (brand applied, price not), total (all applied). Store-scoped by p_store_id.';

-- ---------- sales ranking for "Best sellers" ----------
-- Every order that was not cancelled or refunded counts: this is a cash-on-delivery shop, so a
-- real sale sits at pending_payment/processing until the courier is at the door, and "paid only"
-- (what v_product_margins uses) would undercount for days. 90-day window so the list moves.
create or replace view public.v_product_sales
with (security_invoker = true) as
select
  o.store_id,
  i.product_id,
  sum(i.quantity)::int as units_sold,
  max(o.created_at)    as last_sold_at
from public.order_items i
join public.orders o on o.id = i.order_id
join public.products p on p.id = i.product_id and p.status = 'active'
where i.product_id is not null
  and o.status not in ('cancelled', 'refunded')
  and o.created_at > now() - interval '90 days'
group by o.store_id, i.product_id;

comment on view public.v_product_sales is
  'Units sold per active product over the last 90 days (orders not cancelled/refunded). Feeds the home "Best sellers" section. RLS of the base tables applies.';
