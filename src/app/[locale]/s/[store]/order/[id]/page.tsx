import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { storeContext, type StoreContext } from "@/lib/tenant/context";
import { getOrderForViewer, getOrderTracking } from "@/lib/account/queries";
import { trackOrder } from "@/lib/account/tracking";
import { OrderTracker } from "@/components/storefront/shared/order-tracker";
import { getOrderDeliveries } from "@/lib/account/delivery";
import { DeliveryProgress } from "@/components/storefront/shared/delivery-progress";
import { formatMoney } from "@/lib/money";
import { pickJson } from "@/lib/catalog/types";
import { Badge } from "@/components/ui/badge";
import { PageShell, pageHeading } from "@/components/storefront/shared/page-shell";
import { PrintButton } from "@/components/storefront/shared/print-button";
import { CopyButton } from "@/components/shared/copy-button";
import { ProductImage } from "@/components/storefront/shared/product-image";
import type { OrderStatus } from "@/lib/db/types";
import { dateTimeFormat } from "@/lib/number";
import { OrderSkeleton } from "@/components/storefront/shared/skeletons";
import { cn } from "@/lib/utils";
import type { Metadata } from "next";
import { NOINDEX } from "@/lib/seo/urls";

/** Statuses where the delivery code is still worth something to the customer. */
const DELIVERY_CODE_VISIBLE: OrderStatus[] = ["paid", "processing", "shipped"];

/** One shopper's page: named in the tab, kept out of search. */
export async function generateMetadata({ params }: PageProps<"/[locale]/s/[store]/order/[id]">): Promise<Metadata> {
  await storeContext(params);
  const t = await getTranslations("order");
  return { title: t("title"), robots: NOINDEX };
}

export default async function OrderPage({ params, searchParams }: PageProps<"/[locale]/s/[store]/order/[id]">) {
  const ctx = await storeContext(params);
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  return (
    <Suspense fallback={<OrderSkeleton />}>
      <OrderContent ctx={ctx} id={id} searchParams={searchParams} />
    </Suspense>
  );
}

async function OrderContent({ ctx, id, searchParams }: { ctx: StoreContext; id: string; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { store, locale, fallback } = ctx;
  const [t, ts, tc, order, deliveries, tracking, sp] = await Promise.all([
    getTranslations("order"),
    getTranslations("orderStatus"),
    getTranslations("cart"),
    getOrderForViewer(store.id, id),
    getOrderDeliveries(store.id, id),
    getOrderTracking(store.id, [id]),
    searchParams,
  ]);
  if (!order) notFound();
  const money = (n: number) => formatMoney(n, order.currency, locale);
  const a = order.shipping_address;

  return (
    <PageShell width="narrow">
      {sp.placed === "1" && (
        <div className="rounded-xl bg-primary/10 p-4">
          <p className="font-medium">{t("thanks")}</p>
          <p className="text-sm text-muted-foreground">{t("paymentPending")}</p>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-1">
            <h1 className={cn("bidi-auto font-semibold tracking-tight", pageHeading.sub)}>
              {t("title")} {order.number}
            </h1>
            <CopyButton value={order.number} label={t("copyNumber")} />
          </div>
          <p className="text-sm text-muted-foreground">
            {t("placedAt")} {dateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(order.placed_at))}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={order.status === "cancelled" ? "destructive" : "secondary"}>{ts(order.status)}</Badge>
          <PrintButton label={t("print")} />
        </div>
      </div>

      {/* The handover secret. Shown only while the parcel is still on its way: once the order is
          delivered, cancelled or refunded the code is spent, and the order link lives in an email. */}
      {DELIVERY_CODE_VISIBLE.includes(order.status) && (
        <section className="flex flex-col gap-1 rounded-xl border border-dashed p-4 text-center">
          <h2 className="text-sm font-medium text-muted-foreground">{t("deliveryCode")}</h2>
          <div className="flex items-center justify-center gap-1">
            <p dir="ltr" className="text-3xl font-semibold tracking-[0.3em] tabular-nums">
              {order.delivery_code}
            </p>
            <CopyButton value={order.delivery_code} label={t("copyCode")} />
          </div>
          <p className="text-sm text-muted-foreground">{t("deliveryCodeHint")}</p>
        </section>
      )}

      <section className="rounded-xl border p-4">
        <OrderTracker tracking={trackOrder(order, tracking[id])} locale={locale} />
      </section>

      <DeliveryProgress attempts={deliveries} locale={locale} />

      <section className="rounded-xl border">
        <ul className="divide-y">
          {order.order_items.map((i) => (
            <li key={i.id} className="flex items-center gap-3 p-3 text-sm">
              <ProductImage src={i.image_url} alt={i.product_name} className="size-14 shrink-0 rounded-md" sizes="56px" />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{i.product_name}</p>
                <p className="text-muted-foreground">
                  {i.variant_name ? `${i.variant_name} · ` : ""}× {i.quantity}
                </p>
              </div>
              <span className="tabular-nums">{money(i.line_total)}</span>
            </li>
          ))}
        </ul>
        <dl className="flex flex-col gap-1 border-t p-3 text-sm">
          <div className="flex justify-between"><dt>{tc("subtotal")}</dt><dd className="tabular-nums">{money(order.subtotal)}</dd></div>
          {order.discount_total > 0 && <div className="flex justify-between"><dt>{tc("discount")}{order.coupon_code ? ` (${order.coupon_code})` : ""}</dt><dd className="tabular-nums">−{money(order.discount_total)}</dd></div>}
          <div className="flex justify-between"><dt>{tc("shipping")}{order.shipping_method ? ` · ${pickJson(order.shipping_method.name, locale, fallback)}` : ""}</dt><dd className="tabular-nums">{money(order.shipping_total)}</dd></div>
          {order.tax_total > 0 && <div className="flex justify-between text-muted-foreground"><dt>{tc("tax")}</dt><dd className="tabular-nums">{money(order.tax_total)}</dd></div>}
          <div className="mt-1 flex justify-between border-t pt-2 font-semibold"><dt>{tc("total")}</dt><dd className="tabular-nums">{money(order.total)}</dd></div>
        </dl>
      </section>

      {a && (
        <section className="grid gap-6 text-sm @phablet:grid-cols-2">
          <div>
            <h2 className="mb-1 font-medium">{t("shippingTo")}</h2>
            <address className="not-italic text-muted-foreground">
              {a.full_name}<br />{a.line1}{a.line2 ? <><br />{a.line2}</> : null}<br />{a.postal_code} {a.city}{a.region ? `, ${a.region}` : ""}<br />{a.country}
            </address>
          </div>
          <div>
            <h2 className="mb-1 font-medium">{t("contact")}</h2>
            <p className="text-muted-foreground">{order.email}{order.phone ? <><br /><span dir="ltr">{order.phone}</span></> : null}</p>
            {order.tracking_number && (
              <p className="mt-2">
                {t("tracking")}: {order.tracking_url ? <a href={order.tracking_url} className="underline" target="_blank" rel="noreferrer">{order.tracking_number}</a> : order.tracking_number}
              </p>
            )}
          </div>
        </section>
      )}
    </PageShell>
  );
}
