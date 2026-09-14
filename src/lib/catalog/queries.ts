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

/** Ids of the category with the given slug plus every descendant (categories form a tree via parent_id). */
function categorySubtreeIds(categories: Pick<CategoryData, "id" | "slug" | "parentId">[], slug: string): string[] {
  const root = categories.find((c) => c.slug === slug);
  if (!root) return [];
  const ids = [root.id];
  for (let i = 0; i < ids.length; i++) {
    for (const c of categories) if (c.parentId === ids[i] && !ids.includes(c.id)) ids.push(c.id);
  }
  return ids;
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
  const { data, error } = await db
    .from("brands")
    .select("id, slug, name, logo_url")
    .eq("store_id", storeId)
    .eq("is_active", true)
    .order("sort_order")
    .order("name")
    .returns<Pick<BrandRow, "id" | "slug" | "name" | "logo_url">[]>();
  if (error) throw error;
  return data.map((b) => ({ id: b.id, slug: b.slug, name: b.name, logoUrl: b.logo_url }));
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
  const db = createSupabaseAdminClient();

  let productIds: string[] | null = null;
  if (params.categorySlug) {
    // A parent category lists everything in its subtree (getCategories is cached under the same tag).
    const categoryIds = categorySubtreeIds(await getCategories(storeId, locale, fallback), params.categorySlug);
    if (categoryIds.length === 0) return { items: [], total: 0, page, pageSize };
    const { data: links } = await db
      .from("product_categories")
      .select("product_id")
      .in("category_id", categoryIds)
      .returns<{ product_id: string }[]>();
    productIds = [...new Set((links ?? []).map((l) => l.product_id))];
    if (productIds.length === 0) return { items: [], total: 0, page, pageSize };
  }
  let brandId: string | null = null;
  if (params.brandSlug) {
    const { data: brand } = await db
      .from("brands")
      .select("id")
      .eq("store_id", storeId)
      .eq("slug", params.brandSlug)
      .eq("is_active", true)
      .maybeSingle<{ id: string }>();
    if (!brand) return { items: [], total: 0, page, pageSize };
    brandId = brand.id;
  }
  if (params.search) {
    const { data: hits } = await db
      .from("product_translations")
      .select("product_id")
      .ilike("name", `%${params.search.replace(/[%_]/g, "")}%`)
      .returns<{ product_id: string }[]>();
    const ids = new Set((hits ?? []).map((h) => h.product_id));
    productIds = productIds ? productIds.filter((id) => ids.has(id)) : [...ids];
    if (productIds.length === 0) return { items: [], total: 0, page, pageSize };
  }

  let q = db
    .from("products")
    .select(CARD_SELECT, { count: "exact" })
    .eq("store_id", storeId)
    .eq("status", "active");
  if (productIds) q = q.in("id", productIds);
  if (brandId) q = q.eq("brand_id", brandId);
  if (params.featuredOnly) q = q.eq("is_featured", true);
  switch (params.sort) {
    case "rating":
      q = q.order("rating_avg", { ascending: false });
      break;
    default:
      q = q.order("created_at", { ascending: false });
  }
  const { data, count, error } = await q
    .range((page - 1) * pageSize, page * pageSize - 1)
    .returns<ProductWithRelations[]>();
  if (error) throw error;

  let items = data.map((p) => toCard(p, locale, fallback));
  if (params.sort === "price_asc") items = items.sort((a, b) => a.price - b.price);
  if (params.sort === "price_desc") items = items.sort((a, b) => b.price - a.price);
  return { items, total: count ?? items.length, page, pageSize };
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
