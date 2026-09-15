"use server";

import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { locales, type Locale } from "@/i18n/config";
import { actionError, adminMutation, assertCategoryInStore, assertProductInStore, assertVariantInStore } from "@/lib/admin/guard";
import type { ActionState } from "@/lib/admin/types";
import { boolField, intField, jsonField, multi, optionalIntField, optionalMoneyField, optionalText, parseForm, uuidField, moneyField } from "@/lib/admin/validate";
import { catalogTag } from "@/lib/catalog/queries";
import type { ProductStatus, Translated } from "@/lib/db/types";
import { env } from "@/lib/env";
import { PRODUCT_STATUSES } from "./types";

type Db = Awaited<ReturnType<typeof adminMutation>>["db"];

const localeEnum = z.enum(locales);
const slugField = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "required")
  .max(120)
  .regex(/^[a-z0-9-]+$/, "slugFormat");
const urlField = z.url().max(1000);
const optionalUrlField = z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? null : v), urlField.nullable());
const translatedField = z.partialRecord(localeEnum, z.string().trim().max(200));

async function storeSettings(db: Db, storeId: string) {
  const { data } = await db.from("stores").select("default_locale, enabled_locales, currency").eq("id", storeId).maybeSingle<{ default_locale: Locale; enabled_locales: Locale[]; currency: string }>();
  if (!data) throw new Error("store missing");
  return data;
}

function isUnique(err: unknown) {
  return !!err && typeof err === "object" && "code" in err && (err as { code: string }).code === "23505";
}

function cleanTranslated(value: Record<string, string | undefined>): Translated {
  const out: Translated = {};
  for (const [k, v] of Object.entries(value)) if (v && v.trim()) out[k as Locale] = v.trim();
  return out;
}

// ---------------------------------------------------------------- products

const productTranslationSchema = z.object({
  name: z.string().trim().max(200).default(""),
  short_description: z.string().trim().max(500).default(""),
  description: z.string().trim().max(20_000).default(""),
  seo_title: z.string().trim().max(200).default(""),
  seo_description: z.string().trim().max(500).default(""),
});

const saveProductSchema = z.object({
  storeId: uuidField,
  locale: localeEnum,
  productId: z.preprocess((v) => (v === "" ? undefined : v), uuidField.optional()),
  slug: slugField,
  status: z.enum(PRODUCT_STATUSES as [ProductStatus, ...ProductStatus[]]),
  brand_id: z.preprocess((v) => (v === "" || v == null ? null : v), uuidField.nullable()),
  tags: optionalText(1000),
  is_featured: boolField,
  is_bestseller: boolField,
  categoryIds: multi(uuidField),
  translations: jsonField(z.partialRecord(localeEnum, productTranslationSchema)),
});

