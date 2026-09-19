import type { Locale } from "@/i18n/config";
import type { ProductDetail } from "@/lib/catalog/types";
import { toMajor } from "@/lib/money";
import { storeOrigin, storeUrl } from "./urls";

interface StoreLike {
  slug: string;
  currency: string;
  default_locale: Locale;
  enabled_locales: Locale[];
}

/**
 * schema.org Product for the product page: what lets Google show price, stock and stars in the
 * results. One Offer per variant (an AggregateOffer would hide which size is sold out), prices in
 * major units as schema.org expects, and a rating only when real reviews exist.
 */
export function productLd(product: ProductDetail, store: StoreLike, locale: Locale): Record<string, unknown> {
  const url = storeUrl(store, locale, `/p/${product.slug}`);
  const abs = (u: string) => new URL(u, storeOrigin(store.slug)).href;
  const images = product.images.length ? product.images.map((i) => abs(i.url)) : product.imageUrl ? [abs(product.imageUrl)] : undefined;
  const inStock = (v: ProductDetail["variants"][number]) => !v.trackInventory || v.allowBackorder || v.stockQty > 0;

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.shortDescription ?? product.description ?? undefined,
    image: images,
    url,
    sku: product.variants.find((v) => v.isDefault)?.sku ?? product.variants[0]?.sku ?? undefined,
    brand: product.brand ? { "@type": "Brand", name: product.brand } : undefined,
    offers: product.variants.map((v) => ({
      "@type": "Offer",
      url,
      sku: v.sku ?? undefined,
      price: toMajor(v.price, store.currency).toFixed(2),
      priceCurrency: store.currency,
      availability: inStock(v) ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
    })),
    aggregateRating:
      product.ratingCount > 0 ? { "@type": "AggregateRating", ratingValue: Number(product.ratingAvg.toFixed(1)), reviewCount: product.ratingCount } : undefined,
  };
}
