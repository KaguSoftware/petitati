import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { getBrands, getCategories } from "@/lib/catalog/queries";
import { featuredBrands } from "@/lib/catalog/brands";
import { sitemapProducts, storeFromHost } from "@/lib/seo/host-store";
import { storeUrl } from "@/lib/seo/urls";

const CONTENT_PAGES = ["privacy", "terms", "about"];

/**
 * Per-host sitemap: home, shop, brands, every active category, every brand shown to shoppers,
 * every active product and the content pages that have text, in the store's default locale with
 * hreflang alternates for the others (matching each page's canonical + `alternates.languages`).
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const store = await storeFromHost((await headers()).get("host"));
  if (!store) return [];
  const locale = store.default_locale;
  const [categories, brands, products] = await Promise.all([getCategories(store.id, locale, locale), getBrands(store.id), sitemapProducts(store.id)]);
  const pages = (store.settings.pages ?? {}) as Record<string, Record<string, string>>;

  const entry = (path: string, extra: Partial<MetadataRoute.Sitemap[number]> = {}): MetadataRoute.Sitemap[number] => ({
    url: storeUrl(store, locale, path),
    alternates: { languages: Object.fromEntries(store.enabled_locales.map((l) => [l, storeUrl(store, l, path)])) },
    ...extra,
  });

  return [
    entry("/", { changeFrequency: "daily", priority: 1 }),
    entry("/shop", { changeFrequency: "daily", priority: 0.9 }),
    entry("/brands", { changeFrequency: "weekly", priority: 0.5 }),
    ...categories.map((c) => entry(`/c/${c.slug}`, { changeFrequency: "daily", priority: 0.8 })),
    ...featuredBrands(brands).map((b) => entry(`/b/${b.slug}`, { changeFrequency: "weekly", priority: 0.6 })),
    ...products.map((p) => entry(`/p/${p.slug}`, { lastModified: p.updatedAt, changeFrequency: "weekly", priority: 0.7 })),
    ...CONTENT_PAGES.filter((k) => Object.values(pages[k] ?? {}).some((v) => v?.trim())).map((k) => entry(`/${k}`, { changeFrequency: "yearly", priority: 0.2 })),
  ];
}
