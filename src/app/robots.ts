import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { storeFromHost } from "@/lib/seo/host-store";
import { storeOrigin } from "@/lib/seo/urls";

/**
 * Per-host robots.txt: shopper-only pages (cart, checkout, account, orders, the delivery confirm
 * page) and the staff areas stay out of search; the sitemap is the store's own. Those pages also
 * carry `noindex` themselves, so this is belt and braces.
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const store = await storeFromHost((await headers()).get("host"));
  if (!store) return { rules: { userAgent: "*", disallow: "/" } };
  const privatePaths = ["cart", "checkout", "account", "order/", "deliver", "sign-in", "sign-up", "forgot-password", "complete-profile", "admin", "courier", "preview"];
  return {
    rules: { userAgent: "*", allow: "/", disallow: [...privatePaths.map((p) => `/*/${p}`), "/api/", "/auth/"] },
    sitemap: `${storeOrigin(store.slug)}/sitemap.xml`,
  };
}
