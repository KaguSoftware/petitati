import "server-only";

import type { Locale } from "@/i18n/config";
import type { ListParams } from "@/lib/admin/list-params";
import { pickTranslation } from "@/lib/catalog/types";
import type {
  CategoryRow,
  CategoryTranslationRow,
  ProductImageRow,
  ProductOptionRow,
  ProductOptionValueRow,
  ProductRow,
  ProductStatus,
  ProductTranslationRow,
  ProductVariantRow,
} from "@/lib/db/types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { CategoryAdminRow, CategoryOption, ProductEditData, ProductListFilters, ProductListRow, ProductSort } from "./types";

type Db = ReturnType<typeof createSupabaseAdminClient>;

function safeLike(q: string) {
  return q.replace(/[,()%\\_]/g, " ").trim();
}

/** Product ids in `storeId` whose translated name matches `term` (any locale). */
async function productIdsByName(db: Db, storeId: string, term: string): Promise<string[]> {
  const { data, error } = await db
    .from("product_translations")
    .select("product_id, products!inner(store_id)")
    .eq("products.store_id", storeId)
    .ilike("name", `%${term}%`)
    .returns<{ product_id: string }[]>();
  if (error) throw error;
  return [...new Set((data ?? []).map((r) => r.product_id))];
}

type ListRaw = Pick<ProductRow, "id" | "slug" | "status" | "is_featured" | "is_bestseller" | "updated_at"> & {
  product_translations: Pick<ProductTranslationRow, "locale" | "name">[];
  product_images: Pick<ProductImageRow, "url" | "sort_order">[];
  product_variants: Pick<ProductVariantRow, "price" | "stock_qty" | "track_inventory" | "is_active">[];
  product_categories: { categories: { id: string; category_translations: Pick<CategoryTranslationRow, "locale" | "name">[] } | null }[];
  brands: { name: string } | null;
};

const LIST_SELECT =
  "id, slug, status, is_featured, is_bestseller, updated_at, brands(name), product_translations(locale, name), product_images(url, sort_order), product_variants(price, stock_qty, track_inventory, is_active), product_categories(categories(id, category_translations(locale, name)))";

function toListRow(r: ListRaw, locale: Locale, fallback: Locale): ProductListRow {
  const tr = pickTranslation(r.product_translations, locale, fallback);
  const image = [...r.product_images].sort((a, b) => a.sort_order - b.sort_order)[0];
  const active = r.product_variants.filter((v) => v.is_active);
  const prices = active.map((v) => v.price);
  const tracked = active.filter((v) => v.track_inventory);
  return {
    id: r.id,
    slug: r.slug,
    status: r.status,
    is_featured: r.is_featured,
    is_bestseller: r.is_bestseller,
    updated_at: r.updated_at,
    name: tr?.name ?? r.slug,
    thumbnail: image?.url ?? null,
    priceMin: prices.length ? Math.min(...prices) : null,
    priceMax: prices.length ? Math.max(...prices) : null,
    stockTotal: tracked.reduce((a, v) => a + v.stock_qty, 0),
    tracksStock: tracked.length > 0,
    variantCount: active.length,
    brandName: r.brands?.name ?? null,
    categoryNames: r.product_categories
      .map((pc) => pc.categories)
      .filter((c): c is NonNullable<typeof c> => !!c)
      .map((c) => pickTranslation(c.category_translations, locale, fallback)?.name ?? "")
      .filter(Boolean),
  };
}

export async function listProducts(
  storeId: string,
  params: ListParams<ProductSort> & ProductListFilters & { locale: Locale; fallback: Locale },
): Promise<{ rows: ProductListRow[]; total: number }> {
  const db = createSupabaseAdminClient();

  // Narrow by category / search first: both live on child tables, so they become `.in("id", …)`.
  let ids: string[] | null = null;
  if (params.categoryId) {
    const { data, error } = await db.from("product_categories").select("product_id").eq("category_id", params.categoryId).returns<{ product_id: string }[]>();
    if (error) throw error;
    ids = data.map((r) => r.product_id);
  }
  const term = safeLike(params.q);
  if (term) {
    const hits = new Set(await productIdsByName(db, storeId, term));
    ids = ids ? ids.filter((id) => hits.has(id)) : [...hits];
  }
  if (ids && ids.length === 0) return { rows: [], total: 0 };

  const base = () => {
    let q = db.from("products").select(LIST_SELECT, { count: "exact" }).eq("store_id", storeId);
    if (params.status) q = q.eq("status", params.status);
    if (params.brandId) q = q.eq("brand_id", params.brandId);
    if (ids) q = q.in("id", ids);
    return q;
  };

  if (params.sort === "name") {
    // SCOPE(products): PostgREST cannot order a parent by a to-many child column, so name
    // sorting orders ids in memory. Fine for a few thousand products. GROWS LATER → SQL view.
    const { data: all, error } = await base().select("id, product_translations(locale, name)").returns<{ id: string; product_translations: Pick<ProductTranslationRow, "locale" | "name">[] }[]>();
    if (error) throw error;
    const collator = new Intl.Collator(params.locale);
    const named = (all ?? []).map((p) => ({ id: p.id, name: pickTranslation(p.product_translations, params.locale, params.fallback)?.name ?? "" }));
    named.sort((a, b) => collator.compare(a.name, b.name) * (params.dir === "asc" ? 1 : -1));
    const pageIds = named.slice(params.range.from, params.range.to + 1).map((p) => p.id);
    if (pageIds.length === 0) return { rows: [], total: named.length };
    const { data, error: err2 } = await db.from("products").select(LIST_SELECT).eq("store_id", storeId).in("id", pageIds).returns<ListRaw[]>();
    if (err2) throw err2;
    const byId = new Map((data ?? []).map((r) => [r.id, r]));
    const rows = pageIds.map((id) => byId.get(id)).filter((r): r is ListRaw => !!r).map((r) => toListRow(r, params.locale, params.fallback));
    return { rows, total: named.length };
  }

  const { data, count, error } = await base().order("updated_at", { ascending: params.dir === "asc" }).range(params.range.from, params.range.to).returns<ListRaw[]>();
  if (error) throw error;
  return { rows: (data ?? []).map((r) => toListRow(r, params.locale, params.fallback)), total: count ?? 0 };
}

