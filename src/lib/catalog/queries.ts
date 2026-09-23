import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import type { Locale } from "@/i18n/config";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  BrandRow,
  CategoryRow,
  CategoryTranslationRow,
  ProductImageRow,
  ProductOptionRow,
  ProductOptionValueRow,
  ProductRow,
  ProductTranslationRow,
  ProductVariantRow,
  ReviewRow,
  ShippingRateRow,
} from "@/lib/db/types";
import {
  pickJson,
  pickTranslation,
  type BrandData,
  type CategoryData,
  type ListingFacets,
  type ProductCardData,
  type ProductDetail,
  type ProductListParams,
  type ProductListResult,
  type ReviewData,
} from "./types";

/**
 * Public catalog reads. They use the service-role client because they are cached across users and
 * every query is scoped by store_id AND filtered to active rows, matching what anon RLS would allow.
 * Invalidate with updateTag(catalogTag(storeId)) after admin writes.
 */
export const catalogTag = (storeId: string) => `catalog:${storeId}`;
/** Sales ranking (home "Best sellers"); updated when an order is placed, cancelled or refunded. */
export const salesTag = (storeId: string) => `sales:${storeId}`;

const NEW_DAYS = 30;

type ProductWithRelations = ProductRow & {
  product_translations: ProductTranslationRow[];
  product_images: ProductImageRow[];
  product_variants: ProductVariantRow[];
  brands: Pick<BrandRow, "name" | "slug"> | null;
};

function toCard(p: ProductWithRelations, locale: Locale, fallback: Locale): ProductCardData {
  const tr = pickTranslation(p.product_translations, locale, fallback);
  const variants = p.product_variants.filter((v) => v.is_active);
  const def = variants.find((v) => v.is_default) ?? variants[0];
  const available = (v: ProductVariantRow) => !v.track_inventory || v.allow_backorder || v.stock_qty > 0;
  // Starting price: the cheapest variant a shopper can actually buy, else the cheapest at all.
  const pool = variants.some(available) ? variants.filter(available) : variants;
  const cheapest = pool.reduce<ProductVariantRow | undefined>(
    (acc, v) => (!acc || v.price < acc.price ? v : acc),
    undefined,
  );
  const images = [...p.product_images].sort((a, b) => a.sort_order - b.sort_order);
  // Photo of the variant whose price is shown, so a 1.5 kg price never sits next to a 10 kg bag.
  const shown = cheapest ?? def;
  const img = images.find((i) => shown && i.variant_id === shown.id) ?? images.find((i) => !i.variant_id) ?? images[0];
  const inStock = variants.some(available);
  const ageDays = (Date.now() - new Date(p.created_at).getTime()) / 86_400_000;
  return {
    id: p.id,
    slug: p.slug,
    name: tr?.name ?? p.slug,
    shortDescription: tr?.short_description ?? null,
    price: (cheapest ?? def)?.price ?? 0,
    compareAtPrice: (cheapest ?? def)?.compare_at_price ?? null,
    priceVaries: new Set(variants.map((v) => v.price)).size > 1,
    imageUrl: img?.url ?? null,
    imageAlt: img ? pickJson(img.alt, locale, fallback) || (tr?.name ?? "") : (tr?.name ?? ""),
    ratingAvg: Number(p.rating_avg),
    ratingCount: p.rating_count,
    inStock,
    isNew: p.tags.includes("new") || ageDays < NEW_DAYS,
    isFeatured: p.is_featured,
    brand: p.brands?.name ?? null,
  };
}

const CARD_SELECT =
  "*, product_translations(*), product_images(*), product_variants(*), brands(name, slug)";

/** Full card rows for a set of ids, returned in the order the ids were given. */
async function cardsByIds(storeId: string, ids: string[], locale: Locale, fallback: Locale): Promise<ProductCardData[]> {
  if (ids.length === 0) return [];
  const db = createSupabaseAdminClient();
  const { data, error } = await db
    .from("products")
    .select(CARD_SELECT)
    .eq("store_id", storeId)
    .eq("status", "active")
    .in("id", ids)
    .returns<ProductWithRelations[]>();
  if (error) throw error;
  const byId = new Map(data.map((p) => [p.id, toCard(p, locale, fallback)]));
  return ids.map((id) => byId.get(id)).filter((c): c is ProductCardData => !!c);
}

