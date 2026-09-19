"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { actionError, adminMutation } from "@/lib/admin/guard";
import type { ActionState } from "@/lib/admin/types";
import { dateField, moneyField, multi, optionalMoneyField, optionalText, parseForm, uuidField } from "@/lib/admin/validate";
import type { CourierRow, DeliveryRow, DeliveryState, OrderRow } from "@/lib/db/types";
import { markDelivered } from "@/lib/delivery/confirm";
import { markOrderPaid } from "@/lib/orders/pay";
import { markShippedBulk } from "@/lib/orders/ship";
import { lookupDelivery, type LookupMatch } from "./queries";
import { deliveryFromSettings } from "@/lib/delivery/settings";
import { env } from "@/lib/env";
import { COURIER_VEHICLES, DELIVERY_TRANSITIONS, FAILURE_REASONS } from "./types";

/** Most stops one bulk call may touch. */
const BULK_LIMIT = 100;

type Db = Awaited<ReturnType<typeof adminMutation>>["db"];

const base = z.object({ storeId: uuidField });

async function logDelivery(db: Db, storeId: string, deliveryId: string, type: string, actorId: string | null, data: Record<string, unknown> = {}, courierId: string | null = null) {
  await db.from("delivery_events").insert({ store_id: storeId, delivery_id: deliveryId, type, actor_id: actorId, courier_id: courierId, data });
}

async function loadDeliveries(db: Db, storeId: string, ids: string[]): Promise<DeliveryRow[]> {
  const { data } = await db.from("deliveries").select("*").eq("store_id", storeId).in("id", ids).returns<DeliveryRow[]>();
  return data ?? [];
}

/**
 * Assign stops to a courier for a day. Orders that have no delivery row yet get one created here, so
 * the board's queue needs no backfill: every deliverable order is one click from being a stop.
 */
export async function assignDeliveriesAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(
    base.extend({
      courierId: uuidField,
      scheduledFor: dateField,
      slot: optionalText(40).optional(),
      deliveryIds: multi(uuidField),
      orderIds: multi(uuidField),
    }),
    formData,
  );
  if (!parsed.data) return { error: "invalid", fieldErrors: parsed.fieldErrors };
  const { storeId, courierId, scheduledFor, slot, deliveryIds, orderIds } = parsed.data;
  if (deliveryIds.length + orderIds.length === 0) return { error: "invalid" };
  if (deliveryIds.length + orderIds.length > BULK_LIMIT) return { error: "invalid" };

  try {
    const { db, user } = await adminMutation(storeId, "delivery.assign");
    const { data: courier } = await db.from("couriers").select("*").eq("store_id", storeId).eq("id", courierId).maybeSingle<CourierRow>();
    if (!courier) return { error: "notFound" };
    if (!courier.is_active) return { error: "inactiveCourier" };

    const now = new Date().toISOString();
    let changed = 0;
    let skipped = 0;

    // Existing stops: move them to this courier and day.
    if (deliveryIds.length) {
      const rows = await loadDeliveries(db, storeId, deliveryIds);
      const movable = rows.filter((d) => d.state === "pending" || d.state === "assigned");
      skipped += rows.length - movable.length;
      if (movable.length) {
        await db
          .from("deliveries")
          .update({ courier_id: courierId, scheduled_for: scheduledFor, slot, state: "assigned", assigned_at: now })
          .in("id", movable.map((d) => d.id));
        for (const d of movable) await logDelivery(db, storeId, d.id, "assigned", user.id, { courier_id: courierId, scheduled_for: scheduledFor, slot });
        changed += movable.length;
      }
    }

    // Orders straight from the queue: create the stop, snapshotting what is still owed at the door.
    if (orderIds.length) {
      const { data: orders } = await db
        .from("orders")
        .select("id, total, status, payments(status)")
        .eq("store_id", storeId)
        .in("id", orderIds)
        .returns<{ id: string; total: number; status: string; payments: { status: string }[] }[]>();
      for (const order of orders ?? []) {
        const cashExpected = (order.payments ?? []).some((p) => p.status === "paid") ? 0 : order.total;
        const { data: created, error } = await db
          .from("deliveries")
          .insert({ store_id: storeId, order_id: order.id, courier_id: courierId, state: "assigned", scheduled_for: scheduledFor, slot, assigned_at: now, cash_expected: cashExpected })
          .select("id")
          .single<{ id: string }>();
        // 23505 = the partial unique index: something else opened a stop for this order first.
        if (error || !created) {
          skipped++;
          continue;
        }
        await logDelivery(db, storeId, created.id, "created", user.id, { courier_id: courierId, scheduled_for: scheduledFor, slot, cash_expected: cashExpected });
        changed++;
      }
    }

    refresh();
    return { ok: true, changed, skipped };
  } catch (err) {
    return { error: actionError(err) };
  }
}

