import "server-only";

import { cache } from "react";
import type { Locale } from "@/i18n/config";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/auth/session";
import type { AddressRow, DeliveryFailure, DeliveryState, OrderItemRow, OrderRow, PaymentRow } from "@/lib/db/types";
import type { TrackingData } from "./tracking";
import { getProducts } from "@/lib/catalog/queries";
import type { ProductCardData } from "@/lib/catalog/types";

export type OrderWithItems = OrderRow & { order_items: OrderItemRow[]; payments: PaymentRow[] };

/** Orders for the signed-in user in this store. */
export const getMyOrders = cache(async (storeId: string): Promise<OrderRow[]> => {
  const user = await getSessionUser();
  if (!user) return [];
  const { data } = await createSupabaseAdminClient()
    .from("orders")
    .select("*")
    .eq("store_id", storeId)
    .eq("user_id", user.id)
    .order("placed_at", { ascending: false })
    .returns<OrderRow[]>();
  return data ?? [];
});

/**
 * Order detail by id. The uuid itself is the access token for guests (unguessable); signed-in
 * users additionally must own it OR be staff (staff view lives in admin, not here).
 */
export const getOrderForViewer = cache(async (storeId: string, orderId: string): Promise<OrderWithItems | null> => {
  const { data } = await createSupabaseAdminClient()
    .from("orders")
    .select("*, order_items(*), payments(*)")
    .eq("store_id", storeId)
    .eq("id", orderId)
    .maybeSingle<OrderWithItems>();
  if (!data) return null;
  const user = await getSessionUser();
  if (data.user_id && user?.id !== data.user_id) return null;
  return data;
});

/**
 * What the order tracker needs beyond the order rows, for several orders in two queries: each
 * order's delivery attempts and the moment staff confirmed it. Callers pass ids they may already see.
 */
export const getOrderTracking = cache(async (storeId: string, orderIds: string[]): Promise<Record<string, TrackingData>> => {
  const out: Record<string, TrackingData> = Object.fromEntries(orderIds.map((id) => [id, { attempts: [], confirmedAt: null }]));
  if (orderIds.length === 0) return out;
  const db = createSupabaseAdminClient();
  const [deliveries, events] = await Promise.all([
    db
      .from("deliveries")
      .select("order_id, attempt_no, state, dispatched_at, completed_at, scheduled_for, failure_reason")
      .eq("store_id", storeId)
      .in("order_id", orderIds)
      .order("attempt_no", { ascending: true })
      .returns<{ order_id: string; attempt_no: number; state: DeliveryState; dispatched_at: string | null; completed_at: string | null; scheduled_for: string | null; failure_reason: DeliveryFailure | null }[]>(),
    db
      .from("order_events")
      .select("order_id, data, created_at")
      .eq("type", "status_changed")
      .in("order_id", orderIds)
      .order("created_at", { ascending: true })
      .returns<{ order_id: string; data: { to?: string }; created_at: string }[]>(),
  ]);
  for (const d of deliveries.data ?? []) {
    out[d.order_id]?.attempts.push({ state: d.state, dispatchedAt: d.dispatched_at, completedAt: d.completed_at, scheduledFor: d.scheduled_for, failureReason: d.failure_reason });
  }
  for (const e of events.data ?? []) {
    const t = out[e.order_id];
    if (t && !t.confirmedAt && (e.data?.to === "processing" || e.data?.to === "paid")) t.confirmedAt = e.created_at;
  }
  return out;
});

export const getMyAddresses = cache(async (storeId: string): Promise<AddressRow[]> => {
  const user = await getSessionUser();
  if (!user) return [];
  const { data } = await createSupabaseAdminClient()
    .from("addresses")
    .select("*, customers!inner(store_id, user_id)")
    .eq("customers.store_id", storeId)
    .eq("customers.user_id", user.id)
    .order("is_default", { ascending: false })
    .returns<AddressRow[]>();
  return data ?? [];
});

export const getMyWishlistIds = cache(async (storeId: string): Promise<Set<string>> => {
  const user = await getSessionUser();
  if (!user) return new Set();
  const { data } = await createSupabaseAdminClient()
    .from("wishlist_items")
    .select("product_id")
    .eq("store_id", storeId)
    .eq("user_id", user.id)
    .returns<{ product_id: string }[]>();
  return new Set((data ?? []).map((w) => w.product_id));
});

export async function getMyWishlistProducts(
  storeId: string,
  locale: Locale,
  fallback: Locale,
): Promise<ProductCardData[]> {
  const ids = await getMyWishlistIds(storeId);
  if (ids.size === 0) return [];
  const all = await getProducts(storeId, locale, fallback, { pageSize: 48 });
  return all.items.filter((p) => ids.has(p.id));
}