export async function getCategories(
  storeId: string,
  locale: Locale,
  fallback: Locale,
): Promise<CategoryData[]> {
  "use cache";
  cacheTag(catalogTag(storeId));
  cacheLife("hours");

  const db = createSupabaseAdminClient();
  const { data, error } = await db
    .from("categories")
    .select("*, category_translations(*)")
    .eq("store_id", storeId)
    .eq("is_active", true)
    .order("sort_order")
    .returns<(CategoryRow & { category_translations: CategoryTranslationRow[] })[]>();
  if (error) throw error;
  return data.map((c) => {
    const tr = pickTranslation(c.category_translations, locale, fallback);
    return {
      id: c.id,
      slug: c.slug,
      name: tr?.name ?? c.slug,
      description: tr?.description ?? null,
      imageUrl: c.image_url,
      parentId: c.parent_id,
    };
  });
}

export async function getBrands(storeId: string): Promise<BrandData[]> {
  "use cache";
  cacheTag(catalogTag(storeId));
  cacheLife("hours");

  const db = createSupabaseAdminClient();
  // Every active brand, each with its live count of active products (an embedded aggregate; the
  // `products.status` filter scopes the count, not the brand rows). Order is the admin's; the home row
  // drops empty brands through `brandsWithProducts` in ./brands.ts.
  const { data, error } = await db
    .from("brands")
    .select("id, slug, name, logo_url, products(count)")
    .eq("store_id", storeId)
    .eq("is_active", true)
    .eq("products.status", "active")
    .order("sort_order")
    .order("name")
    .returns<(Pick<BrandRow, "id" | "slug" | "name" | "logo_url"> & { products: { count: number }[] })[]>();
  if (error) throw error;
  return data.map((b) => ({ id: b.id, slug: b.slug, name: b.name, logoUrl: b.logo_url, productCount: b.products?.[0]?.count ?? 0 }));
}

/**
 * Maps the slugs a URL carries onto the ids the listing view filters by. An unknown slug resolves
 * to the sentinel NONE so the caller returns an empty result — never "everything".
 */
const NONE = "none";
async function resolveScope(storeId: string, locale: Locale, fallback: Locale, p: ProductListParams) {
  const [categories, brands] = await Promise.all([getCategories(storeId, locale, fallback), getBrands(storeId)]);
  const categoryId = p.categorySlug ? (categories.find((c) => c.slug === p.categorySlug)?.id ?? NONE) : null;
  const bySlug = new Map(brands.map((b) => [b.slug, b.id]));
  let brandIds: string[] | null = null;
  if (p.brandSlug) brandIds = [bySlug.get(p.brandSlug) ?? NONE];
  else if (p.brandSlugs?.length) {
    const ids = p.brandSlugs.map((s) => bySlug.get(s)).filter((id): id is string => !!id);
    brandIds = ids.length ? ids : [NONE];
  }
  // `%` and `_` are LIKE wildcards; the view's search_text is lowercased, so lowercase the needle too.
  const q = p.search?.replace(/[%_]/g, "").trim().toLowerCase() || null;
  return { categoryId, brandIds, q, empty: categoryId === NONE || brandIds?.includes(NONE) === true };
}

