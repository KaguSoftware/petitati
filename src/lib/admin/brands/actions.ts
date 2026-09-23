"use server";

import { refresh, updateTag } from "next/cache";
import { z } from "zod";
import { actionError, adminMutation } from "@/lib/admin/guard";
import type { ActionState } from "@/lib/admin/types";
import { boolField, multi, parseForm, uuidField } from "@/lib/admin/validate";
import { catalogTag } from "@/lib/catalog/queries";
import { firstFreeSlug, slugify } from "@/lib/slug";

type Db = Awaited<ReturnType<typeof adminMutation>>["db"];

const slugField = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "required")
  .max(120)
  .regex(/^[a-z0-9-]+$/, "slugFormat");
const optionalSlugField = z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), slugField.optional());
const optionalUrlField = z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? null : v), z.url().max(1000).nullable());

function isUnique(err: unknown) {
  return !!err && typeof err === "object" && "code" in err && (err as { code: string }).code === "23505";
}

async function assertBrandInStore(db: Db, id: string, storeId: string) {
  const { data } = await db.from("brands").select("store_id").eq("id", id).maybeSingle<{ store_id: string }>();
  if (!data || data.store_id !== storeId) return false;
  return true;
}

const brandRef = z.object({ storeId: uuidField, brandId: uuidField });

export async function saveBrandAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(
    z.object({
      storeId: uuidField,
      brandId: z.preprocess((v) => (v === "" ? undefined : v), uuidField.optional()),
      name: z.string().trim().min(1, "required").max(120),
      slug: optionalSlugField,
      logo_url: optionalUrlField,
      is_active: boolField,
    }),
    formData,
  );
  if (!parsed.data) return { error: "invalid", fieldErrors: parsed.fieldErrors };
  const { storeId, brandId, name, logo_url, is_active } = parsed.data;
  try {
    const { db } = await adminMutation(storeId, "products.write");
    // Staff never have to think about the slug: an empty one is made from the name (Farsi is
    // transliterated) and bumped to "-2", "-3"… when another brand already has it.
    let slug = parsed.data.slug;
    if (!slug) {
      const base = slugify(name) || `brand-${crypto.randomUUID().slice(0, 6)}`;
      const { data: taken } = await db.from("brands").select("slug").eq("store_id", storeId).like("slug", `${base}%`).neq("id", brandId ?? "00000000-0000-0000-0000-000000000000").returns<{ slug: string }[]>();
      slug = firstFreeSlug(base, (taken ?? []).map((r) => r.slug));
    }
    const patch = { name, slug, logo_url, is_active };
    let id = brandId ?? null;
    if (id) {
      if (!(await assertBrandInStore(db, id, storeId))) return { error: "notFound" };
      const { error } = await db.from("brands").update(patch).eq("id", id).eq("store_id", storeId);
      if (error) throw error;
    } else {
      // New brands go to the end of the list; staff move them with the arrows.
      const { data: last } = await db.from("brands").select("sort_order").eq("store_id", storeId).order("sort_order", { ascending: false }).limit(1).maybeSingle<{ sort_order: number }>();
      const sort_order = (last?.sort_order ?? 0) + 1;
      const { data, error } = await db.from("brands").insert({ ...patch, sort_order, store_id: storeId }).select("id").single<{ id: string }>();
      if (error) throw error;
      id = data.id;
    }
    updateTag(catalogTag(storeId));
    refresh();
    return { ok: true, id };
  } catch (err) {
    if (isUnique(err)) return { error: "invalid", fieldErrors: { slug: "unique" } };
    return { error: actionError(err) };
  }
}

/** Products keep their rows; the FK sets `products.brand_id` to null. */
export async function deleteBrandAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(brandRef, formData);
  if (!parsed.data) return { error: "invalid", fieldErrors: parsed.fieldErrors };
  const { storeId, brandId } = parsed.data;
  try {
    const { db } = await adminMutation(storeId, "products.write");
    if (!(await assertBrandInStore(db, brandId, storeId))) return { error: "notFound" };
    const { error } = await db.from("brands").delete().eq("id", brandId).eq("store_id", storeId);
    if (error) throw error;
    updateTag(catalogTag(storeId));
    refresh();
    return { ok: true };
  } catch (err) {
    return { error: actionError(err) };
  }
}

export async function toggleBrandActiveAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(brandRef.extend({ is_active: boolField }), formData);
  if (!parsed.data) return { error: "invalid", fieldErrors: parsed.fieldErrors };
  const { storeId, brandId, is_active } = parsed.data;
  try {
    const { db } = await adminMutation(storeId, "products.write");
    if (!(await assertBrandInStore(db, brandId, storeId))) return { error: "notFound" };
    const { error } = await db.from("brands").update({ is_active }).eq("id", brandId).eq("store_id", storeId);
    if (error) throw error;
    updateTag(catalogTag(storeId));
    refresh();
    return { ok: true };
  } catch (err) {
    return { error: actionError(err) };
  }
}

/**
 * Writes the admin's brand order as positions 1..N. Takes the full id list (as shown), so the
 * first move after an import also untangles the old ties (every imported brand was 0). Only rows
 * whose position changed are written.
 */
export async function reorderBrandsAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(z.object({ storeId: uuidField, brandIds: multi(uuidField) }), formData);
  if (!parsed.data) return { error: "invalid", fieldErrors: parsed.fieldErrors };
  const { storeId, brandIds } = parsed.data;
  try {
    const { db } = await adminMutation(storeId, "products.write");
    await writeBrandOrder(db, storeId, brandIds);
    updateTag(catalogTag(storeId));
    return { ok: true };
  } catch (err) {
    return { error: actionError(err) };
  }
}

/** One click "A–Z": renumbers every brand by name. */
export async function sortBrandsByNameAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(z.object({ storeId: uuidField }), formData);
  if (!parsed.data) return { error: "invalid", fieldErrors: parsed.fieldErrors };
  const { storeId } = parsed.data;
  try {
    const { db } = await adminMutation(storeId, "products.write");
    const { data, error } = await db.from("brands").select("id, name").eq("store_id", storeId).returns<{ id: string; name: string }[]>();
    if (error) throw error;
    const ids = (data ?? []).sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" })).map((b) => b.id);
    await writeBrandOrder(db, storeId, ids);
    updateTag(catalogTag(storeId));
    refresh();
    return { ok: true };
  } catch (err) {
    return { error: actionError(err) };
  }
}

async function writeBrandOrder(db: Db, storeId: string, ids: string[]) {
  const { data, error } = await db.from("brands").select("id, sort_order").eq("store_id", storeId).returns<{ id: string; sort_order: number }[]>();
  if (error) throw error;
  const current = new Map((data ?? []).map((b) => [b.id, b.sort_order]));
  // Ids from another store (or deleted meanwhile) are skipped; brands missing from the list keep
  // their place after the listed ones.
  const listed = ids.filter((id) => current.has(id));
  const rest = [...current.keys()].filter((id) => !listed.includes(id)).sort((a, b) => current.get(a)! - current.get(b)!);
  const changed = [...listed, ...rest].map((id, i) => ({ id, sort_order: i + 1 })).filter((r) => current.get(r.id) !== r.sort_order);
  for (let i = 0; i < changed.length; i += 25) {
    const chunk = changed.slice(i, i + 25);
    const results = await Promise.all(chunk.map((r) => db.from("brands").update({ sort_order: r.sort_order }).eq("id", r.id).eq("store_id", storeId)));
    const failed = results.find((r) => r.error);
    if (failed?.error) throw failed.error;
  }
}
