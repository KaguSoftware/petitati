import type { AbstractIntlMessages } from "use-intl";
import type { Locale } from "./config";

/**
 * Which message namespaces each part of the tree hands to the CLIENT.
 *
 * Before this existed, `[locale]/layout.tsx` passed the whole catalogue as a prop across the
 * `"use client"` boundary, so React serialized all 18 namespaces into the RSC payload of every
 * route. Measured on the live storefront home: ~68 KB of escaped JSON, ~57 KB of it `admin`,
 * `stores` and `courier` — about 13.5 KB brotli, on a document that weighs 47 KB in total, for
 * strings an anonymous shopper can never see.
 *
 * Server components are unaffected: `getTranslations` from next-intl/server reads the full
 * catalogue through `src/i18n/request.ts`. Only `useTranslations` in client components reads these.
 *
 * NOTE: a nested `IntlProvider` REPLACES its parent's messages rather than merging them
 * (use-intl: `messages === undefined ? prevContext?.messages : messages`), so every set below must
 * be complete for its subtree, not a delta.
 */

/** Everything, for surfaces where trimming buys nothing (staff-only, low traffic). */
export const ALL_NAMESPACES = [
  "common", "nav", "home", "product", "cart", "checkout", "account", "auth",
  "orderStatus", "footer", "shop", "brands", "category", "order", "deliver",
  "admin", "stores", "courier",
] as const;

/** The root layout only has to serve the two error boundaries that sit above the route groups. */
export const ROOT_NAMESPACES = ["common", "nav"] as const;

/** The public shop. Deliberately excludes `admin`, `stores` and `courier` — the whole point. */
export const STOREFRONT_NAMESPACES = [
  "common", "nav", "home", "product", "cart", "checkout", "account", "auth",
  "orderStatus", "footer", "shop", "brands", "category", "order", "deliver",
] as const;

/**
 * The staff "Edit product" drawer renders the real admin editors ON a storefront product page
 * (see components/storefront/admin/product-edit-slot.tsx), and those are client components calling
 * `useTranslations("admin")`. They need the storefront set plus `admin` — and only staff pay for it.
 */
export const STOREFRONT_STAFF_NAMESPACES = [...STOREFRONT_NAMESPACES, "admin"] as const;

/** The courier app is its own surface on a shared host; it needs neither shop nor admin strings. */
export const COURIER_NAMESPACES = ["common", "courier"] as const;

export type Namespace = (typeof ALL_NAMESPACES)[number];

/** Reads the locale catalogue on the server. The full object never leaves this process. */
async function loadCatalogue(locale: Locale | string): Promise<Record<string, unknown>> {
  return (await import(`../../messages/${locale}.json`)).default;
}

/** The subset of `locale`'s messages named by `namespaces`, ready to hand to a client provider. */
export async function clientMessages(
  locale: Locale | string,
  namespaces: readonly string[],
): Promise<AbstractIntlMessages> {
  const catalogue = await loadCatalogue(locale);
  const picked: Record<string, unknown> = {};
  for (const key of namespaces) {
    if (key in catalogue) picked[key] = catalogue[key];
  }
  return picked as AbstractIntlMessages;
}
