"use server";

import { refresh, updateTag } from "next/cache";
import { z } from "zod";
import { adminMutation, actionError } from "@/lib/admin/guard";
import type { ActionState } from "@/lib/admin/types";
import { moneyField, multi, optionalMoneyField, optionalText, parseForm, uuidField } from "@/lib/admin/validate";
import { catalogTag, salesTag } from "@/lib/catalog/queries";
import type { OrderItemRow, OrderRow, OrderStatus, PaymentRow } from "@/lib/db/types";
import { confirmDeliveryWithCode, markDelivered } from "@/lib/delivery/confirm";
import { getProviderByKey } from "@/lib/payments";
import { notifyCustomer } from "@/lib/orders/notify";
import { markOrderPaid } from "@/lib/orders/pay";
import { markShipped, markShippedBulk } from "@/lib/orders/ship";
import { canTransition, ORDER_STATUSES, REFUNDABLE, RESTOCK_ON_CANCEL } from "./transitions";

/** Most a single bulk call may touch: one page of the list, with room to spare. */
const BULK_LIMIT = 100;

const base = z.object({ storeId: uuidField, orderId: uuidField });

type Db = Awaited<ReturnType<typeof adminMutation>>["db"];

async function loadOrder(db: Db, storeId: string, orderId: string) {
  const { data } = await db.from("orders").select("*").eq("store_id", storeId).eq("id", orderId).maybeSingle<OrderRow>();
  return data ?? null;
}

async function logEvent(db: Db, orderId: string, actorId: string, type: string, data: Record<string, unknown>) {
  await db.from("order_events").insert({ order_id: orderId, actor_id: actorId, type, data });
}

/** Stock released by a cancellation, as one movement per line. */
async function restockCancelled(db: Db, storeId: string, orders: Pick<OrderRow, "id" | "number" | "status">[], actorId: string) {
  const ids = orders.filter((o) => RESTOCK_ON_CANCEL.includes(o.status)).map((o) => o.id);
  if (ids.length === 0) return;
  const numbers = new Map(orders.map((o) => [o.id, o.number]));
  const { data: items } = await db.from("order_items").select("order_id, variant_id, quantity").in("order_id", ids).returns<Pick<OrderItemRow, "order_id" | "variant_id" | "quantity">[]>();
  const movements = (items ?? [])
    .filter((i) => i.variant_id)
    .map((i) => ({ store_id: storeId, variant_id: i.variant_id, delta: i.quantity, reason: "return", order_id: i.order_id, actor_id: actorId, note: `Cancelled ${numbers.get(i.order_id) ?? ""}`.trim() }));
  if (movements.length) await db.from("stock_movements").insert(movements);
  updateTag(catalogTag(storeId));
  updateTag(salesTag(storeId)); // a cancelled order leaves the "Best sellers" ranking
}

/** Manual provider: money arrived offline. Marks payment + order paid. */
export async function markPaidAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(base.extend({ reference: optionalText(120) }), formData);
  if (!parsed.data) return { error: "invalid", fieldErrors: parsed.fieldErrors };
  const { storeId, orderId, reference } = parsed.data;
  try {
    const { db, user } = await adminMutation(storeId, "orders.update");
    const order = await loadOrder(db, storeId, orderId);
    if (!order) return { error: "notFound" };
    if (!canTransition(order.status, "paid")) return { error: "transition" };

    const result = await markOrderPaid(db, order, reference, user.id);
    refresh();
    // "alreadyPaid" is not a failure: the money was already recorded, the button was pressed twice.
    return result === "noPayment" ? { error: "noPayment" } : { ok: true };
  } catch (err) {
    return { error: actionError(err) };
  }
}

/** Generic transitions (processing, delivered, cancelled). Cancelling releases reserved stock. */
export async function updateOrderStatusAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(base.extend({ status: z.enum(ORDER_STATUSES as [OrderStatus, ...OrderStatus[]]) }), formData);
  if (!parsed.data) return { error: "invalid", fieldErrors: parsed.fieldErrors };
  const { storeId, orderId, status } = parsed.data;
  if (status === "paid") return { error: "transition" }; // use markPaidAction
  try {
    const { db, user } = await adminMutation(storeId, "orders.update");
    const order = await loadOrder(db, storeId, orderId);
    if (!order) return { error: "notFound" };
    if (!canTransition(order.status, status)) return { error: "transition" };

    // Delivered goes through the shared helper so a hand-marked order records `delivered_by` and
    // lands in the timeline exactly like a code-confirmed one.
    if (status === "delivered") {
      await markDelivered(db, order, "manual", user.id);
      refresh();
      return { ok: true };
    }

    const patch: Record<string, unknown> = { status };
    if (status === "cancelled") patch.cancelled_at = new Date().toISOString();
    await db.from("orders").update(patch).eq("id", order.id);
    await logEvent(db, order.id, user.id, "status_changed", { from: order.status, to: status });

    if (status === "cancelled") await restockCancelled(db, storeId, [order], user.id);
    if (status === "cancelled") await notifyCustomer(db, order, status);
    refresh();
    return { ok: true };
  } catch (err) {
    return { error: actionError(err) };
  }
}

