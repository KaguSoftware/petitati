import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { OrdersFilters, OrdersToolbar } from "@/components/admin/orders/orders-filters";
import { OrdersTable } from "@/components/admin/orders/orders-table";
import { PageHeader } from "@/components/admin/shared/page-header";
import { TabbedPanels } from "@/components/admin/shared/tabbed-panels";
import { TableSkeleton } from "@/components/admin/shared/table-skeleton";
import { Pagination } from "@/components/shared/pagination";
import { requireAdminPage } from "@/lib/admin/context";
import { getCourier, listCouriers, storeToday } from "@/lib/admin/delivery/queries";
import { can } from "@/lib/auth/permissions";
import { currentQuery, isPlainList, parseListParams, pickParam, stringParam, type SearchParams } from "@/lib/admin/list-params";
import { listOrders, orderStatusCounts, ORDER_SORTS } from "@/lib/admin/orders/queries";
import { ORDER_STATUSES } from "@/lib/admin/orders/transitions";
import { uuidField } from "@/lib/admin/validate";
import { deliveryFromSettings } from "@/lib/delivery/settings";

type Props = PageProps<"/[locale]/admin/orders">;

export default async function OrdersPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  return (
    <>
      <PageHeader title={t("nav.orders")} />
      <Suspense fallback={<TableSkeleton />}>
        <OrdersList locale={locale} searchParams={searchParams} />
      </Suspense>
    </>
  );
}

const BUCKETS = ["all", ...ORDER_STATUSES] as const;

async function OrdersList({ locale, searchParams }: { locale: string; searchParams: Props["searchParams"] }) {
  const ctx = await requireAdminPage(locale, "orders.read");
  const sp = (await searchParams) as SearchParams;
  const list = parseListParams(sp, { sorts: ORDER_SORTS, defaultSort: "placed_at" });
  const status = pickParam(sp, "status", ORDER_STATUSES);
  const from = stringParam(sp, "from", 10);
  const to = stringParam(sp, "to", 10);
  const rawCourier = stringParam(sp, "courier", 36);
  const courierId = rawCourier && uuidField.safeParse(rawCourier).success ? rawCourier : undefined;
  // Selection is pointless without the permission the bulk action checks server-side anyway.
  const canUpdate = can(ctx.role, "orders.update");
  const canAssign = canUpdate && can(ctx.role, "delivery.assign");
  const settings = deliveryFromSettings(ctx.store.settings);
  const today = storeToday(ctx.store.timezone);
  const tomorrow = storeToday(ctx.store.timezone, settings.leadDays);
  const couriersPromise = canAssign ? listCouriers(ctx.store.id, false) : Promise.resolve([]);

  // Fast path: no search/date/page/sort → load page 1 of EVERY status bucket in one wave and
  // switch tabs client-side (instant). Any other filter falls back to server-driven paging.
  if (isPlainList(sp, ["status"])) {
    // Counts and every bucket in ONE wave (an empty bucket is a cheap indexed query).
    const [counts, couriers, ta, tc, ...pages] = await Promise.all([
      orderStatusCounts(ctx.store.id),
      couriersPromise,
      getTranslations("admin"),
      getTranslations("common"),
      ...BUCKETS.map((b) => listOrders(ctx.store.id, { ...list, status: b === "all" ? undefined : b, from, to })),
    ]);
    const labels = { prev: tc("previous"), next: tc("next"), range: tc.raw("range") as string };
    const courierOptions = couriers.map((c) => ({ id: c.id, name: c.name }));
    const panels = BUCKETS.map((b, i) => {
      const query = { status: b === "all" ? undefined : b };
      return {
        value: b,
        label: b === "all" ? ta("common.all") : ta(`status.order.${b}`),
        count: counts[b] ?? 0,
        content: (
          <>
            <OrdersTable
              rows={pages[i].rows}
              locale={ctx.locale}
              sort={{ sort: list.sort, dir: list.dir }}
              query={query}
              storeId={canUpdate ? ctx.store.id : undefined}
              scope={canUpdate ? `orders:${b}` : undefined}
              couriers={canAssign ? courierOptions : undefined}
              today={today}
              tomorrow={tomorrow}
            />
            <Pagination page={1} pageSize={list.pageSize} total={pages[i].total} basePath="/admin/orders" query={query} labels={labels} />
          </>
        ),
      };
    });
    return (
      <TabbedPanels label={ta("common.status")} param="status" defaultValue="all" initial={status ?? "all"} panels={panels}>
        <OrdersToolbar />
      </TabbedPanels>
    );
  }

  const [{ rows, total }, counts, couriers, courier, tc] = await Promise.all([
    listOrders(ctx.store.id, { ...list, status, from, to, courierId }),
    orderStatusCounts(ctx.store.id),
    couriersPromise,
    courierId ? getCourier(ctx.store.id, courierId) : Promise.resolve(null),
    getTranslations("common"),
  ]);
  const labels = { prev: tc("previous"), next: tc("next"), range: tc.raw("range") as string };
  const query = currentQuery(sp, ["q", "status", "from", "to", "sort", "dir", "courier"]);
  return (
    <>
      <OrdersFilters counts={counts} current={status} courier={courier ? { id: courier.id, name: courier.name } : undefined} />
      <OrdersTable
        rows={rows}
        locale={ctx.locale}
        sort={{ sort: list.sort, dir: list.dir }}
        query={query}
        storeId={canUpdate ? ctx.store.id : undefined}
        scope={canUpdate ? `orders:${status ?? "all"}` : undefined}
        couriers={canAssign ? couriers.map((c) => ({ id: c.id, name: c.name })) : undefined}
        today={today}
        tomorrow={tomorrow}
      />
      <Pagination page={list.page} pageSize={list.pageSize} total={total} basePath="/admin/orders" query={query} labels={labels} />
    </>
  );
}
