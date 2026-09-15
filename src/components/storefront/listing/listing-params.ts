import type { ProductSort } from "@/lib/catalog/types";

/**
 * The listing's URL contract — the URL is the only state, so a filtered page can be shared,
 * refreshed and walked back through:
 *
 *   ?q=&brand=a,b&min=&max=&stock=1&sale=1&sort=newest|price_asc|price_desc|rating&page=
 *
 * `min`/`max` are MAJOR units (₺100, not 10000 kuruş) so a hand-typed URL reads naturally; the
 * server converts with `toMinor`. Every filter change drops `page` (page 1 of the new result set).
 * Isomorphic: parsed on the server, patched on the client.
 */
export const SORTS: readonly ProductSort[] = ["newest", "price_asc", "price_desc", "rating"];
export const FILTER_KEYS = ["q", "brand", "min", "max", "stock", "sale"] as const;
export const LISTING_KEYS = [...FILTER_KEYS, "sort", "page"] as const;

export interface ListingState {
  q?: string;
  /** sorted, de-duplicated */
  brandSlugs: string[];
  /** major units */
  min?: number;
  max?: number;
  stock: boolean;
  sale: boolean;
  sort: ProductSort;
  page: number;
}

type SearchParams = Record<string, string | string[] | undefined>;

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

function money(v: string | undefined): number | undefined {
  if (!v) return undefined;
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : undefined;
}

export function parseBrands(v: string | undefined | null): string[] {
  if (!v) return [];
  return [...new Set(v.split(",").map((s) => s.trim().slice(0, 80)).filter((s) => /^[\w-]+$/.test(s)))].sort();
}

export function parseListingParams(sp: SearchParams): ListingState {
  const rawPage = Number(first(sp.page) ?? "1");
  const rawSort = first(sp.sort);
  let min = money(first(sp.min));
  let max = money(first(sp.max));
  if (min != null && max != null && min > max) [min, max] = [max, min];
  return {
    q: first(sp.q)?.trim().slice(0, 100) || undefined,
    brandSlugs: parseBrands(first(sp.brand)),
    min,
    max,
    stock: first(sp.stock) === "1",
    sale: first(sp.sale) === "1",
    sort: (SORTS as readonly string[]).includes(rawSort ?? "") ? (rawSort as ProductSort) : "newest",
    page: Number.isFinite(rawPage) && rawPage >= 1 ? Math.trunc(rawPage) : 1,
  };
}

/** Query object (for pagination links) that preserves the current filters; empty values drop out. */
export function toQuery(state: ListingState): Record<string, string | undefined> {
  return {
    q: state.q,
    brand: state.brandSlugs.length ? state.brandSlugs.join(",") : undefined,
    min: state.min != null ? String(state.min) : undefined,
    max: state.max != null ? String(state.max) : undefined,
    stock: state.stock ? "1" : undefined,
    sale: state.sale ? "1" : undefined,
    sort: state.sort !== "newest" ? state.sort : undefined,
  };
}

/** Number of filters the shopper has switched on (the search box is a search, not a filter). */
export function activeFilterCount(state: ListingState): number {
  return state.brandSlugs.length + (state.min != null || state.max != null ? 1 : 0) + (state.stock ? 1 : 0) + (state.sale ? 1 : 0);
}

/** `basePath?k=v…` from a query object, skipping empty values. */
export function listingHref(basePath: string, query: Record<string, string | undefined>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) if (v) q.set(k, v);
  const qs = q.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}
