import "server-only";

import type { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { OrderRow } from "@/lib/db/types";
import { canTransition } from "@/lib/admin/orders/transitions";
import { notifyCustomer } from "./notify";

type Db = ReturnType<typeof createSupabaseAdminClient>;

interface ShipInput {
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  shippingCost?: number | null;
  /** Extra fields for the shipment event (e.g. the courier a delivery dispatched with). */
  event?: Record<string, unknown>;
}

/**
 * Stamps an order as shipped: status, `shipped_at`, tracking, courier cost, the `shipment` event and
 * the customer mail. Shared by the admin Ship dialog and by dispatching a delivery run, so a parcel
 * that leaves with a courier looks identical to one handed to a carrier by hand.
 *
 * Returns false when the order cannot legally move to `shipped` — the caller decides whether that is
 * an error (single order) or a skip (bulk dispatch).
 */
export async function markShipped(db: Db, order: OrderRow, actorId: string | null, input: ShipInput = {}): Promise<boolean> {
  if (!canTransition(order.status, "shipped")) return false;
  const shipping_cost = input.shippingCost ?? order.shipping_cost ?? 0;
  const tracking_number = input.trackingNumber ?? order.tracking_number;
  const tracking_url = input.trackingUrl ?? order.tracking_url;

  // Independent writes, and the row update's result was never checked, so running them together
  // changes nothing but the wall clock.
  await Promise.all([
    db
      .from("orders")
      .update({ status: "shipped", shipped_at: new Date().toISOString(), tracking_number, tracking_url, shipping_cost })
      .eq("id", order.id),
    db.from("order_events").insert({
      order_id: order.id,
      actor_id: actorId,
      type: "shipment",
      data: { tracking_number, tracking_url, shipping_cost, ...(input.event ?? {}) },
    }),
  ]);
  await notifyCustomer(db, order, "shipped", { trackingNumber: tracking_number, trackingUrl: tracking_url });
  return true;
}

/**
 * The same move for a whole selection, in two writes instead of two per order.
 *
 * Bulk ship and run dispatch carry no per-parcel tracking number (tracking cannot be typed once for
 * thirty orders), so `markShipped` was writing each order's own `tracking_number`, `tracking_url`
 * and `shipping_cost` straight back onto itself — all three columns are NOT NULL with defaults, so
 * those were no-op writes. That leaves `status` and `shipped_at`, which are identical for every row,
 * so one `.in()` update covers the lot and the events go in as a single multi-row insert.
 *
 * Returns the orders that actually moved; the rest failed `canTransition` and are the caller's to
 * count as skipped.
 */
export async function markShippedBulk(
  db: Db,
  orders: OrderRow[],
  actorId: string | null,
  eventFor: (order: OrderRow) => Record<string, unknown> = () => ({}),
): Promise<OrderRow[]> {
  const eligible = orders.filter((o) => canTransition(o.status, "shipped"));
  if (!eligible.length) return [];
  const shipped_at = new Date().toISOString();

  await Promise.all([
    db.from("orders").update({ status: "shipped", shipped_at }).in("id", eligible.map((o) => o.id)),
    db.from("order_events").insert(
      eligible.map((o) => ({
        order_id: o.id,
        actor_id: actorId,
        type: "shipment",
        data: {
          tracking_number: o.tracking_number,
          tracking_url: o.tracking_url,
          shipping_cost: o.shipping_cost ?? 0,
          ...eventFor(o),
        },
      })),
    ),
  ]);
  // Deferred to after the response by `notifyCustomer`, so this loop costs nothing.
  for (const order of eligible) {
    await notifyCustomer(db, order, "shipped", { trackingNumber: order.tracking_number, trackingUrl: order.tracking_url });
  }
  return eligible;
}