/** Put stops back in the queue. */
export async function unassignDeliveriesAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(base.extend({ deliveryIds: multi(uuidField) }), formData);
  if (!parsed.data) return { error: "invalid", fieldErrors: parsed.fieldErrors };
  const { storeId, deliveryIds } = parsed.data;
  if (!deliveryIds.length || deliveryIds.length > BULK_LIMIT) return { error: "invalid" };
  try {
    const { db, user } = await adminMutation(storeId, "delivery.assign");
    const rows = await loadDeliveries(db, storeId, deliveryIds);
    const movable = rows.filter((d) => d.state === "assigned" || d.state === "pending");
    if (movable.length) {
      await db
        .from("deliveries")
        .update({ courier_id: null, state: "pending", assigned_at: null })
        .in("id", movable.map((d) => d.id));
      for (const d of movable) await logDelivery(db, storeId, d.id, "unassigned", user.id, {});
    }
    refresh();
    return { ok: true, changed: movable.length, skipped: rows.length - movable.length };
  } catch (err) {
    return { error: actionError(err) };
  }
}

/**
 * Hand a run to the road. Every stop becomes `out_for_delivery`, and its order is marked shipped
 * through the shared helper — so a parcel leaving with a courier looks exactly like one handed to a
 * carrier from the Ship dialog, tracking mail included.
 */
export async function dispatchDeliveriesAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(base.extend({ deliveryIds: multi(uuidField) }), formData);
  if (!parsed.data) return { error: "invalid", fieldErrors: parsed.fieldErrors };
  const { storeId, deliveryIds } = parsed.data;
  if (!deliveryIds.length || deliveryIds.length > BULK_LIMIT) return { error: "invalid" };
  try {
    const { db, user } = await adminMutation(storeId, "delivery.assign");
    const rows = (await loadDeliveries(db, storeId, deliveryIds)).filter((d) => d.state === "assigned");
    if (!rows.length) return { ok: true, changed: 0, skipped: deliveryIds.length };

    const { data: orders } = await db.from("orders").select("*").eq("store_id", storeId).in("id", rows.map((d) => d.order_id)).returns<OrderRow[]>();
    const byId = new Map((orders ?? []).map((o) => [o.id, o]));
    const now = new Date().toISOString();

    // One update, one multi-row event insert, one bulk ship — instead of three writes per stop.
    const stopFor = new Map(rows.filter((d) => byId.has(d.order_id)).map((d) => [d.order_id, d]));
    await Promise.all([
      db.from("deliveries").update({ state: "out_for_delivery", dispatched_at: now }).in("id", rows.map((d) => d.id)),
      db.from("delivery_events").insert(
        rows.map((d) => ({ store_id: storeId, delivery_id: d.id, type: "dispatched", actor_id: user.id, courier_id: null, data: { courier_id: d.courier_id } })),
      ),
    ]);
    await markShippedBulk(db, [...stopFor.keys()].map((id) => byId.get(id)!), user.id, (o) => {
      const d = stopFor.get(o.id)!;
      return { delivery_id: d.id, courier_id: d.courier_id };
    });
    refresh();
    return { ok: true, changed: rows.length, skipped: deliveryIds.length - rows.length };
  } catch (err) {
    return { error: actionError(err) };
  }
}

/** Reorder one courier's stops. The array order IS the new order. */
export async function resequenceStopsAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(base.extend({ deliveryIds: multi(uuidField) }), formData);
  if (!parsed.data) return { error: "invalid", fieldErrors: parsed.fieldErrors };
  const { storeId, deliveryIds } = parsed.data;
  if (!deliveryIds.length || deliveryIds.length > BULK_LIMIT) return { error: "invalid" };
  try {
    const { db } = await adminMutation(storeId, "delivery.assign");
    const rows = await loadDeliveries(db, storeId, deliveryIds);
    const known = new Set(rows.map((d) => d.id));
    let i = 0;
    for (const id of deliveryIds) {
      if (!known.has(id)) continue;
      await db.from("deliveries").update({ sort_order: i++ }).eq("id", id).eq("store_id", storeId);
    }
    refresh();
    return { ok: true, changed: i };
  } catch (err) {
    return { error: actionError(err) };
  }
}