/** Per-status counts for the filter tabs. */
export async function productStatusCounts(storeId: string): Promise<Record<ProductStatus | "all", number>> {
  const db = createSupabaseAdminClient();
  const { data, error } = await db.from("products").select("status").eq("store_id", storeId).returns<{ status: ProductStatus }[]>();
  if (error) throw error;
  const counts: Record<string, number> = { all: 0, draft: 0, active: 0, archived: 0 };
  for (const r of data ?? []) {
    counts[r.status] = (counts[r.status] ?? 0) + 1;
    counts.all += 1;
  }
  return counts as Record<ProductStatus | "all", number>;
}

type EditRaw = ProductRow & {
  product_translations: ProductTranslationRow[];
  product_options: (ProductOptionRow & { product_option_values: ProductOptionValueRow[] })[];
  product_variants: (ProductVariantRow & { variant_option_values: { option_value_id: string }[] })[];
  product_images: ProductImageRow[];
  product_categories: { category_id: string }[];
};

export async function getProductForEdit(storeId: string, id: string): Promise<ProductEditData | null> {
  const db = createSupabaseAdminClient();
  const { data, error } = await db
    .from("products")
    .select(
      "*, product_translations(*), product_options(*, product_option_values(*)), product_variants(*, variant_option_values(option_value_id)), product_images(*), product_categories(category_id)",
    )
    .eq("store_id", storeId)
    .eq("id", id)
    .maybeSingle<EditRaw>();
  if (error) throw error;
  if (!data) return null;
  // Buy links live in product_sources (one per variant). A failed read only hides the links.
  const { data: sources } = await db.from("product_sources").select("variant_id, source_url").eq("product_id", id).eq("store_id", storeId).returns<{ variant_id: string; source_url: string }[]>();
  const sourceOf = new Map((sources ?? []).map((r) => [r.variant_id, r.source_url]));
  const { product_translations, product_options, product_variants, product_images, product_categories, ...product } = data;
  const options = [...product_options]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(({ product_option_values, ...o }) => ({ ...o, values: [...product_option_values].sort((a, b) => a.sort_order - b.sort_order) }));
  // Stable variant order = the option/value order they were generated in (SKU edits must not reshuffle the editor).
  const rank = new Map<string, number>();
  options.forEach((o, oi) => o.values.forEach((v, vi) => rank.set(v.id, oi * 1000 + vi)));
  const key = (ids: string[]) => ids.map((id) => rank.get(id) ?? 999_999).sort((a, b) => a - b);
  const variants = [...product_variants]
    .map(({ variant_option_values, ...v }) => ({ ...v, optionValueIds: variant_option_values.map((x) => x.option_value_id), sourceUrl: sourceOf.get(v.id) ?? null }))
    .sort((a, b) => {
      const ka = key(a.optionValueIds);
      const kb = key(b.optionValueIds);
      for (let i = 0; i < Math.max(ka.length, kb.length); i++) {
        const d = (ka[i] ?? -1) - (kb[i] ?? -1);
        if (d !== 0) return d;
      }
      return a.id.localeCompare(b.id);
    });
  return {
    product,
    translations: product_translations,
    options,
    variants,
    images: [...product_images].sort((a, b) => a.sort_order - b.sort_order),
    categoryIds: product_categories.map((c) => c.category_id),
  };
}

type CategoryRaw = CategoryRow & { category_translations: CategoryTranslationRow[]; product_categories: { count: number }[] };

/** Every category (including inactive) with translations, parent name and product counts. */
export async function listCategoriesAdmin(storeId: string, locale: Locale, fallback: Locale): Promise<CategoryAdminRow[]> {
  const db = createSupabaseAdminClient();
  const { data, error } = await db
    .from("categories")
    .select("*, category_translations(*), product_categories(count)")
    .eq("store_id", storeId)
    .order("sort_order")
    .returns<CategoryRaw[]>();
  if (error) throw error;
  const names = new Map<string, string>();
  for (const c of data ?? []) names.set(c.id, pickTranslation(c.category_translations, locale, fallback)?.name ?? c.slug);
  return (data ?? []).map(({ category_translations, product_categories, ...c }) => ({
    ...c,
    translations: category_translations,
    name: names.get(c.id) ?? c.slug,
    parentName: c.parent_id ? (names.get(c.parent_id) ?? null) : null,
    productCount: product_categories?.[0]?.count ?? 0,
  }));
}

/** Compact category list for filters and the product form. */
export async function listCategoryOptions(storeId: string, locale: Locale, fallback: Locale): Promise<CategoryOption[]> {
  const db = createSupabaseAdminClient();
  const { data, error } = await db
    .from("categories")
    .select("id, slug, parent_id, category_translations(locale, name)")
    .eq("store_id", storeId)
    .order("sort_order")
    .returns<{ id: string; slug: string; parent_id: string | null; category_translations: Pick<CategoryTranslationRow, "locale" | "name">[] }[]>();
  if (error) throw error;
  return (data ?? []).map((c) => ({ id: c.id, name: pickTranslation(c.category_translations, locale, fallback)?.name ?? c.slug, parentId: c.parent_id }));
}
