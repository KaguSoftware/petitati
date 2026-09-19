-- ============================================================================
-- 0021 PERF INDEXES: two filters the planner had no index for (perf audit, 2026-09-19)
-- ============================================================================
-- Both are cheap insurance rather than a fix for anything measurably slow today: at ~832 products
-- and a few dozen orders Postgres seq-scans these faster than it would walk an index. They are here
-- because they get more valuable, and no cheaper, as the tables fill — and because Postgres does
-- NOT index a foreign key for you.
--
-- 1. `reviews` carried only (product_id, status). The admin reviews list filters on
--    (store_id, status) and sorts by created_at (src/lib/admin/reviews/queries.ts:22-27), and
--    reviewCounts scans the whole store, so both were a seq scan plus a sort.
-- 2. `order_items.product_id` is a foreign key with no index. `v_product_sales` groups by it and
--    joins products on it (migration 0017) to build the home page's "Best sellers" band.
--
-- `if not exists` so a re-run against a partially-migrated database is safe.

create index if not exists reviews_store_status_idx
  on public.reviews(store_id, status, created_at desc);

create index if not exists order_items_product_idx
  on public.order_items(product_id);