/** Create or update the product itself (translations + categories). Variants/images have their own actions. */
export async function saveProductAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(saveProductSchema, formData);
  if (!parsed.data) return { error: "invalid", fieldErrors: parsed.fieldErrors };
  const { storeId, locale, productId, slug, status, brand_id, tags, is_featured, is_bestseller, categoryIds, translations } = parsed.data;
  let createdId: string | null = null;
  try {
    const { db } = await adminMutation(storeId, "products.write");
    const store = await storeSettings(db, storeId);
    if (!translations[store.default_locale]?.name) return { error: "invalid", fieldErrors: { name: "required", translations: store.default_locale } };
    if (brand_id) {
      const { data: brand } = await db.from("brands").select("id").eq("id", brand_id).eq("store_id", storeId).maybeSingle<{ id: string }>();
      if (!brand) return { error: "invalid", fieldErrors: { brand_id: "invalid" } };
    }

    const tagList = [...new Set((tags ?? "").split(",").map((t) => t.trim()).filter(Boolean))].slice(0, 30);
    const patch = { slug, status, brand_id, tags: tagList, is_featured, is_bestseller };
    let id = productId ?? null;
    if (id) {
      await assertProductInStore(db, id, storeId);
      const { error } = await db.from("products").update(patch).eq("id", id).eq("store_id", storeId);
      if (error) throw error;
    } else {
      const { data, error } = await db.from("products").insert({ ...patch, store_id: storeId }).select("id").single<{ id: string }>();
      if (error) throw error;
      id = data.id;
      createdId = id;
    }

    // Translations: upsert the locales that carry a name, drop the rest.
    const rows = Object.entries(translations)
      .filter(([, t]) => t.name)
      .map(([loc, t]) => ({
        product_id: id,
        locale: loc,
        name: t.name,
        short_description: t.short_description || null,
        description: t.description || null,
        seo_title: t.seo_title || null,
        seo_description: t.seo_description || null,
      }));
    const { error: trErr } = await db.from("product_translations").upsert(rows, { onConflict: "product_id,locale" });
    if (trErr) throw trErr;
    const keep = rows.map((r) => r.locale);
    await db.from("product_translations").delete().eq("product_id", id).not("locale", "in", `(${keep.join(",")})`);

    // Categories: replace the set, only with categories of this store.
    const { data: valid } = await db.from("categories").select("id").eq("store_id", storeId).in("id", categoryIds).returns<{ id: string }[]>();
    const validIds = (valid ?? []).map((c) => c.id);
    await db.from("product_categories").delete().eq("product_id", id);
    if (validIds.length) {
      const { error } = await db.from("product_categories").insert(validIds.map((category_id) => ({ product_id: id, category_id })));
      if (error) throw error;
    }

    updateTag(catalogTag(storeId));
    refresh();
  } catch (err) {
    if (isUnique(err)) return { error: "invalid", fieldErrors: { slug: "unique" } };
    return { error: actionError(err) };
  }
  if (createdId) redirect(`/${locale}/admin/products/${createdId}`);
  return { ok: true, id: productId };
}

const productRef = z.object({ storeId: uuidField, productId: uuidField });

export async function setProductStatusAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(productRef.extend({ status: z.enum(PRODUCT_STATUSES as [ProductStatus, ...ProductStatus[]]) }), formData);
  if (!parsed.data) return { error: "invalid", fieldErrors: parsed.fieldErrors };
  const { storeId, productId, status } = parsed.data;
  try {
    const { db } = await adminMutation(storeId, "products.write");
    await assertProductInStore(db, productId, storeId);
    const { error } = await db.from("products").update({ status }).eq("id", productId).eq("store_id", storeId);
    if (error) throw error;
    updateTag(catalogTag(storeId));
    refresh();
    return { ok: true };
  } catch (err) {
    return { error: actionError(err) };
  }
}

export async function toggleFeaturedAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(productRef.extend({ is_featured: boolField }), formData);
  if (!parsed.data) return { error: "invalid", fieldErrors: parsed.fieldErrors };
  const { storeId, productId, is_featured } = parsed.data;
  try {
    const { db } = await adminMutation(storeId, "products.write");
    await assertProductInStore(db, productId, storeId);
    const { error } = await db.from("products").update({ is_featured }).eq("id", productId).eq("store_id", storeId);
    if (error) throw error;
    updateTag(catalogTag(storeId));
    refresh();
    return { ok: true };
  } catch (err) {
    return { error: actionError(err) };
  }
}

/** "Best seller" switch in the products table: the home section shows these until real sales outrank them. */
export async function toggleBestsellerAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(productRef.extend({ is_bestseller: boolField }), formData);
  if (!parsed.data) return { error: "invalid", fieldErrors: parsed.fieldErrors };
  const { storeId, productId, is_bestseller } = parsed.data;
  try {
    const { db } = await adminMutation(storeId, "products.write");
    await assertProductInStore(db, productId, storeId);
    const { error } = await db.from("products").update({ is_bestseller }).eq("id", productId).eq("store_id", storeId);
    if (error) throw error;
    updateTag(catalogTag(storeId));
    refresh();
    return { ok: true };
  } catch (err) {
    return { error: actionError(err) };
  }
}

