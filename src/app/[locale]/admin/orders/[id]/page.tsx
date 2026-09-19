import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { OrderActions } from "@/components/admin/orders/order-actions";
import { OrderDetail } from "@/components/admin/orders/order-detail";
import { CrumbLabel } from "@/components/admin/shared/crumb-label";
import { PageHeader } from "@/components/admin/shared/page-header";
import { CopyButton } from "@/components/shared/copy-button";
import { OptimisticStatusBadge } from "@/components/admin/shared/optimistic-status-badge";
import { TableSkeleton } from "@/components/admin/shared/table-skeleton";
import { requireAdminPage } from "@/lib/admin/context";
import { getOrder } from "@/lib/admin/orders/queries";
import { listCouriers, listDeliveriesForOrder, storeToday } from "@/lib/admin/delivery/queries";
import { DELIVERABLE_STATUSES } from "@/lib/admin/delivery/types";
import { signedProofUrl } from "@/lib/courier/photo";
import { deliveryFromSettings } from "@/lib/delivery/settings";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { OrderDeliveryCard } from "@/components/admin/orders/order-delivery-card";
import { can } from "@/lib/auth/permissions";
import { dateTimeFormat } from "@/lib/number";

type Props = PageProps<"/[locale]/admin/orders/[id]">;

/** `[id]` has no static params, so the params read itself is runtime data: keep it under Suspense. */
export default function OrderPage({ params }: Props) {
  return (
    <Suspense fallback={<TableSkeleton />}>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({ params }: { params: Props["params"] }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const ctx = await requireAdminPage(locale, "orders.read");
  const canAssign = can(ctx.role, "delivery.assign");
  const [order, deliveries, couriers, t] = await Promise.all([
    getOrder(ctx.store.id, id),
    listDeliveriesForOrder(ctx.store.id, id),
    canAssign ? listCouriers(ctx.store.id, false) : Promise.resolve([]),
    getTranslations("admin"),
  ]);
  if (!order) notFound();
  // Proof photos live in a private bucket: hand the card short-lived signed URLs, never paths.
  const photoUrls: Record<string, string> = {};
  if (deliveries.some((d) => d.photo_url)) {
    const db = createSupabaseAdminClient();
    for (const d of deliveries) {
      if (!d.photo_url) continue;
      const url = await signedProofUrl(db, d.photo_url);
      if (url) photoUrls[d.id] = url;
    }
  }
  const settings = deliveryFromSettings(ctx.store.settings);
  const today = storeToday(ctx.store.timezone);
  const tomorrow = storeToday(ctx.store.timezone, settings.leadDays);
  const date = dateTimeFormat(ctx.locale, { dateStyle: "long", timeStyle: "short" });
  return (
    <>
      <CrumbLabel segment={order.id} label={order.number} />
      <PageHeader
        back={{ href: "/admin/orders", label: t("nav.orders") }}
        title={
          <span className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1">
              <span dir="ltr">{order.number}</span>
              <CopyButton value={order.number} label={t("orders.copyNumber")} />
            </span>
            <OptimisticStatusBadge id={order.id} kind="order" value={order.status} className="text-sm" />
          </span>
        }
        description={date.format(new Date(order.placed_at))}
        actions={
          can(ctx.role, "orders.update") ? (
            <OrderActions
              storeId={ctx.store.id}
              orderId={order.id}
              status={order.status}
              currency={order.currency}
              locale={ctx.locale}
              remainingRefundable={order.total - order.refunded_total}
              canRefund={can(ctx.role, "orders.refund")}
              shippingCost={order.shipping_cost ?? 0}
            />
          ) : null
        }
      />
      <OrderDetail
        order={order}
        storeId={ctx.store.id}
        locale={ctx.locale}
        delivery={
          <OrderDeliveryCard
            storeId={ctx.store.id}
            orderId={order.id}
            attempts={deliveries}
            locale={ctx.locale}
            currency={order.currency}
            canAssign={canAssign}
            photoUrls={photoUrls}
            deliverable={(DELIVERABLE_STATUSES as readonly string[]).includes(order.status)}
            couriers={couriers.map((c) => ({ id: c.id, name: c.name }))}
            today={today}
            tomorrow={tomorrow}
            slots={settings.slots}
          />
        }
      />
    </>
  );
}