export async function getProducts(
  storeId: string,
  locale: Locale,
  fallback: Locale,
  params: ProductListParams = {},
): Promise<ProductListResult> {
  "use cache";
  cacheTag(catalogTag(storeId));
  cacheLife("hours");

  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(48, params.pageSize ?? 24);
  const empty = { items: [], total: 0, page, pageSize };
  const { categoryId, brandIds, q: needle, empty: unknownScope } = await resolveScope(storeId, locale, fallback, params);
  if (unknownScope) return empty;

  // The listing view (migration 0017) carries every filter and sort key, so the database does the
  // whole page: subtree via `category_ids` (ancestors included), price sort on the card's price,
  // store-scoped search, exact count. Only the ≤ 48 ids of the page are then hydrated into cards.
  const db = createSupabaseAdminClient();
  let q = db.from("v_catalog_products").select("id", { count: "exact" }).eq("store_id", storeId);
  if (categoryId) q = q.contains("category_ids", [categoryId]);
  if (brandIds) q = q.in("brand_id", brandIds);
  if (needle) q = q.like("search_text", `%${needle}%`);
  if (params.priceMin != null) q = q.gte("price", params.priceMin);
  if (params.priceMax != null) q = q.lte("price", params.priceMax);
  if (params.inStock) q = q.eq("in_stock", true);
  if (params.onSale) q = q.eq("on_sale", true);
  if (params.featuredOnly) q = q.eq("is_featured", true);
  if (params.bestsellerOnly) q = q.eq("is_bestseller", true);
  switch (params.sort) {
    case "price_asc":
      q = q.order("price", { ascending: true }).order("id");
      break;
    case "price_desc":
      q = q.order("price", { ascending: false }).order("id");
      break;
    case "rating":
      q = q.order("rating_avg", { ascending: false }).order("rating_count", { ascending: false }).order("id");
      break;
    default:
      q = q.order("created_at", { ascending: false }).order("id");
  }
  const { data, count, error } = await q.range((page - 1) * pageSize, page * pageSize - 1).returns<{ id: string }[]>();
  if (error) {
    // PGRST103 = the page starts past the last row (a stale ?page= after a filter narrowed the
    // set). Not an error for the shopper: an empty page with the true total, so the pagination
    // still shows where the results are.
    if (error.code !== "PGRST103") throw error;
    const { count: total } = await q.range(0, 0);
    return { items: [], total: total ?? 0, page, pageSize };
  }
  const items = await cardsByIds(storeId, data.map((r) => r.id), locale, fallback);
  return { items, total: count ?? items.length, page, pageSize };
}

/**
 * Brand counts and price bounds for the filter sidebar. Pass the SAME params as the listing minus
 * `page`, `pageSize` and `sort` (they do not change the facets, and leaving them out lets every
 * page of a scope share one cache entry).
 */
export async function getListingFacets(
  storeId: string,
  locale: Locale,
  fallback: Locale,
  params: Omit<ProductListParams, "page" | "pageSize" | "sort"> = {},
): Promise<ListingFacets> {
  "use cache";
  cacheTag(catalogTag(storeId));
  cacheLife("hours");

  const none: ListingFacets = { total: 0, brands: [], categories: [], priceMin: null, priceMax: null, quartiles: [] };
  const { categoryId, brandIds, q, empty } = await resolveScope(storeId, locale, fallback, params);
  if (empty) return none;
  const db = createSupabaseAdminClient();
  const { data, error } = await db.rpc("catalog_facets", {
    p_store_id: storeId,
    p_category_id: categoryId,
    p_q: q,
    p_brand_ids: brandIds,
    p_price_min: params.priceMin ?? null,
    p_price_max: params.priceMax ?? null,
    p_in_stock: !!params.inStock,
    p_on_sale: !!params.onSale,
  });
  if (error) throw error;
  const f = (data ?? {}) as {
    total?: number;
    brands?: ListingFacets["brands"];
    categories?: ListingFacets["categories"];
    priceMin?: number | null;
    priceMax?: number | null;
    p25?: number | null;
    p50?: number | null;
    p75?: number | null;
  };
  return {
    total: f.total ?? 0,
    brands: (f.brands ?? []).filter((b) => b.count > 0),
    categories: f.categories ?? [],
    priceMin: f.priceMin ?? null,
    priceMax: f.priceMax ?? null,
    quartiles: [f.p25 ?? null, f.p50 ?? null, f.p75 ?? null],
  };
}

/**
 * Home "Best sellers": products ranked by units actually sold (v_product_sales, last 90 days),
 * padded with the ones the owner flagged as bestsellers in the admin until real sales fill the
 * row. Hidden by the page when both are empty.
 */
export async function getBestSellers(storeId: string, locale: Locale, fallback: Locale, limit = 8): Promise<ProductCardData[]> {
  "use cache";
  cacheTag(catalogTag(storeId), salesTag(storeId));
  cacheLife("hours");

  const db = createSupabaseAdminClient();
  const { data: ranked, error } = await db
    .from("v_product_sales")
    .select("product_id, units_sold")
    .eq("store_id", storeId)
    .order("units_sold", { ascending: false })
    .order("last_sold_at", { ascending: false })
    .limit(limit)
    .returns<{ product_id: string; units_sold: number }[]>();
  if (error) throw error;
  const sold = await cardsByIds(storeId, (ranked ?? []).map((r) => r.product_id), locale, fallback);
  if (sold.length >= limit) return sold.slice(0, limit);
  const picks = await getProducts(storeId, locale, fallback, { bestsellerOnly: true, pageSize: limit });
  const seen = new Set(sold.map((p) => p.id));
  return [...sold, ...picks.items.filter((p) => !seen.has(p.id))].slice(0, limit);
}

