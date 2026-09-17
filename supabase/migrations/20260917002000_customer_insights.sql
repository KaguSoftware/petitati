-- ============================================================================
-- 0020 CUSTOMER INSIGHTS: everything the admin customer page shows about one shopper, in one call.
-- Aggregated here so the page never pulls a customer's whole order history. security invoker, so
-- the RLS of orders / order_items applies to a staff caller (the admin reads it with service role).
--
-- Money is minor units. "spent" is money the shop actually has: delivered orders (cash on delivery)
-- plus anything marked paid, net of refunds, never counting cancelled orders.
-- ============================================================================
create or replace function public.customer_insights(p_store_id uuid, p_customer_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
with o as (
  select id, status, total, refunded_total, discount_total, coupon_code, placed_at, paid_at, shipping_address
  from public.orders
  where store_id = p_store_id and customer_id = p_customer_id
),
live as (
  select * from o where status <> 'cancelled'
),
items as (
  select oi.product_id, oi.product_name, oi.quantity, oi.line_total
  from public.order_items oi
  join live on live.id = oi.order_id
),
top_products as (
  select product_id, product_name, sum(quantity)::int as units, sum(line_total)::bigint as revenue
  from items
  group by product_id, product_name
  order by units desc, revenue desc
  limit 5
),
months as (
  select m::date as month
  from generate_series(date_trunc('month', now()) - interval '11 months', date_trunc('month', now()), interval '1 month') m
),
monthly as (
  select months.month, count(live.id)::int as orders, coalesce(sum(live.total - live.refunded_total), 0)::bigint as total
  from months
  left join live on date_trunc('month', live.placed_at)::date = months.month
  group by months.month
),
city as (
  select shipping_address ->> 'city' as city, count(*)::int as orders
  from live
  where coalesce(shipping_address ->> 'city', '') <> ''
  group by 1
  order by 2 desc, 1
  limit 1
)
select jsonb_build_object(
  'orders_total',      (select count(*) from o),
  'by_status',         coalesce((select jsonb_object_agg(status, n) from (select status, count(*)::int as n from o group by status) s), '{}'::jsonb),
  'active',            (select count(*) from o where status in ('pending_payment', 'paid', 'processing', 'shipped')),
  'delivered',         (select count(*) from o where status = 'delivered'),
  'cancelled',         (select count(*) from o where status = 'cancelled'),
  'refunded',          (select count(*) from o where status = 'refunded'),
  'spent',             (select coalesce(sum(total - refunded_total), 0) from live where status = 'delivered' or paid_at is not null),
  'open_value',        (select coalesce(sum(total), 0) from o where status in ('pending_payment', 'paid', 'processing', 'shipped')),
  'refunded_total',    (select coalesce(sum(refunded_total), 0) from o),
  'avg_order',         (select coalesce(round(avg(total)), 0) from live),
  'largest_order',     (select coalesce(max(total), 0) from live),
  'discount_total',    (select coalesce(sum(discount_total), 0) from live),
  'coupons',           coalesce((select jsonb_agg(distinct coupon_code) from live where coupon_code is not null), '[]'::jsonb),
  'units',             (select coalesce(sum(quantity), 0) from items),
  'distinct_products', (select count(distinct coalesce(product_id::text, product_name)) from items),
  'top_products',      coalesce((select jsonb_agg(to_jsonb(t) order by t.units desc, t.revenue desc) from top_products t), '[]'::jsonb),
  'first_order_at',    (select min(placed_at) from live),
  'last_order_at',     (select max(placed_at) from live),
  'avg_days_between',  (select case when count(*) > 1 then round(extract(epoch from max(placed_at) - min(placed_at)) / 86400 / (count(*) - 1), 1) end from live),
  'monthly',           (select jsonb_agg(jsonb_build_object('month', month, 'orders', orders, 'total', total) order by month) from monthly),
  'top_city',          (select to_jsonb(c) from city c)
);
$$;

revoke execute on function public.customer_insights(uuid, uuid) from public, anon;
grant execute on function public.customer_insights(uuid, uuid) to authenticated, service_role;

comment on function public.customer_insights(uuid, uuid) is
  'Admin customer page: order counts by status, spend, AOV, units, top products, 12-month spend, dates. RLS of orders applies.';
