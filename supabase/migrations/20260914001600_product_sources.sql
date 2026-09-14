-- ============================================================================
-- 0016 PRODUCT SOURCES: where an imported product comes from, for supplier sync
-- ============================================================================
-- The store resells products listed by an upstream supplier (first: zoo.com.tr). The supplier lists
-- every size/colour as its own product; the import folds those into one product with options, so a
-- source row belongs to a VARIANT. Each keeps the last seen upstream price/stock, so the daily sync
-- (scripts/zoo/sync.mjs) can re-price with the markup, mirror stock and retire variants the supplier
-- dropped, without re-creating anything. Written only by the service-role import scripts;
-- managers can read (and fix) rows through RLS like the rest of the catalog.

create table public.product_sources (
  variant_id uuid primary key references public.product_variants(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  supplier text not null,                          -- e.g. 'zoo'
  external_id bigint not null,                     -- supplier's product id
  source_url text not null,
  source_price integer not null check (source_price >= 0),          -- minor units, what the supplier's customers pay
  source_list_price integer check (source_list_price >= 0),         -- supplier's crossed-out price, when any
  source_stock integer not null default 0,
  markup_bp integer not null default 1000 check (markup_bp >= 0),   -- 1000 = +10%
  content_hash text,                               -- hash of the source text; re-translate when it changes
  images_hash text,                                -- hash of the source image URLs; re-upload when it changes
  last_seen_at timestamptz not null default now(),
  last_synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (store_id, supplier, external_id)
);
create index product_sources_store_supplier_idx on public.product_sources(store_id, supplier);
create index product_sources_product_idx on public.product_sources(product_id);

create table public.supplier_sync_runs (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  supplier text not null,
  kind text not null default 'sync',               -- 'import' | 'sync'
  status text not null default 'running' check (status in ('running', 'succeeded', 'failed', 'aborted')),
  stats jsonb not null default '{}',
  error text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);
create index supplier_sync_runs_store_idx on public.supplier_sync_runs(store_id, started_at desc);

alter table public.product_sources    enable row level security;
alter table public.supplier_sync_runs enable row level security;

create policy "product_sources: staff read" on public.product_sources for select
  using (public.has_store_access(store_id, 'staff'));
create policy "product_sources: manager write" on public.product_sources for all
  using (public.has_store_access(store_id, 'manager')) with check (public.has_store_access(store_id, 'manager'));

create policy "supplier_sync_runs: manager read" on public.supplier_sync_runs for select
  using (public.has_store_access(store_id, 'manager'));
