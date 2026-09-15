import type { BrandData } from "./types";

/**
 * A brand needs this many active products before the shop shows it off (home brand row, /brands).
 * The zoo.com.tr import created 122 brands, 43 of them with one or two products and none with a
 * logo; a tile wall of those reads like a spreadsheet. Small brands stay reachable through the
 * listing's brand filter, the product page and /b/<slug>. Owner's call, 2026-09-15.
 */
export const MIN_BRAND_PRODUCTS = 5;

/** Brands worth a tile: at least MIN_BRAND_PRODUCTS active products, biggest first. Pure. */
export function featuredBrands(brands: BrandData[]): BrandData[] {
  return brands
    .filter((b) => b.productCount >= MIN_BRAND_PRODUCTS)
    .sort((a, b) => b.productCount - a.productCount || a.name.localeCompare(b.name));
}
