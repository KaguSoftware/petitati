import type { BrandData } from "./types";

// Brand order is the admin's: `getBrands` returns active brands by `sort_order, name`, and the
// helpers below keep that order. (Until 2026-09-23 the shop hid brands with fewer than five
// products and sorted by product count; the client wanted every brand listed, in their order.)

/** Brands with at least one product on sale, for the home row and the sitemap (no empty tiles). Pure. */
export function brandsWithProducts(brands: BrandData[]): BrandData[] {
  return brands.filter((b) => b.productCount > 0);
}
