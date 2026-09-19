"use server";

import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import { normalizePhone, phoneFields } from "@/lib/phone/normalize";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/session";
import { getStoreBySlug } from "@/lib/tenant/store";

export interface SimpleState {
  ok?: boolean;
  error?: string;
}

/** Toggle a product in the signed-in user's wishlist for this store. */
export async function toggleWishlistAction(formData: FormData): Promise<SimpleState> {
  const parsed = z
    .object({ storeSlug: z.string(), productId: z.string().uuid() })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "invalid" };
  const user = await getSessionUser();
  if (!user) return { error: "auth" };
  const store = await getStoreBySlug(parsed.data.storeSlug);
  if (!store) return { error: "store" };

  const db = createSupabaseAdminClient();
  const { data: existing } = await db
    .from("wishlist_items")
    .select("product_id")
    .eq("user_id", user.id)
    .eq("product_id", parsed.data.productId)
    .maybeSingle();
  if (existing) {
    await db.from("wishlist_items").delete().eq("user_id", user.id).eq("product_id", parsed.data.productId);
  } else {
    await db
      .from("wishlist_items")
      .insert({ store_id: store.id, user_id: user.id, product_id: parsed.data.productId });
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

const reviewSchema = z.object({
  storeSlug: z.string(),
  productId: z.string().uuid(),
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().trim().max(120).optional().or(z.literal("")),
  body: z.string().trim().min(3).max(2000),
});

/** Customers submit reviews as pending; managers approve in admin. */
export async function submitReviewAction(_prev: SimpleState, formData: FormData): Promise<SimpleState> {
  const parsed = reviewSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "invalid" };
  const user = await getSessionUser();
  if (!user) return { error: "auth" };
  const store = await getStoreBySlug(parsed.data.storeSlug);
  if (!store) return { error: "store" };

  const db = createSupabaseAdminClient();
  const { data: purchased } = await db
    .from("order_items")
    .select("id, orders!inner(user_id, status)")
    .eq("product_id", parsed.data.productId)
    .eq("orders.user_id", user.id)
    .in("orders.status", ["paid", "processing", "shipped", "delivered"])
    .limit(1);

  const { error } = await db.from("reviews").insert({
    store_id: store.id,
    product_id: parsed.data.productId,
    user_id: user.id,
    rating: parsed.data.rating,
    title: parsed.data.title || null,
    body: parsed.data.body,
    status: "pending",
    is_verified_purchase: (purchased?.length ?? 0) > 0,
  });
  if (error) return { error: "failed" };
  updateTag(`reviews:${parsed.data.productId}`);
  return { ok: true };
}

const addressSchema = z.object({
  storeSlug: z.string(),
  id: z.string().uuid().optional().or(z.literal("")),
  label: z.string().trim().max(40).optional().or(z.literal("")),
  full_name: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  line1: z.string().trim().min(3).max(200),
  line2: z.string().trim().max(200).optional().or(z.literal("")),
  city: z.string().trim().min(1).max(100),
  region: z.string().trim().max(100).optional().or(z.literal("")),
  postal_code: z.string().trim().max(20).optional().or(z.literal("")),
  country: z.string().trim().length(2),
  is_default: z.string().optional(),
});

async function customerForUser(storeId: string, userId: string, email: string | null) {
  const db = createSupabaseAdminClient();
  const { data } = await db
    .from("customers")
    .select("id")
    .eq("store_id", storeId)
    .eq("user_id", userId)
    .maybeSingle<{ id: string }>();
  if (data) return data.id;
  if (!email) return null;
  const { data: created } = await db
    .from("customers")
    .upsert({ store_id: storeId, email: email.toLowerCase(), user_id: userId }, { onConflict: "store_id,email" })
    .select("id")
    .single<{ id: string }>();
  return created?.id ?? null;
}

export async function saveAddressAction(_prev: SimpleState, formData: FormData): Promise<SimpleState> {
  const parsed = addressSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "invalid" };
  const user = await getSessionUser();
  if (!user) return { error: "auth" };
  const store = await getStoreBySlug(parsed.data.storeSlug);
  if (!store) return { error: "store" };
  const customerId = await customerForUser(store.id, user.id, user.email);
  if (!customerId) return { error: "failed" };

  const d = parsed.data;
  const row = {
    customer_id: customerId,
    label: d.label || null,
    full_name: d.full_name,
    phone: d.phone || null,
    line1: d.line1,
    line2: d.line2 || null,
    city: d.city,
    region: d.region || null,
    postal_code: d.postal_code || null,
    country: d.country.toUpperCase(),
    is_default: d.is_default === "on",
  };
  const db = createSupabaseAdminClient();
  if (row.is_default) await db.from("addresses").update({ is_default: false }).eq("customer_id", customerId);
  const { error } = d.id
    ? await db.from("addresses").update(row).eq("id", d.id).eq("customer_id", customerId)
    : await db.from("addresses").insert(row);
  if (error) return { error: "failed" };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteAddressAction(formData: FormData) {
  const parsed = z.object({ storeSlug: z.string(), id: z.string().uuid() }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const user = await getSessionUser();
  if (!user) return;
  const store = await getStoreBySlug(parsed.data.storeSlug);
  if (!store) return;
  const customerId = await customerForUser(store.id, user.id, user.email);
  if (!customerId) return;
  await createSupabaseAdminClient().from("addresses").delete().eq("id", parsed.data.id).eq("customer_id", customerId);
  revalidatePath("/", "layout");
}

export async function updatePasswordAction(_prev: SimpleState, formData: FormData): Promise<SimpleState> {
  const parsed = z.object({ password: z.string().min(8).max(200) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "invalid" };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  // Codes the form can translate, never the provider's English message.
  if (error) return { error: error.code === "same_password" ? "samePassword" : error.code === "weak_password" ? "weakPassword" : "failed" };
  return { ok: true };
}

export async function updateProfileAction(_prev: SimpleState, formData: FormData): Promise<SimpleState> {
  const parsed = z.object({ full_name: z.string().trim().min(1).max(120), ...phoneFields }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "invalid" };
  const user = await getSessionUser();
  if (!user) return { error: "auth" };
  const normalized = normalizePhone(parsed.data.phone, parsed.data.phone_country);
  if (!normalized) return { error: "phoneInvalid" };
  const { error } = await createSupabaseAdminClient()
    .from("profiles")
    .update({ full_name: parsed.data.full_name, phone: normalized.e164, phone_country: normalized.country })
    .eq("id", user.id);
  if (error) return { error: error.code === "23505" ? "phoneTaken" : "invalid" };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function subscribeNewsletterAction(_prev: SimpleState, formData: FormData): Promise<SimpleState> {
  const parsed = z.object({ storeSlug: z.string(), email: z.string().trim().email() }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "invalid" };
  const store = await getStoreBySlug(parsed.data.storeSlug);
  if (!store) return { error: "store" };
  await createSupabaseAdminClient()
    .from("customers")
    .upsert(
      { store_id: store.id, email: parsed.data.email.toLowerCase(), accepts_marketing: true },
      { onConflict: "store_id,email" },
    );
  return { ok: true };
}