/**
 * Staff closing a stop from the admin. `delivered` runs through the shared confirm helpers so the
 * order, its timeline and the customer mail are identical to a courier-side close.
 */
export async function setDeliveryStateAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(
    base.extend({
      deliveryId: uuidField,
      state: z.enum(["out_for_delivery", "delivered", "failed", "returned", "cancelled", "pending"]),
      failureReason: z.enum(FAILURE_REASONS as [string, ...string[]]).optional(),
      recipientName: optionalText(120).optional(),
      note: optionalText(300).optional(),
    }),
    formData,
  );
  if (!parsed.data) return { error: "invalid", fieldErrors: parsed.fieldErrors };
  const { storeId, deliveryId, state, failureReason, recipientName, note } = parsed.data;
  try {
    const { db, user } = await adminMutation(storeId, "delivery.assign");
    const [delivery] = await loadDeliveries(db, storeId, [deliveryId]);
    if (!delivery) return { error: "notFound" };
    if (!DELIVERY_TRANSITIONS[delivery.state].includes(state as DeliveryState)) return { error: "transition" };
    if (state === "failed" && !failureReason) return { error: "invalid", fieldErrors: { failureReason: "required" } };

    const now = new Date().toISOString();
    const patch: Record<string, unknown> = { state, note: note ?? delivery.note };
    if (state === "out_for_delivery") patch.dispatched_at = now;
    if (state === "delivered" || state === "failed" || state === "returned") patch.completed_at = now;
    if (state === "failed") patch.failure_reason = failureReason;
    if (state === "delivered") {
      patch.recipient_name = recipientName;
      // Closed by staff, not by the customer's code: it stays flagged as unverified.
      patch.verified = false;
      // Cash typed by staff, when the stop expected some; a blank means "took the full amount".
      if (delivery.cash_expected > 0) {
        const { data: orderRow } = await db.from("orders").select("currency").eq("id", delivery.order_id).maybeSingle<{ currency: string }>();
        const cash = parseForm(z.object({ cashCollected: optionalMoneyField(orderRow?.currency ?? "TRY") }), formData);
        patch.cash_collected = cash.data?.cashCollected ?? delivery.cash_expected;
      }
    }

    if (state === "delivered") {
      const { data: order } = await db.from("orders").select("*").eq("id", delivery.order_id).maybeSingle<OrderRow>();
      if (!order) return { error: "notFound" };
      // The stop is written below with the staff's facts, so the helper must not close it too.
      if (order.status !== "delivered") await markDelivered(db, order, "manual", user.id, { closeStop: false });
    }
    await db.from("deliveries").update(patch).eq("id", delivery.id).eq("store_id", storeId);
    await logDelivery(db, storeId, delivery.id, state, user.id, { failure_reason: failureReason ?? null, recipient_name: recipientName ?? null, cash_collected: patch.cash_collected ?? null, note: note ?? null });
    refresh();
    return { ok: true };
  } catch (err) {
    return { error: actionError(err) };
  }
}

/**
 * Staff have looked at a stop that was closed without the customer's code (called the customer,
 * checked the photo) and are satisfied. Flips `verified` so the amber flag goes away, and says so in
 * the log — the flag is only useful if there is a way to clear it.
 */
export async function verifyDeliveryAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(base.extend({ deliveryId: uuidField, note: optionalText(300).optional() }), formData);
  if (!parsed.data) return { error: "invalid", fieldErrors: parsed.fieldErrors };
  const { storeId, deliveryId, note } = parsed.data;
  try {
    const { db, user } = await adminMutation(storeId, "delivery.assign");
    const [delivery] = await loadDeliveries(db, storeId, [deliveryId]);
    if (!delivery) return { error: "notFound" };
    if (delivery.state !== "delivered" || delivery.verified) return { error: "transition" };
    await db.from("deliveries").update({ verified: true }).eq("id", delivery.id).eq("store_id", storeId);
    await logDelivery(db, storeId, delivery.id, "note", user.id, { checked: true, note: note ?? null });
    refresh();
    return { ok: true };
  } catch (err) {
    return { error: actionError(err) };
  }
}

