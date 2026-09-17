import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { ListParams } from "@/lib/admin/list-params";
import type { AddressRow } from "@/lib/db/types";
import type { CustomerDetail, CustomerInsights, CustomerSort, CustomerStatsRow, MarketingFilter } from "./types";

/** Strip characters that would break a PostgREST `or()` filter. */
function safeLike(q: string) {
  return q.replace(/[,()%\\]/g, " ").trim();
}

export async function listCustomers(
  storeId: string,
  params: ListParams<CustomerSort> & { marketing?: MarketingFilter },
): Promise<{ rows: CustomerStatsRow[]; total: number }> {
  const db = createSupabaseAdminClient();
  let q = db.from("v_customer_stats").select("*", { count: "exact" }).eq("store_id", storeId);
  if (params.marketing) q = q.eq("accepts_marketing", params.marketing === "yes");
  const term = safeLike(params.q);
  if (term) q = q.or(`full_name.ilike.%${term}%,email.ilike.%${term}%`);
  const { data, count, error } = await q
    .order(params.sort, { ascending: params.dir === "asc", nullsFirst: false })
    .order("id", { ascending: true })
    .range(params.range.from, params.range.to)
    .returns<CustomerStatsRow[]>();
  if (error) throw error;
  return { rows: data ?? [], total: count ?? 0 };
}

export interface CustomerDeliverySummary {
  stops: number;
  delivered: number;
  failed: number;
  unverified: number;
  /** Minor units expected at the door on open stops, plus delivered-but-unsettled money. */
  cashOpen: number;
  lastCourier: { id: string; name: string } | null;
  lastState: string | null;
}

/** What delivery looks like for this customer: a repeat "no answer" shows up here before it costs a third run. */
export async function getCustomerDeliverySummary(storeId: string, customerId: string): Promise<CustomerDeliverySummary> {
  const db = createSupabaseAdminClient();
  const { data } = await db
    .from("deliveries")
    .select("state, verified, cash_expected, cash_collected, settlement_id, courier_id, created_at, couriers(name), orders!inner(customer_id)")
    .eq("store_id", storeId)
    .eq("orders.customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(200)
    .returns<{ state: string; verified: boolean; cash_expected: number; cash_collected: number | null; settlement_id: string | null; courier_id: string | null; couriers: { name: string } | null }[]>();
  const rows = data ?? [];
  const latest = rows.find((r) => r.courier_id && r.couriers);
  return {
    stops: rows.length,
    delivered: rows.filter((r) => r.state === "delivered").length,
    failed: rows.filter((r) => r.state === "failed" || r.state === "returned").length,
    unverified: rows.filter((r) => r.state === "delivered" && !r.verified).length,
    cashOpen: rows.reduce((s, r) => {
      if (r.state === "assigned" || r.state === "out_for_delivery" || r.state === "pending") return s + r.cash_expected;
      if (r.state === "delivered" && !r.settlement_id) return s + (r.cash_collected ?? 0);
      return s;
    }, 0),
    lastCourier: latest?.courier_id && latest.couriers ? { id: latest.courier_id, name: latest.couriers.name } : null,
    lastState: rows[0]?.state ?? null,
  };
}

export async function getCustomer(storeId: string, id: string): Promise<CustomerDetail | null> {
  const db = createSupabaseAdminClient();
  const { data, error } = await db.from("v_customer_stats").select("*").eq("store_id", storeId).eq("id", id).maybeSingle<CustomerStatsRow>();
  if (error) throw error;
  if (!data) return null;
  const { data: addresses, error: addrError } = await db
    .from("addresses")
    .select("*")
    .eq("customer_id", id)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true })
    .returns<AddressRow[]>();
  if (addrError) throw addrError;
  return { ...data, addresses: addresses ?? [] };
}

/** The customer page's tracker numbers. Null when the database function is unavailable, so the page still renders. */
export async function getCustomerInsights(storeId: string, customerId: string): Promise<CustomerInsights | null> {
  const db = createSupabaseAdminClient();
  const { data, error } = await db.rpc("customer_insights", { p_store_id: storeId, p_customer_id: customerId });
  if (error) {
    console.error("customer_insights", error.message);
    return null;
  }
  return data as CustomerInsights;
}