export async function shipOrderAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(
    base.extend({
      tracking_number: optionalText(80),
      tracking_url: z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? null : v), z.url().max(500).nullable()),
    }),
    formData,
  );
  if (!parsed.data) return { error: "invalid", fieldErrors: parsed.fieldErrors };
  const { storeId, orderId, tracking_number, tracking_url } = parsed.data;
  try {
    const { db, user } = await adminMutation(storeId, "orders.update");
    const order = await loadOrder(db, storeId, orderId);
    if (!order) return { error: "notFound" };
    if (!canTransition(order.status, "shipped")) return { error: "transition" };
    // Courier cost needs the order's currency, so it is parsed after the order is loaded. Empty → keep the checkout value.
    const costParsed = parseForm(z.object({ shipping_cost: optionalMoneyField(order.currency) }), formData);
    if (!costParsed.data) return { error: "invalid", fieldErrors: costParsed.fieldErrors };
    const shipping_cost = costParsed.data.shipping_cost ?? order.shipping_cost ?? 0;
    await markShipped(db, order, user.id, { trackingNumber: tracking_number, trackingUrl: tracking_url, shippingCost: shipping_cost });
    refresh();
    return { ok: true };
  } catch (err) {
    return { error: actionError(err) };
  }
}

/**
 * Records a refund against the latest payment. SCOPE(payments): the manual provider only records
 * the refund; iyzico refunds + automatic restock GROWS LATER.
 */
export async function refundOrderAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const pre = parseForm(base, formData);
  if (!pre.data) return { error: "invalid", fieldErrors: pre.fieldErrors };
  const { storeId, orderId } = pre.data;
  try {
    const { db, user } = await adminMutation(storeId, "orders.refund");
    const order = await loadOrder(db, storeId, orderId);
    if (!order) return { error: "notFound" };
    if (!REFUNDABLE.includes(order.status)) return { error: "transition" };
    const parsed = parseForm(z.object({ amount: moneyField(order.currency, { min: 1 }), reason: optionalText(300) }), formData);
    if (!parsed.data) return { error: "invalid", fieldErrors: parsed.fieldErrors };
    const remaining = order.total - order.refunded_total;
    if (parsed.data.amount > remaining) return { error: "invalid", fieldErrors: { amount: "refundTooLarge" } };

    const { data: payment } = await db.from("payments").select("*").eq("order_id", order.id).eq("store_id", storeId).order("created_at", { ascending: false }).limit(1).maybeSingle<PaymentRow>();
    if (!payment) return { error: "noPayment" };
    const provider = getProviderByKey(payment.provider);
    if (!provider) return { error: "noPayment" };
    const { providerRef } = await provider.refund(payment, parsed.data.amount);

    const refundedTotal = order.refunded_total + parsed.data.amount;
    const full = refundedTotal >= order.total;
    await db.from("refunds").insert({ payment_id: payment.id, order_id: order.id, amount: parsed.data.amount, reason: parsed.data.reason, actor_id: user.id, provider_ref: providerRef });
    await db.from("payments").update({ status: full ? "refunded" : "partially_refunded" }).eq("id", payment.id);
    await db.from("orders").update({ refunded_total: refundedTotal, ...(full ? { status: "refunded" } : {}) }).eq("id", order.id);
    if (full) updateTag(salesTag(storeId));
    await logEvent(db, order.id, user.id, "refund", { amount: parsed.data.amount, reason: parsed.data.reason, full });
    refresh();
    return { ok: true };
  } catch (err) {
    return { error: actionError(err) };
  }
}

export async function saveInternalNoteAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(base.extend({ internal_note: optionalText(2000) }), formData);
  if (!parsed.data) return { error: "invalid", fieldErrors: parsed.fieldErrors };
  const { storeId, orderId, internal_note } = parsed.data;
  try {
    const { db, user } = await adminMutation(storeId, "orders.update");
    const order = await loadOrder(db, storeId, orderId);
    if (!order) return { error: "notFound" };
    await db.from("orders").update({ internal_note }).eq("id", order.id);
    await logEvent(db, order.id, user.id, "note", { internal_note });
    refresh();
    return { ok: true };
  } catch (err) {
    return { error: actionError(err) };
  }
}


