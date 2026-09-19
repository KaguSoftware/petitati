import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import { env } from "@/lib/env";
import { catalogTag } from "@/lib/catalog/queries";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { tenantHintFromHost } from "@/lib/tenant/resolve";
import { getStoreBySlug, getStoreSlugByHostname, type Store } from "@/lib/tenant/store";

/**
 * robots.txt and sitemap.xml are served per HOST: the proxy skips both paths, so they resolve
 * the tenant themselves, the same way the proxy does (custom domain → subdomain → default).
 */
export async function storeFromHost(host: string | null): Promise<Store | null> {
  const hint = tenantHintFromHost(host, env.rootDomain());
  let slug = env.defaultStoreSlug();
  if (hint.kind === "subdomain") slug = hint.slug;
  else if (hint.kind === "custom-domain") slug = (await getStoreSlugByHostname(hint.hostname)) ?? slug;
  const store = await getStoreBySlug(slug);
  return store?.is_active ? store : null;
}

/** Every active product's slug and last change, for the sitemap. Public catalog data, scoped by store. */
export async function sitemapProducts(storeId: string): Promise<{ slug: string; updatedAt: string }[]> {
  "use cache";
  cacheTag(catalogTag(storeId));
  cacheLife("hours");

  const db = createSupabaseAdminClient();
  const { data, error } = await db
    .from("products")
    .select("slug, updated_at")
    .eq("store_id", storeId)
    .eq("status", "active")
    .order("updated_at", { ascending: false })
    .limit(5000)
    .returns<{ slug: string; updated_at: string }[]>();
  if (error) throw error;
  return data.map((p) => ({ slug: p.slug, updatedAt: p.updated_at }));
}
