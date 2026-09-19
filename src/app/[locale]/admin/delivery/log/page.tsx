import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/admin/shared/page-header";
import { TableSkeleton } from "@/components/admin/shared/table-skeleton";
import { DeliveryLogFilters } from "@/components/admin/delivery/delivery-log-filters";
import { DeliveryLogTable } from "@/components/admin/delivery/delivery-log-table";
import { Pagination } from "@/components/shared/pagination";
import { requireAdminPage } from "@/lib/admin/context";
import { listCouriers, listDeliveryEvents } from "@/lib/admin/delivery/queries";
import { LOG_EVENT_TYPES } from "@/lib/admin/delivery/log-types";
import { currentQuery, parseListParams, pickParam, stringParam, type SearchParams } from "@/lib/admin/list-params";
import { uuidField } from "@/lib/admin/validate";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type Props = PageProps<"/[locale]/admin/delivery/log">;

export default async function DeliveryLogPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  return (
    <>
      <PageHeader back={{ href: "/admin/delivery", label: t("nav.delivery") }} title={t("delivery.log.title")} description={t("delivery.log.hint")} />
      <Suspense fallback={<TableSkeleton />}>
        <Log locale={locale} searchParams={searchParams} />
      </Suspense>
    </>
  );
}

const isUuid = (v: string | undefined) => (v && uuidField.safeParse(v).success ? v : undefined);

async function Log({ locale, searchParams }: { locale: string; searchParams: Props["searchParams"] }) {
  const ctx = await requireAdminPage(locale, "delivery.read");
  const sp = (await searchParams) as SearchParams;
  const list = parseListParams(sp, { sorts: ["created_at"], defaultSort: "created_at", pageSize: 50 });
  const courierId = isUuid(stringParam(sp, "courier", 36));
  const orderId = isUuid(stringParam(sp, "order", 36));
  const type = pickParam(sp, "type", LOG_EVENT_TYPES);
  const db = createSupabaseAdminClient();
  const [{ rows, total }, couriers, order, tc] = await Promise.all([
    listDeliveryEvents(ctx.store.id, list, { courierId, orderId, types: type ? [type] : undefined }),
    listCouriers(ctx.store.id),
    orderId ? db.from("orders").select("id, number").eq("store_id", ctx.store.id).eq("id", orderId).maybeSingle<{ id: string; number: string }>() : Promise.resolve({ data: null }),
    getTranslations("common"),
  ]);
  const query = currentQuery(sp, ["courier", "order", "type"]);
  return (
    <>
      <DeliveryLogFilters couriers={couriers.map((c) => ({ id: c.id, name: c.name }))} courierId={courierId} type={type} order={order.data ?? undefined} />
      <DeliveryLogTable rows={rows} locale={ctx.locale} />
      <Pagination page={list.page} pageSize={list.pageSize} total={total} basePath="/admin/delivery/log" query={query} labels={{ prev: tc("previous"), next: tc("next"), range: tc.raw("range") as string }} />
    </>
  );
}
