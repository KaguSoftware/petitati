/**
 * Tiny in-memory TTL cache for the two lookups the proxy needs on every request.
 * `"use cache"` is not available inside proxy.ts, so we do it by hand here.
 * Instances are reused across requests on Fluid Compute, so the hit rate is good.
 */
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import { DB_TIMEOUT_MS, withTimeout } from "@/lib/http/timeout-fetch";

const TTL_MS = 60_000;
const cache = new Map<string, { value: string | null; expires: number }>();

function remember(key: string, value: string | null) {
  cache.set(key, { value, expires: Date.now() + TTL_MS });
  return value;
}

function client() {
  return createClient(env.supabaseUrl(), env.supabaseServiceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: withTimeout(DB_TIMEOUT_MS) },
  });
}

export async function lookupSlugByHostname(hostname: string): Promise<string | null> {
  const key = `domain:${hostname}`;
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.value;
  try {
    const { data } = await client()
      .from("store_domains")
      .select("stores!inner(slug)")
      .eq("hostname", hostname)
      .maybeSingle<{ stores: { slug: string } }>();
    return remember(key, data?.stores.slug ?? null);
  } catch {
    return remember(key, null);
  }
}

export async function lookupDefaultLocale(slug: string): Promise<string | null> {
  const key = `locale:${slug}`;
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.value;
  try {
    const { data } = await client()
      .from("stores")
      .select("default_locale")
      .eq("slug", slug)
      .maybeSingle<{ default_locale: string }>();
    return remember(key, data?.default_locale ?? null);
  } catch {
    return remember(key, null);
  }
}
