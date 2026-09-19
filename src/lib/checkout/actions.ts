"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { Locale } from "@/i18n/config";
import { isLocale } from "@/i18n/config";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getStoreBySlug } from "@/lib/tenant/store";
import { getSessionUser } from "@/lib/auth/session";
import { cartCookieName, getCart } from "@/lib/cart/cart";
import { getShippingRates, salesTag } from "@/lib/catalog/queries";
import { updateTag } from "next/cache";
import { computeTotals } from "./totals";
import { getPaymentProvider } from "@/lib/payments";
import { queueEmail } from "@/lib/email/send";
import { OrderConfirmationEmail } from "@/emails/order-confirmation";
import type { OrderRow } from "@/lib/db/types";
import { env } from "@/lib/env";

export interface CheckoutState {
  error?: "invalid" | "empty" | "stock" | "shipping" | "failed";
  fieldErrors?: Record<string, string>;
}

const addressSchema = z.object({
  full_name: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  line1: z.string().trim().min(3).max(200),
  line2: z.string().trim().max(200).optional().or(z.literal("")),
  city: z.string().trim().min(1).max(100),
  region: z.string().trim().max(100).optional().or(z.literal("")),
  postal_code: z.string().trim().max(20).optional().or(z.literal("")),
  country: z.string().trim().length(2),
});

const checkoutSchema = z.object({
  storeSlug: z.string().min(1),
  locale: z.string(),
  email: z.string().trim().email(),
  shipping_rate_id: z.string().uuid(),
  customer_note: z.string().trim().max(1000).optional().or(z.literal("")),
  accepts_marketing: z.string().optional(),
  ...addressSchema.shape,
});

export async function placeOrderAction(_prev: CheckoutState, formData: FormData): Promise<CheckoutState> {
  const parsed = checkoutSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { error: "invalid", fieldErrors };
  }
  const input = parsed.data;
  const locale: Locale = isLocale(input.locale) ? input.locale : "en";

  const store = await getStoreBySlug(input.storeSlug);
  if (!store || !store.is_active) return { error: "failed" };

  const cart = await getCart(store, locale);
  if (!cart.id || cart.lines.length === 0) return { error: "empty" };

  const rates = await getShippingRates(store.id);
  const rate = rates.find((r) => r.id === input.shipping_rate_id) ?? null;
  if (!rate) return { error: "shipping" };

  // Stock check against live quantities (cart view may be stale).
  const db = createSupabaseAdminClient();
  const { data: live } = await db
    .from("product_variants")
    .select("id, stock_qty, track_inventory, allow_backorder")
    .in(
      "id",
      cart.lines.map((l) => l.variantId),
    )
    .returns<{ id: string; stock_qty: number; track_inventory: boolean; allow_backorder: boolean }[]>();
  for (const line of cart.lines) {
    const v = live?.find((x) => x.id === line.variantId);
    if (!v) return { error: "stock" };
    if (v.track_inventory && !v.allow_backorder && line.quantity > v.stock_qty) return { error: "stock" };
  }

  const totals = computeTotals(cart, rate, store);
  const user = await getSessionUser();

  // Customer upsert per store by email.
  const { data: customer } = await db
    .from("customers")
    .upsert(
      {
        store_id: store.id,
        email: input.email.toLowerCase(),
        full_name: input.full_name,
        phone: input.phone || null,
        user_id: user?.id ?? null,
        accepts_marketing: input.accepts_marketing === "on",
      },
      { onConflict: "store_id,email" },
    )
    .select("id")
    .single<{ id: string }>();

  const address = {
    full_name: input.full_name,
    phone: input.phone || null,
    line1: input.line1,
    line2: input.line2 || null,
    city: input.city,
    region: input.region || null,
    postal_code: input.postal_code || null,
    country: input.country.toUpperCase(),
  };

  const { data: numberRow } = await db.rpc("next_order_number", { p_store_id: store.id });
  const number = typeof numberRow === "string" ? numberRow : `${Date.now()}`;

  const { data: order, error: orderErr } = await db
    .from("orders")
    .insert({
      store_id: store.id,
      number,
      customer_id: customer?.id ?? null,
      user_id: user?.id ?? null,
      email: input.email.toLowerCase(),
      phone: input.phone || null,
      locale,
      currency: store.currency,
      status: "pending_payment",
      subtotal: totals.subtotal,
      discount_total: totals.discount,
      shipping_total: totals.shipping,
      // What the store pays the courier — charged even when the shopper's shipping is free.
      shipping_cost: rate.cost,
      tax_total: totals.tax,
      total: totals.total,
      coupon_code: totals.discount > 0 || totals.freeShippingApplied ? (cart.coupon?.code ?? null) : null,
      shipping_address: address,
      billing_address: address,
      shipping_method: { name: rate.name, rate: totals.shipping },
      customer_note: input.customer_note || null,
    })
    .select("*")
    .single<OrderRow>();
  if (orderErr || !order) {
    console.error(orderErr);
    return { error: "failed" };
  }

  await db.from("order_items").insert(
    cart.lines.map((l) => ({
      order_id: order.id,
      product_id: l.productId,
      variant_id: l.variantId,
      product_name: l.name,
      variant_name: l.variantLabel,
      sku: l.sku,
      image_url: l.imageUrl,
      unit_price: l.unitPrice,
      unit_cost: l.unitCost,
      quantity: l.quantity,
      line_total: l.lineTotal,
    })),
  );

  // Reserve stock immediately (movement trigger updates the cached quantity).
  await db.from("stock_movements").insert(
    cart.lines.map((l) => ({
      store_id: store.id,
      variant_id: l.variantId,
      delta: -l.quantity,
      reason: "sale",
      order_id: order.id,
      note: `Order ${order.number}`,
    })),
  );

  if (cart.coupon && (totals.discount > 0 || totals.freeShippingApplied)) {
    await db.from("coupon_redemptions").insert({
      coupon_id: cart.coupon.id,
      order_id: order.id,
      customer_id: customer?.id ?? null,
      amount: totals.discount,
    });
    await db
      .from("coupons")
      .update({ uses_count: cart.coupon.uses_count + 1 })
      .eq("id", cart.coupon.id);
  }

  const provider = getPaymentProvider(store);
  await db.from("payments").insert({
    store_id: store.id,
    order_id: order.id,
    provider: provider.key,
    status: "pending",
    amount: totals.total,
    currency: store.currency,
  });
  await db.from("order_events").insert({ order_id: order.id, type: "placed", data: { provider: provider.key } });
  updateTag(salesTag(store.id)); // the home "Best sellers" ranking counts this order

  // Clear cart.
  await db.from("carts").delete().eq("id", cart.id);
  (await cookies()).delete(cartCookieName(store.slug));

  // Queued, not awaited: the confirmation mail used to sit between the cart delete and the
  // payment redirect, so the shopper paid for a Resend round trip before they could check out.
  const orderUrl = `${env.appUrl()}/${locale}/order/${order.id}`;
  queueEmail({
    to: order.email,
    from: store.email_from,
    subject: `${store.name}: ${order.number}`,
    react: OrderConfirmationEmail({
      storeName: store.name,
      orderNumber: order.number,
      orderUrl,
      locale,
      currency: store.currency,
      deliveryCode: order.delivery_code,
      lines: cart.lines.map((l) => ({ name: l.name, variant: l.variantLabel, qty: l.quantity, total: l.lineTotal })),
      totals,
    }),
  });

  const result = await provider.createPayment({ order, returnUrl: orderUrl, locale });
  if (result.kind === "redirect") redirect(result.url);
  redirect(`/${locale}/order/${order.id}?placed=1`);
}