/** A fresh attempt for an order whose last try failed. */
export async function redeliverAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(base.extend({ deliveryId: uuidField }), formData);
  if (!parsed.data) return { error: "invalid", fieldErrors: parsed.fieldErrors };
  const { storeId, deliveryId } = parsed.data;
  try {
    const { db, user } = await adminMutation(storeId, "delivery.assign");
    const [previous] = await loadDeliveries(db, storeId, [deliveryId]);
    if (!previous) return { error: "notFound" };
    if (previous.state !== "failed" && previous.state !== "returned") return { error: "transition" };
    const { data: created, error } = await db
      .from("deliveries")
      .insert({
        store_id: storeId,
        order_id: previous.order_id,
        courier_id: previous.courier_id,
        state: "pending",
        attempt_no: previous.attempt_no + 1,
        cash_expected: previous.cash_expected,
      })
      .select("id")
      .single<{ id: string }>();
    if (error || !created) return { error: "openDelivery" };
    await logDelivery(db, storeId, created.id, "created", user.id, { attempt_no: previous.attempt_no + 1, from: previous.id });
    refresh();
    return { ok: true, id: created.id };
  } catch (err) {
    return { error: actionError(err) };
  }
}

// ---------- couriers ----------

const courierSchema = base.extend({
  courierId: uuidField.optional(),
  name: z.string().trim().min(1).max(120),
  phone: optionalText(32).optional(),
  vehicle: z.enum(COURIER_VEHICLES).optional(),
  note: optionalText(300).optional(),
  isActive: z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean()),
});

export async function saveCourierAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(courierSchema, formData);
  if (!parsed.data) return { error: "invalid", fieldErrors: parsed.fieldErrors };
  const { storeId, courierId, name, phone, vehicle, note, isActive } = parsed.data;
  try {
    const { db } = await adminMutation(storeId, "delivery.manage");
    const values = { name, phone, vehicle: vehicle ?? null, note, is_active: isActive };
    if (courierId) {
      await db.from("couriers").update(values).eq("id", courierId).eq("store_id", storeId);
      return refreshOk(courierId);
    }
    const { data, error } = await db.from("couriers").insert({ store_id: storeId, ...values }).select("id").single<{ id: string }>();
    if (error || !data) return { error: "failed" };
    return refreshOk(data.id);
  } catch (err) {
    return { error: actionError(err) };
  }
}

function refreshOk(id: string): ActionState {
  refresh();
  return { ok: true, id };
}

/** Mint a new private link. Every copy of the old one stops working the moment this returns. */
export async function rotateCourierTokenAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(base.extend({ courierId: uuidField }), formData);
  if (!parsed.data) return { error: "invalid", fieldErrors: parsed.fieldErrors };
  const { storeId, courierId } = parsed.data;
  try {
    const { db } = await adminMutation(storeId, "delivery.manage");
    const token = crypto.randomUUID();
    await db.from("couriers").update({ token, token_issued_at: new Date().toISOString() }).eq("id", courierId).eq("store_id", storeId);
    refresh();
    return { ok: true };
  } catch (err) {
    return { error: actionError(err) };
  }
}

export async function deleteCourierAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(base.extend({ courierId: uuidField }), formData);
  if (!parsed.data) return { error: "invalid", fieldErrors: parsed.fieldErrors };
  const { storeId, courierId } = parsed.data;
  try {
    const { db } = await adminMutation(storeId, "delivery.manage");
    const { count } = await db.from("deliveries").select("id", { count: "exact", head: true }).eq("store_id", storeId).eq("courier_id", courierId);
    // History is worth more than a tidy list: a courier who ever carried a parcel is deactivated.
    if ((count ?? 0) > 0) return { error: "hasDeliveries" };
    await db.from("couriers").delete().eq("id", courierId).eq("store_id", storeId);
    refresh();
    return { ok: true };
  } catch (err) {
    return { error: actionError(err) };
  }
}

// ---------- cash ----------

/**
 * The courier hands over what they collected. Each stop's money is recorded against its order
 * through the manual payment provider — never by writing `orders.status` — and the settlement row is
 * stamped onto the stops LAST, so a crash mid-way leaves them unsettled and safe to retry.
 */