/** Hard delete, only when no order line references the product; otherwise archive it instead. */
export async function deleteProductAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(productRef.extend({ locale: localeEnum.optional() }), formData);
  if (!parsed.data) return { error: "invalid", fieldErrors: parsed.fieldErrors };
  const { storeId, productId, locale } = parsed.data;
  try {
    const { db } = await adminMutation(storeId, "products.write");
    await assertProductInStore(db, productId, storeId);
    const { count } = await db.from("order_items").select("id", { count: "exact", head: true }).eq("product_id", productId);
    if ((count ?? 0) > 0) return { error: "hasOrders" };
    // Remove uploaded media first (cascade deletes the rows).
    const { data: images } = await db.from("product_images").select("url").eq("product_id", productId).returns<{ url: string }[]>();
    const paths = (images ?? []).map((i) => storagePathFromUrl(i.url, storeId)).filter((p): p is string => !!p);
    if (paths.length) await db.storage.from("store-media").remove(paths);
    const { error } = await db.from("products").delete().eq("id", productId).eq("store_id", storeId);
    if (error) throw error;
    updateTag(catalogTag(storeId));
    refresh();
  } catch (err) {
    return { error: actionError(err) };
  }
  if (locale) redirect(`/${locale}/admin/products`);
  return { ok: true };
}

// ---------------------------------------------------------------- options + variants

const optionsSchema = z
  .array(
    z.object({
      id: uuidField.optional(),
      name: translatedField,
      values: z
        .array(
          z.object({
            id: uuidField.optional(),
            value: translatedField,
            swatch: z.string().trim().max(20).nullable().optional(),
            sort_order: z.number().int().min(0).optional(),
          }),
        )
        .max(50),
    }),
  )
  .max(5);

/** Upsert/delete diff of a product's options and their values. */
export async function saveOptionsAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(productRef.extend({ options: jsonField(optionsSchema) }), formData);
  if (!parsed.data) return { error: "invalid", fieldErrors: parsed.fieldErrors };
  const { storeId, productId, options } = parsed.data;
  try {
    const { db } = await adminMutation(storeId, "products.write");
    await assertProductInStore(db, productId, storeId);
    const store = await storeSettings(db, storeId);
    for (const o of options) {
      if (!cleanTranslated(o.name)[store.default_locale]) return { error: "invalid", fieldErrors: { options: "optionNameRequired" } };
      if (o.values.length === 0) return { error: "invalid", fieldErrors: { options: "optionValuesRequired" } };
      for (const v of o.values) if (!cleanTranslated(v.value)[store.default_locale]) return { error: "invalid", fieldErrors: { options: "optionValueRequired" } };
    }

    const { data: existing } = await db.from("product_options").select("id, product_option_values(id)").eq("product_id", productId).returns<{ id: string; product_option_values: { id: string }[] }[]>();
    const existingOptionIds = new Set((existing ?? []).map((o) => o.id));
    const existingValueIds = new Set((existing ?? []).flatMap((o) => o.product_option_values.map((v) => v.id)));

    const keptOptionIds: string[] = [];
    const keptValueIds: string[] = [];
    for (const [i, o] of options.entries()) {
      let optionId = o.id && existingOptionIds.has(o.id) ? o.id : null;
      const name = cleanTranslated(o.name);
      if (optionId) {
        const { error } = await db.from("product_options").update({ name, sort_order: i }).eq("id", optionId).eq("product_id", productId);
        if (error) throw error;
      } else {
        const { data, error } = await db.from("product_options").insert({ product_id: productId, name, sort_order: i }).select("id").single<{ id: string }>();
        if (error) throw error;
        optionId = data.id;
      }
      keptOptionIds.push(optionId);
      for (const [j, v] of o.values.entries()) {
        const value = cleanTranslated(v.value);
        const swatch = v.swatch?.trim() || null;
        if (v.id && existingValueIds.has(v.id)) {
          const { error } = await db.from("product_option_values").update({ value, swatch, sort_order: j }).eq("id", v.id).eq("option_id", optionId);
          if (error) throw error;
          keptValueIds.push(v.id);
        } else {
          const { data, error } = await db.from("product_option_values").insert({ option_id: optionId, value, swatch, sort_order: j }).select("id").single<{ id: string }>();
          if (error) throw error;
          keptValueIds.push(data.id);
        }
      }
    }
    const dropOptions = [...existingOptionIds].filter((id) => !keptOptionIds.includes(id));
    if (dropOptions.length) await db.from("product_options").delete().in("id", dropOptions).eq("product_id", productId);
    const dropValues = [...existingValueIds].filter((id) => !keptValueIds.includes(id));
    if (dropValues.length) await db.from("product_option_values").delete().in("id", dropValues);

    updateTag(catalogTag(storeId));
    refresh();
    return { ok: true };
  } catch (err) {
    return { error: actionError(err) };
  }
}

