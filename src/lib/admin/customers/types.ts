import type { AddressRow, CustomerRow, OrderStatus } from "@/lib/db/types";

/** Row of `public.v_customer_stats` (customers + order aggregates). */
export interface CustomerStatsRow extends CustomerRow {
  updated_at: string;
  /** Orders that are not cancelled. */
  orders_count: number;
  /** Sum of `total` for paid → delivered orders, minor units. */
  total_spent: number;
  last_order_at: string | null;
}

export interface CustomerDetail extends CustomerStatsRow {
  addresses: AddressRow[];
}

export type CustomerSort = "created_at" | "total_spent" | "orders_count";
export const CUSTOMER_SORTS: readonly CustomerSort[] = ["created_at", "total_spent", "orders_count"];

export type MarketingFilter = "yes" | "no";
export const MARKETING_FILTERS: readonly MarketingFilter[] = ["yes", "no"];

/** `public.customer_insights()`: one shopper's order history, aggregated in the database. Money in minor units. */
export interface CustomerInsights {
  orders_total: number;
  by_status: Partial<Record<OrderStatus, number>>;
  active: number;
  delivered: number;
  cancelled: number;
  refunded: number;
  /** Delivered or paid orders, net of refunds. */
  spent: number;
  /** Total of orders still on their way. */
  open_value: number;
  refunded_total: number;
  avg_order: number;
  largest_order: number;
  discount_total: number;
  coupons: string[];
  units: number;
  distinct_products: number;
  top_products: { product_id: string | null; product_name: string; units: number; revenue: number }[];
  first_order_at: string | null;
  last_order_at: string | null;
  avg_days_between: number | null;
  /** The last 12 months, oldest first, including empty ones. */
  monthly: { month: string; orders: number; total: number }[];
  top_city: { city: string; orders: number } | null;
}
