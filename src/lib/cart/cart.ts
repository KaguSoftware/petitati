import "server-only";

import { cookies } from "next/headers";
import { cache } from "react";
import type { Locale } from "@/i18n/config";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  CartItemRow,
  CartRow,
  CouponRow,
  ProductImageRow,
  ProductTranslationRow,
  ProductVariantRow,
} from "@/lib/db/types";
import { pickJson, pickTranslation } from "@/lib/catalog/types";
import { getSessionUser } from "@/lib/auth/session";

export const cartCookieName = (storeSlug: string) => `cart_${storeSlug}`;

export interface CartLine {
  id: string;
  variantId: string;
  productId: string;
  productSlug: string;
  name: string;
  variantLabel: string | null;
  sku: string | null;
  imageUrl: string | null;
  unitPrice: number;
  unitCost: number | null;
  quantity: number;
  lineTotal: number;
  maxQty: number | null; // null = unlimited
}

export interface CartSummary {
  id: string | null;
  token: string | null;
  currency: string;
  lines: CartLine[];
  itemCount: number;
  subtotal: number;
  coupon: CouponRow | null;
}

type ItemWithVariant = CartItemRow & {
  product_variants: ProductVariantRow & {
    products: {
      id: string;
      slug: string;
      product_translations: ProductTranslationRow[];
      product_images: ProductImageRow[];
    };
    variant_option_values: { product_option_values: { value: Record<string, string> } }[];
  };
};

const EMPTY = (currency: string): CartSummary => ({
  id: null,
  token: null,
  currency,
  lines: [],
  itemCount: 0,
  subtotal: 0,
  coupon: null,
});

/** Reads the cart cookie (dynamic!). Call inside Suspense. */
export const getCart = cache(
  async (
    store: { id: string; slug: string; currency: string; default_locale: Locale },
    locale: Locale,
  ): Promise<CartSummary> => {
    const token = (await cookies()).get(cartCookieName(store.slug))?.value;
    if (!token) return EMPTY(store.currency);

    const db = createSupabaseAdminClient();
    const { data: cart } = await db
      .from("carts")
      .select("*, coupons(*)")
      .eq("token", token)
      .eq("store_id", store.id)
      .maybeSingle<CartRow & { coupons: CouponRow | null }>();
    if (!cart) return EMPTY(store.currency);

    const { data: items } = await db
      .from("cart_items")
      .select(
        `*, product_variants!inner(*, products!inner(id, slug, status, product_translations(*), product_images(*)),
         variant_option_values(product_option_values(value)))`,
      )
      .eq("cart_id", cart.id)
      .eq("product_variants.is_active", true)
      .eq("product_variants.products.status", "active")
      .order("created_at")
      .returns<ItemWithVariant[]>();

    const lines: CartLine[] = (items ?? []).map((it) => {
      const v = it.product_variants;
      const tr = pickTranslation(v.products.product_translations, locale, store.default_locale);
      const images = [...v.products.product_images].sort((a, b) => a.sort_order - b.sort_order);
      const img = images.find((i) => i.variant_id === v.id) ?? images.find((i) => !i.variant_id) ?? images[0];
      const label = v.variant_option_values
        .map((x) => pickJson(x.product_option_values.value, locale, store.default_locale))
        .filter(Boolean)
        .join(" / ");
      return {
        id: it.id,
        variantId: v.id,
        productId: v.products.id,
        productSlug: v.products.slug,
        name: tr?.name ?? v.products.slug,
        variantLabel: label || null,
        sku: v.sku,
        imageUrl: img?.url ?? null,
        unitPrice: v.price,
        unitCost: v.cost_price,
        quantity: it.quantity,
        lineTotal: v.price * it.quantity,
        maxQty: v.track_inventory && !v.allow_backorder ? v.stock_qty : null,
      };
    });

    return {
      id: cart.id,
      token: cart.token,
      currency: cart.currency,
      lines,
      itemCount: lines.reduce((n, l) => n + l.quantity, 0),
      subtotal: lines.reduce((n, l) => n + l.lineTotal, 0),
      coupon: cart.coupons,
    };
  },
);

/** Get-or-create the cart row for the current cookie; sets the cookie when creating. */
export async function ensureCart(store: { id: string; slug: string; currency: string }) {
  const cookieStore = await cookies();
  const name = cartCookieName(store.slug);
  const token = cookieStore.get(name)?.value;
  const db = createSupabaseAdminClient();
  const user = await getSessionUser();

  if (token) {
    const { data } = await db
      .from("carts")
      .select("id, token")
      .eq("token", token)
      .eq("store_id", store.id)
      .maybeSingle<{ id: string; token: string }>();
    if (data) {
      if (user) await db.from("carts").update({ user_id: user.id }).eq("id", data.id).is("user_id", null);
      return data;
    }
  }

  const { data, error } = await db
    .from("carts")
    .insert({ store_id: store.id, currency: store.currency, user_id: user?.id ?? null })
    .select("id, token")
    .single<{ id: string; token: string }>();
  if (error) throw error;
  cookieStore.set(name, data.token, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 90,
  });
  return data;
}
