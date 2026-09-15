-- Catalog listing view + facets function (migration 0017), on the seed catalog.
-- Run with: npx supabase test db
begin;
select plan(9);

-- schema
select has_view('public', 'v_catalog_products', 'v_catalog_products exists');
select has_view('public', 'v_product_sales', 'v_product_sales exists');
select has_function('public', 'catalog_facets', 'catalog_facets() exists');
select has_column('public', 'products', 'is_bestseller', 'products.is_bestseller exists');

-- one row per ACTIVE product of the seed store
select is(
  (select count(*) from public.v_catalog_products where store_id = '10000000-0000-0000-0000-000000000001'),
  (select count(*) from public.products where store_id = '10000000-0000-0000-0000-000000000001' and status = 'active'),
  'the view lists exactly the active products'
);

-- a parent category contains its whole subtree: cat-food = dry + wet + treats (+ anything filed directly)
select is(
  (select count(*) from public.v_catalog_products v
    where v.category_ids @> array[(select id from public.categories where slug = 'cat-food' and store_id = '10000000-0000-0000-0000-000000000001')]),
  (select count(distinct pc.product_id) from public.product_categories pc
    join public.categories c on c.id = pc.category_id
    join public.products p on p.id = pc.product_id and p.status = 'active'
    where c.store_id = '10000000-0000-0000-0000-000000000001'
      and (c.slug = 'cat-food' or c.parent_id = (select id from public.categories where slug = 'cat-food' and store_id = '10000000-0000-0000-0000-000000000001'))),
  'a parent category lists every product of its subtree'
);

-- facets: total with no filter equals the row count; brand counts sum to the total of branded products
select is(
  (public.catalog_facets('10000000-0000-0000-0000-000000000001')->>'total')::int,
  (select count(*)::int from public.v_catalog_products where store_id = '10000000-0000-0000-0000-000000000001'),
  'facets total (no filters) = every listed product'
);
select is(
  (select sum((b->>'count')::int)::int from jsonb_array_elements(public.catalog_facets('10000000-0000-0000-0000-000000000001')->'brands') b),
  (select count(*)::int from public.v_catalog_products where store_id = '10000000-0000-0000-0000-000000000001' and brand_id is not null),
  'brand counts sum to the number of branded products'
);

-- the price sort key never disagrees with the card: the view price is the cheapest active variant price of that product
select is(
  (select count(*) from public.v_catalog_products v
    where v.store_id = '10000000-0000-0000-0000-000000000001'
      and v.price <> (select min(price) from public.product_variants pv where pv.product_id = v.id and pv.is_active
                        and (not pv.track_inventory or pv.allow_backorder or pv.stock_qty > 0))
      and exists (select 1 from public.product_variants pv where pv.product_id = v.id and pv.is_active
                        and (not pv.track_inventory or pv.allow_backorder or pv.stock_qty > 0))),
  0::bigint,
  'view price = cheapest buyable variant wherever one exists'
);

select * from finish();
rollback;