export async function getProductBySlug(
  storeId: string,
  slug: string,
  locale: Locale,
  fallback: Locale,
): Promise<ProductDetail | null> {
  "use cache";
  cacheTag(catalogTag(storeId), `product:${storeId}:${slug}`);
  cacheLife("hours");

  const db = createSupabaseAdminClient();
  const { data, error } = await db
    .from("products")
    .select(
      `${CARD_SELECT}, product_options(*, product_option_values(*)),
       product_categories(categories(slug, category_translations(*))),
       variant_option_values:product_variants(id, variant_option_values(option_value_id))`,
    )
    .eq("store_id", storeId)
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle<
      ProductWithRelations & {
        product_options: (ProductOptionRow & { product_option_values: ProductOptionValueRow[] })[];
        product_categories: {
          categories: { slug: string; category_translations: CategoryTranslationRow[] } | null;
        }[];
        variant_option_values: { id: string; variant_option_values: { option_value_id: string }[] }[];
      }
    >();
  if (error) throw error;
  if (!data) return null;

  const card = toCard(data, locale, fallback);
  const tr = pickTranslation(data.product_translations, locale, fallback);
  const valueMap = new Map(
    data.variant_option_values.map((v) => [v.id, v.variant_option_values.map((x) => x.option_value_id)]),
  );

  return {
    ...card,
    description: tr?.description ?? null,
    brandSlug: data.brands?.slug ?? null,
    seoTitle: tr?.seo_title ?? null,
    seoDescription: tr?.seo_description ?? null,
    images: [...data.product_images]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((i) => ({ url: i.url, alt: pickJson(i.alt, locale, fallback) || card.name, variantId: i.variant_id })),
    options: [...data.product_options]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((o) => ({
        id: o.id,
        name: pickJson(o.name, locale, fallback),
        values: [...o.product_option_values]
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((v) => ({ id: v.id, label: pickJson(v.value, locale, fallback), swatch: v.swatch })),
      })),
    variants: data.product_variants
      .filter((v) => v.is_active)
      .map((v) => ({
        id: v.id,
        sku: v.sku,
        price: v.price,
        compareAtPrice: v.compare_at_price,
        stockQty: v.stock_qty,
        trackInventory: v.track_inventory,
        allowBackorder: v.allow_backorder,
        isDefault: v.is_default,
        optionValueIds: valueMap.get(v.id) ?? [],
      })),
    categories: data.product_categories
      .map((pc) => pc.categories)
      .filter((c): c is NonNullable<typeof c> => !!c)
      .map((c) => ({
        slug: c.slug,
        name: pickTranslation(c.category_translations, locale, fallback)?.name ?? c.slug,
      })),
  };
}

export async function getApprovedReviews(productId: string): Promise<ReviewData[]> {
  "use cache";
  cacheTag(`reviews:${productId}`);
  cacheLife("hours");

  const db = createSupabaseAdminClient();
  const { data, error } = await db
    .from("reviews")
    .select("*, profiles(full_name)")
    .eq("product_id", productId)
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(50)
    .returns<(ReviewRow & { profiles: { full_name: string | null } | null })[]>();
  if (error) throw error;
  return data.map((r) => ({
    id: r.id,
    rating: r.rating,
    title: r.title,
    body: r.body,
    authorName: r.profiles?.full_name?.split(" ")[0] ?? null,
    createdAt: r.created_at,
    isVerifiedPurchase: r.is_verified_purchase,
  }));
}

export async function getShippingRates(storeId: string): Promise<ShippingRateRow[]> {
  "use cache";
  cacheTag(catalogTag(storeId), `shipping:${storeId}`);
  cacheLife("hours");

  const db = createSupabaseAdminClient();
  const { data, error } = await db
    .from("shipping_rates")
    .select("*")
    .eq("store_id", storeId)
    .eq("is_active", true)
    .order("sort_order")
    .returns<ShippingRateRow[]>();
  if (error) throw error;
  return data;
}