function cartesian(lists: string[][]): string[][] {
  return lists.reduce<string[][]>((acc, list) => acc.flatMap((combo) => list.map((v) => [...combo, v])), [[]]);
}

/** Insert the missing variants for every combination of option values (or one default variant when there are no options). */
export async function generateVariantsAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(productRef, formData);
  if (!parsed.data) return { error: "invalid", fieldErrors: parsed.fieldErrors };
  const { storeId, productId } = parsed.data;
  try {
    const { db } = await adminMutation(storeId, "products.write");
    await assertProductInStore(db, productId, storeId);
    const [{ data: options }, { data: variants }] = await Promise.all([
      db.from("product_options").select("id, sort_order, product_option_values(id, sort_order)").eq("product_id", productId).order("sort_order").returns<{ id: string; sort_order: number; product_option_values: { id: string; sort_order: number }[] }[]>(),
      db.from("product_variants").select("id, price, is_default, variant_option_values(option_value_id)").eq("product_id", productId).eq("store_id", storeId).returns<{ id: string; price: number; is_default: boolean; variant_option_values: { option_value_id: string }[] }[]>(),
    ]);
    const lists = (options ?? []).map((o) => [...o.product_option_values].sort((a, b) => a.sort_order - b.sort_order).map((v) => v.id)).filter((l) => l.length > 0);
    const existingKeys = new Set((variants ?? []).map((v) => [...v.variant_option_values.map((x) => x.option_value_id)].sort().join("|")));
    const basePrice = (variants ?? []).find((v) => v.is_default)?.price ?? (variants ?? [])[0]?.price ?? 0;
    const combos = lists.length ? cartesian(lists) : [[]];
    const missing = combos.filter((c) => !existingKeys.has([...c].sort().join("|")));
    if (missing.length === 0) return { ok: true, id: "0" };
    if ((variants?.length ?? 0) + missing.length > 200) return { error: "tooManyVariants" };

    let makeDefault = !(variants ?? []).some((v) => v.is_default);
    for (const combo of missing) {
      const { data, error } = await db
        .from("product_variants")
        .insert({ store_id: storeId, product_id: productId, price: basePrice, is_default: makeDefault })
        .select("id")
        .single<{ id: string }>();
      if (error) throw error;
      makeDefault = false;
      if (combo.length) {
        const { error: vErr } = await db.from("variant_option_values").insert(combo.map((option_value_id) => ({ variant_id: data.id, option_value_id })));
        if (vErr) throw vErr;
      }
    }
    updateTag(catalogTag(storeId));
    refresh();
    return { ok: true, id: String(missing.length) };
  } catch (err) {
    return { error: actionError(err) };
  }
}

