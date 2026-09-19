import type { Metadata } from "next";
import type { Locale } from "@/i18n/config";
import { env } from "@/lib/env";

/**
 * The public origin a store is served from, built from store data rather than the request, so
 * metadata stays cacheable (reading headers would make every page dynamic).
 *
 * SCOPE(seo): default store → NEXT_PUBLIC_APP_URL, others → https://<slug>.<ROOT_DOMAIN>.
 * GROWS LATER → a verified primary custom domain (`store_domains.is_primary` + `verified_at`,
 * which nothing sets yet) should win once DNS verification exists.
 */
export function storeOrigin(slug: string): string {
  if (slug === env.defaultStoreSlug()) return env.appUrl().replace(/\/$/, "");
  const root = env.rootDomain();
  const proto = /^(localhost|127\.)/.test(root) ? "http" : "https";
  return `${proto}://${slug}.${root}`;
}

interface StoreLike {
  slug: string;
  default_locale: Locale;
  enabled_locales: Locale[];
}

/** Absolute public URL of a storefront path ("/" or "/p/slug") in one locale. */
export function storeUrl(store: StoreLike, locale: Locale, path: string): string {
  return `${storeOrigin(store.slug)}/${locale}${path === "/" ? "" : path}`;
}

/**
 * Canonical + hreflang for a storefront path: one URL per enabled locale, `x-default` on the
 * store's default locale. Callers pass the bare path, so listing filters (?brand=…&page=…) never
 * end up in a canonical.
 */
export function pageAlternates(store: StoreLike, locale: Locale, path: string): NonNullable<Metadata["alternates"]> {
  const languages: Record<string, string> = {};
  for (const l of store.enabled_locales) languages[l] = storeUrl(store, l, path);
  languages["x-default"] = storeUrl(store, store.default_locale, path);
  return { canonical: storeUrl(store, locale, path), languages };
}

/** Pages that exist for one shopper (cart, checkout, account, auth): keep them out of search. */
export const NOINDEX: Metadata["robots"] = { index: false, follow: true };