export async function settleCashAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const pre = parseForm(base.extend({ courierId: uuidField, deliveryIds: multi(uuidField), note: optionalText(300).optional() }), formData);
  if (!pre.data) return { error: "invalid", fieldErrors: pre.fieldErrors };
  const { storeId, courierId, deliveryIds, note } = pre.data;
  if (!deliveryIds.length || deliveryIds.length > BULK_LIMIT) return { error: "invalid" };

  try {
    const { db, user } = await adminMutation(storeId, "delivery.cash");
    const { data: rows } = await db
      .from("deliveries")
      .select("*")
      .eq("store_id", storeId)
      .eq("courier_id", courierId)
      .eq("state", "delivered")
      .is("settlement_id", null)
      .in("id", deliveryIds)
      .returns<DeliveryRow[]>();
    // A stop closed while the sheet was on screen must never be swept into someone's count.
    if (!rows || rows.length !== deliveryIds.length) return { error: "stale" };

    const { data: orders } = await db.from("orders").select("*").eq("store_id", storeId).in("id", rows.map((r) => r.order_id)).returns<OrderRow[]>();
    const currency = orders?.[0]?.currency ?? "TRY";
    const amountParsed = parseForm(z.object({ received: moneyField(currency, { min: 0 }) }), formData);
    if (!amountParsed.data) return { error: "invalid", fieldErrors: amountParsed.fieldErrors };

    const { data: settlement, error } = await db
      .from("delivery_settlements")
      .insert({ store_id: storeId, courier_id: courierId, amount: amountParsed.data.received, currency, deliveries_count: rows.length, settled_by: user.id, note })
      .select("id")
      .single<{ id: string }>();
    if (error || !settlement) return { error: "failed" };

    const byId = new Map((orders ?? []).map((o) => [o.id, o]));
    const reference = `cash · ${settlement.id.slice(0, 8)}`;
    for (const row of rows) {
      const order = byId.get(row.order_id);
      // A short collection records no payment: the shortfall stays visible and the order stays unpaid.
      if (!order || (row.cash_collected ?? 0) < row.cash_expected) continue;
      await markOrderPaid(db, order, reference, user.id);
    }
    await db.from("deliveries").update({ settlement_id: settlement.id }).in("id", rows.map((r) => r.id));
    for (const row of rows) await logDelivery(db, storeId, row.id, "settled", user.id, { settlement_id: settlement.id });

    refresh();
    return { ok: true, changed: rows.length };
  } catch (err) {
    return { error: actionError(err) };
  }
}

/**
 * Hands back one courier's private link. A separate action rather than a column on the list so the
 * token is never rendered into the couriers page HTML — it is fetched only when someone asks to see
 * or copy it, and only with `delivery.manage`.
 */
export async function getCourierLinkAction(_prev: ActionState & { link?: string }, formData: FormData): Promise<ActionState & { link?: string }> {
  const parsed = parseForm(base.extend({ courierId: uuidField, locale: z.string().max(5) }), formData);
  if (!parsed.data) return { error: "invalid" };
  const { storeId, courierId, locale } = parsed.data;
  try {
    const { db } = await adminMutation(storeId, "delivery.manage");
    const { data } = await db.from("couriers").select("token").eq("store_id", storeId).eq("id", courierId).maybeSingle<{ token: string }>();
    if (!data) return { error: "notFound" };
    return { ok: true, link: `${env.appUrl()}/${locale}/courier/${data.token}` };
  } catch (err) {
    return { error: actionError(err) };
  }
}

/**
 * The module's search: six digits, an order number, a phone or an email. Returns matches with
 * everything needed to act on them, so staff never navigate to find a parcel someone is asking about
 * on the phone.
 */
export async function lookupDeliveryAction(
  _prev: ActionState & { matches?: LookupMatch[]; query?: string },
  formData: FormData,
): Promise<ActionState & { matches?: LookupMatch[]; query?: string }> {
  const parsed = parseForm(base.extend({ query: z.string().trim().min(1).max(60) }), formData);
  if (!parsed.data) return { error: "invalid" };
  const { storeId, query } = parsed.data;
  try {
    const { db } = await adminMutation(storeId, "delivery.read");
    const { data: store } = await db.from("stores").select("settings").eq("id", storeId).maybeSingle<{ settings: Record<string, unknown> }>();
    const matches = await lookupDelivery(storeId, query, deliveryFromSettings(store?.settings).attemptLimit);
    return { ok: true, matches, query };
  } catch (err) {
    return { error: actionError(err) };
  }
}