export async function saveVariantAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const pre = parseForm(productRef.extend({ variantId: z.preprocess((v) => (v === "" ? undefined : v), uuidField.optional()) }), formData);
  if (!pre.data) return { error: "invalid", fieldErrors: pre.fieldErrors };
  const { storeId, productId, variantId } = pre.data;
  const ref = variantId ?? "new";
  try {
    const { db, user } = await adminMutation(storeId, "products.write");
    await assertProductInStore(db, productId, storeId);
    const store = await storeSettings(db, storeId);
    const parsed = parseForm(
      z.object({
        sku: optionalText(80),
        barcode: optionalText(80),
        price: moneyField(store.currency),
        compare_at_price: optionalMoneyField(store.currency),
        cost_price: optionalMoneyField(store.currency),
        track_inventory: boolField,
        allow_backorder: boolField,
        weight_grams: optionalIntField({ max: 1_000_000 }),
        is_default: boolField,
        is_active: boolField,
        initial_stock: optionalIntField({ max: 1_000_000 }),
      }),
      formData,
    );
    if (!parsed.data) return { error: "invalid", fieldErrors: parsed.fieldErrors, id: ref };
    const { initial_stock, ...fields } = parsed.data;
    const patch = { ...fields, sku: fields.sku ? fields.sku.toUpperCase() : null };

    let id = variantId ?? null;
    if (id) {
      await assertVariantInStore(db, id, storeId);
      const { error } = await db.from("product_variants").update(patch).eq("id", id).eq("store_id", storeId).eq("product_id", productId);
      if (error) throw error;
    } else {
      const { data, error } = await db.from("product_variants").insert({ ...patch, store_id: storeId, product_id: productId }).select("id").single<{ id: string }>();
      if (error) throw error;
      id = data.id;
    }
    // Opening stock: only while the variant has no history yet (new, or generated from options). Later changes go through inventory.
    if (initial_stock && initial_stock > 0) {
      const { count } = await db.from("stock_movements").select("id", { count: "exact", head: true }).eq("variant_id", id);
      if ((count ?? 0) === 0) {
        const { error: mErr } = await db.from("stock_movements").insert({ store_id: storeId, variant_id: id, delta: initial_stock, reason: "initial", actor_id: user.id });
        if (mErr) throw mErr;
      }
    }
    if (patch.is_default) await db.from("product_variants").update({ is_default: false }).eq("product_id", productId).eq("store_id", storeId).neq("id", id);
    updateTag(catalogTag(storeId));
    refresh();
    // `id` doubles as the "which card" marker: "new" cards see the created id and close.
    return { ok: true, id: variantId ? id : `new:${id}` };
  } catch (err) {
    if (isUnique(err)) return { error: "invalid", fieldErrors: { sku: "unique" }, id: ref };
    return { error: actionError(err), id: ref };
  }
}

/** Blocked while an order line or a cart still references the variant. */
export async function deleteVariantAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(z.object({ storeId: uuidField, variantId: uuidField }), formData);
  if (!parsed.data) return { error: "invalid", fieldErrors: parsed.fieldErrors };
  const { storeId, variantId } = parsed.data;
  try {
    const { db } = await adminMutation(storeId, "products.write");
    await assertVariantInStore(db, variantId, storeId);
    const [orders, carts] = await Promise.all([
      db.from("order_items").select("id", { count: "exact", head: true }).eq("variant_id", variantId),
      db.from("cart_items").select("id", { count: "exact", head: true }).eq("variant_id", variantId),
    ]);
    if ((orders.count ?? 0) > 0) return { error: "variantHasOrders" };
    if ((carts.count ?? 0) > 0) return { error: "variantInCarts" };
    const { error } = await db.from("product_variants").delete().eq("id", variantId).eq("store_id", storeId);
    if (error) throw error;
    updateTag(catalogTag(storeId));
    refresh();
    return { ok: true };
  } catch (err) {
    return { error: actionError(err) };
  }
}

