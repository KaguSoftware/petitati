// Service-role Supabase client for the supplier scripts. Bypasses RLS, so every write sets store_id
// itself. Reads SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY.
import { createClient } from "@supabase/supabase-js";

export function db() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Unwrap a Supabase response or throw with context. */
export function must({ data, error }, what) {
  if (error) throw new Error(`${what}: ${error.message}`);
  return data;
}

export async function resolveStore(supabase) {
  const slug = process.env.DEFAULT_STORE_SLUG ?? "default";
  const store = must(await supabase.from("stores").select("id, currency").eq("slug", slug).single(), `store ${slug}`);
  if (store.currency !== "TRY") throw new Error(`store ${slug} sells in ${store.currency}; zoo prices are TRY`);
  return store;
}

export const SUPPLIER = "zoo";

/** Our price for a supplier price: markup in basis points (1000 = +10%), whole kuruş. */
export const markup = (kurus, bp = 1000) => (kurus == null ? null : Math.round((kurus * (10000 + bp)) / 10000));

/** Tell the app to drop its cached catalog. No-op unless APP_URL and CATALOG_REVALIDATE_SECRET are set. */
export async function revalidateCatalog(storeId) {
  const base = process.env.APP_URL;
  const secret = process.env.CATALOG_REVALIDATE_SECRET;
  if (!base || !secret) return console.log("revalidate skipped (APP_URL / CATALOG_REVALIDATE_SECRET unset)");
  const res = await fetch(`${base.replace(/\/$/, "")}/api/internal/revalidate-catalog`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-revalidate-secret": secret },
    body: JSON.stringify({ storeId }),
  });
  console.log(`revalidate: ${res.status}`);
}
