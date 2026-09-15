/**
 * Hand-written row types mirroring supabase/migrations.
 * SCOPE(db-types): replace with `npm run db:types` output once the local Supabase stack runs
 * (needs Docker). GROWS LATER → generated `Database` type passed to every client.
 */
import type { Locale } from "@/i18n/config";

export type Translated = Partial<Record<Locale, string>>;

export type PlatformRole = "owner" | null;
export type StoreRole = "manager" | "staff";
export type EffectiveRole = "owner" | StoreRole;

export interface ProfileRow {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  platform_role: PlatformRole;
  preferred_locale: Locale | null;
  /** E.164; null until the user completes their profile. */
  phone: string | null;
  phone_country: string | null;
}

export interface StoreRow {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  logo_url: string | null;
  favicon_url: string | null;
  currency: string;
  default_locale: Locale;
  enabled_locales: Locale[];
  timezone: string;
  contact_email: string | null;
  contact_phone: string | null;
  email_from: string | null;
  tax_rate_bp: number;
  prices_include_tax: boolean;
  low_stock_threshold: number;
  theme: unknown;
  settings: Record<string, unknown>;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface StoreDomainRow {
  id: string;
  store_id: string;
  hostname: string;
  is_primary: boolean;
  verified_at: string | null;
  created_at: string;
}

export interface StoreMemberRow {
  store_id: string;
  user_id: string;
  role: StoreRole;
  created_at: string;
}

export interface BrandRow {
  id: string;
  store_id: string;
  slug: string;
  name: string;
  logo_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CategoryRow {
  id: string;
  store_id: string;
  parent_id: string | null;
  slug: string;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface CategoryTranslationRow {
  category_id: string;
  locale: Locale;
  name: string;
  description: string | null;
}

export type ProductStatus = "draft" | "active" | "archived";

export interface ProductRow {
  id: string;
  store_id: string;
  slug: string;
  status: ProductStatus;
  brand_id: string | null;
  tags: string[];
  is_featured: boolean;
  /** owner's hand-picked "Best sellers" (the home section pads real sales with these) */
  is_bestseller: boolean;
  rating_avg: number;
  rating_count: number;
  created_at: string;
  updated_at: string;
}

export interface ProductTranslationRow {
  product_id: string;
  locale: Locale;
  name: string;
  short_description: string | null;
  description: string | null;
  seo_title: string | null;
  seo_description: string | null;
}

export interface ProductOptionRow {
  id: string;
  product_id: string;
  name: Translated;
  sort_order: number;
}

export interface ProductOptionValueRow {
  id: string;
  option_id: string;
  value: Translated;
  swatch: string | null;
  sort_order: number;
}

export interface ProductVariantRow {
  id: string;
  store_id: string;
  product_id: string;
  sku: string | null;
  barcode: string | null;
  price: number;
  compare_at_price: number | null;
  cost_price: number | null;
  stock_qty: number;
  track_inventory: boolean;
  allow_backorder: boolean;
  weight_grams: number | null;
  is_default: boolean;
  is_active: boolean;
}

export interface ProductImageRow {
  id: string;
  product_id: string;
  variant_id: string | null;
  url: string;
  alt: Translated;
  sort_order: number;
}

export interface CustomerRow {
  id: string;
  store_id: string;
  user_id: string | null;
  email: string;
  full_name: string | null;
  phone: string | null;
  accepts_marketing: boolean;
  notes: string | null;
  created_at: string;
}

export interface AddressRow {
  id: string;
  customer_id: string;
  label: string | null;
  full_name: string;
  phone: string | null;
  line1: string;
  line2: string | null;
  city: string;
  region: string | null;
  postal_code: string | null;
  country: string;
  is_default: boolean;
}

export interface ShippingRateRow {
  id: string;
  store_id: string;
  name: Translated;
  rate: number;
  free_over: number | null;
  /** What the store pays the courier per shipment (minor units). */
  cost: number;
  countries: string[] | null;
  min_days: number | null;
  max_days: number | null;
  is_active: boolean;
  sort_order: number;
}

export type DiscountType = "percent" | "fixed" | "free_shipping";

export interface CouponRow {
  id: string;
  store_id: string;
  code: string;
  type: DiscountType;
  value: number;
  min_subtotal: number | null;
  max_uses: number | null;
  max_uses_per_customer: number | null;
  uses_count: number;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  created_at: string;
}

export interface CartRow {
  id: string;
  store_id: string;
  token: string;
  user_id: string | null;
  coupon_id: string | null;
  currency: string;
  updated_at: string;
}

export interface CartItemRow {
  id: string;
  cart_id: string;
  variant_id: string;
  quantity: number;
}

export type OrderStatus =
  | "pending_payment"
  | "paid"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded";

export interface OrderAddress {
  full_name: string;
  phone?: string | null;
  line1: string;
  line2?: string | null;
  city: string;
  region?: string | null;
  postal_code?: string | null;
  country: string;
}

export interface OrderRow {
  id: string;
  store_id: string;
  number: string;
  customer_id: string | null;
  user_id: string | null;
  email: string;
  phone: string | null;
  locale: Locale;
  currency: string;
  status: OrderStatus;
  subtotal: number;
  discount_total: number;
  shipping_total: number;
  /** What the store pays the courier for this order (minor units); copied from the rate at checkout. */
  shipping_cost: number;
  tax_total: number;
  total: number;
  refunded_total: number;
  coupon_code: string | null;
  shipping_address: OrderAddress | null;
  billing_address: OrderAddress | null;
  shipping_method: { name: Translated; rate: number } | null;
  customer_note: string | null;
  internal_note: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
  placed_at: string;
  paid_at: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  /** Secret 6-digit code held by the customer; confirms delivery together with the order number. */
  delivery_code: string;
  /** Failed confirm attempts; at DELIVERY_ATTEMPT_LIMIT the code locks until staff reissue it. */
  delivery_attempts: number;
  delivered_by: "code" | "manual" | null;
}

export interface OrderItemRow {
  id: string;
  order_id: string;
  product_id: string | null;
  variant_id: string | null;
  product_name: string;
  variant_name: string | null;
  sku: string | null;
  image_url: string | null;
  unit_price: number;
  unit_cost: number | null;
  quantity: number;
  line_total: number;
}

export type PaymentStatus =
  | "pending"
  | "authorized"
  | "paid"
  | "failed"
  | "refunded"
  | "partially_refunded";
export type PaymentProvider = "manual" | "iyzico";

export interface PaymentRow {
  id: string;
  store_id: string;
  order_id: string;
  provider: PaymentProvider;
  provider_ref: string | null;
  status: PaymentStatus;
  amount: number;
  currency: string;
  raw: unknown;
  created_at: string;
}

export type StockReason =
  | "initial"
  | "purchase"
  | "sale"
  | "return"
  | "adjustment"
  | "damaged"
  | "correction";

export interface StockMovementRow {
  id: string;
  store_id: string;
  variant_id: string;
  delta: number;
  reason: StockReason;
  order_id: string | null;
  actor_id: string | null;
  note: string | null;
  created_at: string;
}

export type ReviewStatus = "pending" | "approved" | "rejected";

export interface ReviewRow {
  id: string;
  store_id: string;
  product_id: string;
  customer_id: string | null;
  user_id: string | null;
  order_id: string | null;
  rating: number;
  title: string | null;
  body: string | null;
  status: ReviewStatus;
  is_verified_purchase: boolean;
  created_at: string;
}

export interface ExpenseRow {
  id: string;
  store_id: string;
  category_id: string | null;
  amount: number;
  currency: string;
  spent_on: string;
  vendor: string | null;
  note: string | null;
  receipt_url: string | null;
  created_by: string | null;
  created_at: string;
}

export interface ExpenseCategoryRow {
  id: string;
  store_id: string;
  name: string;
  sort_order: number;
}

export interface RefundRow {
  id: string;
  payment_id: string;
  order_id: string;
  amount: number;
  reason: string | null;
  actor_id: string | null;
  provider_ref: string | null;
  created_at: string;
}

export type OrderEventType = "placed" | "status_changed" | "note" | "payment" | "shipment" | "refund";

export interface OrderEventRow {
  id: string;
  order_id: string;
  actor_id: string | null;
  type: OrderEventType | string;
  data: Record<string, unknown>;
  created_at: string;
}

export interface CouponRedemptionRow {
  id: string;
  coupon_id: string;
  order_id: string;
  customer_id: string | null;
  amount: number;
  created_at: string;
}

// ---------- delivery (couriers, delivery jobs, log, cash settlements) ----------

export type DeliveryState = "pending" | "assigned" | "out_for_delivery" | "delivered" | "failed" | "returned" | "cancelled";
export type DeliveryFailure = "no_answer" | "wrong_address" | "refused" | "postponed" | "unsafe" | "other";
export type CourierVehicle = "motorbike" | "car" | "van" | "bicycle" | "on_foot";

export interface CourierRow {
  id: string;
  store_id: string;
  name: string;
  phone: string | null;
  vehicle: CourierVehicle | null;
  /** Set only when the courier also has a staff account. */
  user_id: string | null;
  /** Addresses this courier's stop list; PII-bearing, so it can be rotated and deactivated. */
  token: string;
  token_issued_at: string;
  is_active: boolean;
  note: string | null;
  created_at: string;
  updated_at: string;
}

/** One delivery job. An order gets a new row per attempt cycle; only one may be open at a time. */
export interface DeliveryRow {
  id: string;
  store_id: string;
  order_id: string;
  courier_id: string | null;
  state: DeliveryState;
  /** Store-local date (YYYY-MM-DD), not UTC. */
  scheduled_for: string | null;
  slot: string | null;
  sort_order: number;
  attempt_no: number;
  /** Minor units to collect at the door; 0 when the order is already paid. */
  cash_expected: number;
  cash_collected: number | null;
  settlement_id: string | null;
  /** True only when the customer's delivery code was used. */
  verified: boolean;
  recipient_name: string | null;
  failure_reason: DeliveryFailure | null;
  note: string | null;
  photo_url: string | null;
  lat: number | null;
  lng: number | null;
  assigned_at: string | null;
  dispatched_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export type DeliveryEventType = "created" | "assigned" | "unassigned" | "scheduled" | "dispatched" | "delivered" | "failed" | "returned" | "cancelled" | "cash" | "settled" | "note";

export interface DeliveryEventRow {
  id: string;
  store_id: string;
  delivery_id: string;
  type: DeliveryEventType | string;
  data: Record<string, unknown>;
  /** Null when the courier wrote it (they have no profile) — `courier_id` says who instead. */
  actor_id: string | null;
  courier_id: string | null;
  created_at: string;
}

export interface DeliverySettlementRow {
  id: string;
  store_id: string;
  courier_id: string;
  amount: number;
  currency: string;
  deliveries_count: number;
  settled_by: string | null;
  note: string | null;
  created_at: string;
}