// ---------------------------------------------------------------- images

/** `${SUPABASE_URL}/storage/v1/object/public/store-media/<store>/…` → `<store>/…`, only inside this store's prefix. */
function storagePathFromUrl(url: string, storeId: string): string | null {
  const marker = "/storage/v1/object/public/store-media/";
  if (!url.startsWith(env.supabaseUrl())) return null;
  const at = url.indexOf(marker);
  if (at === -1) return null;
  const path = decodeURIComponent(url.slice(at + marker.length).split("?")[0]);
  return path.startsWith(`${storeId}/`) ? path : null;
}

export async function addProductImageAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(
    productRef.extend({
      url: urlField,
      alt: jsonField(translatedField).optional(),
      variantId: z.preprocess((v) => (v === "" ? undefined : v), uuidField.optional()),
    }),
    formData,
  );
  if (!parsed.data) return { error: "invalid", fieldErrors: parsed.fieldErrors };
  const { storeId, productId, url, alt, variantId } = parsed.data;
  try {
    const { db } = await adminMutation(storeId, "products.write");
    await assertProductInStore(db, productId, storeId);
    if (variantId) await assertVariantInStore(db, variantId, storeId);
    const { data: last } = await db.from("product_images").select("sort_order").eq("product_id", productId).order("sort_order", { ascending: false }).limit(1).maybeSingle<{ sort_order: number }>();
    const { data, error } = await db
      .from("product_images")
      .insert({ product_id: productId, variant_id: variantId ?? null, url, alt: cleanTranslated(alt ?? {}), sort_order: (last?.sort_order ?? -1) + 1 })
      .select("id")
      .single<{ id: string }>();
    if (error) throw error;
    updateTag(catalogTag(storeId));
    refresh();
    return { ok: true, id: data.id };
  } catch (err) {
    return { error: actionError(err) };
  }
}

/** Alt text per locale and the optional variant link of one image. */
export async function updateProductImageAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(
    productRef.extend({ imageId: uuidField, alt: jsonField(translatedField), variantId: z.preprocess((v) => (v === "" ? null : v), uuidField.nullable()) }),
    formData,
  );
  if (!parsed.data) return { error: "invalid", fieldErrors: parsed.fieldErrors };
  const { storeId, productId, imageId, alt, variantId } = parsed.data;
  try {
    const { db } = await adminMutation(storeId, "products.write");
    await assertProductInStore(db, productId, storeId);
    if (variantId) await assertVariantInStore(db, variantId, storeId);
    const { error } = await db.from("product_images").update({ alt: cleanTranslated(alt), variant_id: variantId }).eq("id", imageId).eq("product_id", productId);
    if (error) throw error;
    updateTag(catalogTag(storeId));
    refresh();
    return { ok: true };
  } catch (err) {
    return { error: actionError(err) };
  }
}

export async function reorderImagesAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(productRef.extend({ order: jsonField(z.array(uuidField).max(100)) }), formData);
  if (!parsed.data) return { error: "invalid", fieldErrors: parsed.fieldErrors };
  const { storeId, productId, order } = parsed.data;
  try {
    const { db } = await adminMutation(storeId, "products.write");
    await assertProductInStore(db, productId, storeId);
    for (const [i, id] of order.entries()) {
      const { error } = await db.from("product_images").update({ sort_order: i }).eq("id", id).eq("product_id", productId);
      if (error) throw error;
    }
    updateTag(catalogTag(storeId));
    refresh();
    return { ok: true };
  } catch (err) {
    return { error: actionError(err) };
  }
}