/** Staff confirm a handover with the code the customer read out. Same rules as the courier page. */
export async function confirmDeliveryByCodeAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(base.extend({ code: z.string().trim().regex(/^[0-9]{6}$/, "invalid") }), formData);
  if (!parsed.data) return { error: "invalid", fieldErrors: parsed.fieldErrors };
  const { storeId, orderId, code } = parsed.data;
  try {
    const { db, user } = await adminMutation(storeId, "orders.update");
    const order = await loadOrder(db, storeId, orderId);
    if (!order) return { error: "notFound" };
    const result = await confirmDeliveryWithCode(db, order, code, user.id);
    refresh();
    return result === "ok" ? { ok: true } : { error: result };
  } catch (err) {
    return { error: actionError(err) };
  }
}

/** New code + cleared attempt counter: the way out when a customer loses the code or locks it. */
export async function reissueDeliveryCodeAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(base, formData);
  if (!parsed.data) return { error: "invalid", fieldErrors: parsed.fieldErrors };
  const { storeId, orderId } = parsed.data;
  try {
    const { db, user } = await adminMutation(storeId, "orders.update");
    const order = await loadOrder(db, storeId, orderId);
    if (!order) return { error: "notFound" };
    if (order.status === "delivered") return { error: "transition" };
    const { data: code } = await db.rpc("new_delivery_code");
    if (typeof code !== "string") return { error: "failed" };
    await db.from("orders").update({ delivery_code: code, delivery_attempts: 0 }).eq("id", order.id);
    await logEvent(db, order.id, user.id, "delivery_code_reissued", {});
    refresh();
    return { ok: true };
  } catch (err) {
    return { error: actionError(err) };
  }
}

/**
 * Bulk status move from the orders list. The permission is checked once for the store, then every
 * selected order is filtered through the same `canTransition` table as the single-order path —
 * rows that cannot make the move are skipped and counted, never forced.
 *
 * Shipping in bulk deliberately asks for no tracking number: tracking is per parcel and cannot be
 * typed once for thirty orders. Staff who have one still use the per-order Ship dialog.
 */
export async function bulkUpdateOrderStatusAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(
    z.object({
      storeId: uuidField,
      orderIds: multi(uuidField).pipe(z.array(uuidField).min(1).max(BULK_LIMIT)),
      status: z.enum(["shipped", "delivered", "cancelled"]),
    }),
    formData,
  );
  if (!parsed.data) return { error: "invalid", fieldErrors: parsed.fieldErrors };
  const { storeId, orderIds, status } = parsed.data;
  try {
    const { db, user } = await adminMutation(storeId, "orders.update");
    const { data: orders } = await db.from("orders").select("*").eq("store_id", storeId).in("id", orderIds).returns<OrderRow[]>();
    const eligible = (orders ?? []).filter((o) => canTransition(o.status, status));
    const skipped = orderIds.length - eligible.length;
    if (eligible.length === 0) return { ok: true, changed: 0, skipped };

    const ids = eligible.map((o) => o.id);
    const now = new Date().toISOString();
    if (status === "shipped") {
      // Two writes for the whole selection, not two per order.
      await markShippedBulk(db, eligible, user.id, () => ({ bulk: true }));
    } else if (status === "delivered") {
      await db.from("orders").update({ status, delivered_at: now, delivered_by: "manual", delivery_attempts: 0 }).in("id", ids);
      await db.from("order_events").insert(eligible.map((o) => ({ order_id: o.id, actor_id: user.id, type: "status_changed", data: { from: o.status, to: status, method: "manual" } })));
    } else {
      await db.from("orders").update({ status, cancelled_at: now }).in("id", ids);
      await db.from("order_events").insert(eligible.map((o) => ({ order_id: o.id, actor_id: user.id, type: "status_changed", data: { from: o.status, to: status } })));
      await restockCancelled(db, storeId, eligible, user.id);
    }

    // One mail per order, after the data is safe. `sendEmail` swallows its own failures, so a dead
    // mail provider can never undo a status move that already happened. `shipped` already mailed
    // inside markShipped, so it is excluded here.
    if (status !== "shipped") for (const order of eligible) await notifyCustomer(db, order, status);

    refresh();
    return { ok: true, changed: eligible.length, skipped };
  } catch (err) {
    return { error: actionError(err) };
  }
}