export async function deleteProductImageAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(productRef.extend({ imageId: uuidField }), formData);
  if (!parsed.data) return { error: "invalid", fieldErrors: parsed.fieldErrors };
  const { storeId, productId, imageId } = parsed.data;
  try {
    const { db } = await adminMutation(storeId, "products.write");
    await assertProductInStore(db, productId, storeId);
    const { data: image } = await db.from("product_images").select("url").eq("id", imageId).eq("product_id", productId).maybeSingle<{ url: string }>();
    if (!image) return { error: "notFound" };
    const { error } = await db.from("product_images").delete().eq("id", imageId).eq("product_id", productId);
    if (error) throw error;
    const path = storagePathFromUrl(image.url, storeId);
    if (path) await db.storage.from("store-media").remove([path]);
    updateTag(catalogTag(storeId));
    refresh();
    return { ok: true };
  } catch (err) {
    return { error: actionError(err) };
  }
}

// ---------------------------------------------------------------- categories

const categoryTranslationSchema = z.object({ name: z.string().trim().max(200).default(""), description: z.string().trim().max(2000).default("") });

export async function saveCategoryAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(
    z.object({
      storeId: uuidField,
      categoryId: z.preprocess((v) => (v === "" ? undefined : v), uuidField.optional()),
      slug: slugField,
      parent_id: z.preprocess((v) => (v === "" || v == null ? null : v), uuidField.nullable()),
      sort_order: intField({ max: 10_000 }),
      is_active: boolField,
      image_url: optionalUrlField,
      translations: jsonField(z.partialRecord(localeEnum, categoryTranslationSchema)),
    }),
    formData,
  );
  if (!parsed.data) return { error: "invalid", fieldErrors: parsed.fieldErrors };
  const { storeId, categoryId, slug, parent_id, sort_order, is_active, image_url, translations } = parsed.data;
  try {
    const { db } = await adminMutation(storeId, "products.write");
    const store = await storeSettings(db, storeId);
    if (!translations[store.default_locale]?.name) return { error: "invalid", fieldErrors: { name: "required", translations: store.default_locale } };
    if (parent_id) {
      if (parent_id === categoryId) return { error: "invalid", fieldErrors: { parent_id: "invalid" } };
      await assertCategoryInStore(db, parent_id, storeId);
    }
    const patch = { slug, parent_id, sort_order, is_active, image_url };
    let id = categoryId ?? null;
    if (id) {
      await assertCategoryInStore(db, id, storeId);
      const { error } = await db.from("categories").update(patch).eq("id", id).eq("store_id", storeId);
      if (error) throw error;
    } else {
      const { data, error } = await db.from("categories").insert({ ...patch, store_id: storeId }).select("id").single<{ id: string }>();
      if (error) throw error;
      id = data.id;
    }
    const rows = Object.entries(translations)
      .filter(([, t]) => t.name)
      .map(([loc, t]) => ({ category_id: id, locale: loc, name: t.name, description: t.description || null }));
    const { error: trErr } = await db.from("category_translations").upsert(rows, { onConflict: "category_id,locale" });
    if (trErr) throw trErr;
    await db.from("category_translations").delete().eq("category_id", id).not("locale", "in", `(${rows.map((r) => r.locale).join(",")})`);
    updateTag(catalogTag(storeId));
    refresh();
    return { ok: true, id };
  } catch (err) {
    if (isUnique(err)) return { error: "invalid", fieldErrors: { slug: "unique" } };
    return { error: actionError(err) };
  }
}

export async function deleteCategoryAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(z.object({ storeId: uuidField, categoryId: uuidField }), formData);
  if (!parsed.data) return { error: "invalid", fieldErrors: parsed.fieldErrors };
  const { storeId, categoryId } = parsed.data;
  try {
    const { db } = await adminMutation(storeId, "products.write");
    await assertCategoryInStore(db, categoryId, storeId);
    const { error } = await db.from("categories").delete().eq("id", categoryId).eq("store_id", storeId);
    if (error) throw error;
    updateTag(catalogTag(storeId));
    refresh();
    return { ok: true };
  } catch (err) {
    return { error: actionError(err) };
  }
}
