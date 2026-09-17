import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CalendarDays, Clock, Package, Receipt, ShoppingBag, TrendingUp } from "lucide-react";
import { AddressCards } from "@/components/admin/customers/address-cards";
import { CustomerDeliveryCard } from "@/components/admin/customers/customer-delivery-card";
import { CustomerForm } from "@/components/admin/customers/customer-form";
import { CustomerInsightsCards } from "@/components/admin/customers/customer-insights";
import { OrdersTable } from "@/components/admin/orders/orders-table";
import { CrumbLabel } from "@/components/admin/shared/crumb-label";
import { KpiCard } from "@/components/admin/shared/kpi-card";
import { PageHeader } from "@/components/admin/shared/page-header";
import { TableSkeleton } from "@/components/admin/shared/table-skeleton";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/shared/pagination";
import { requireAdminPage } from "@/lib/admin/context";
import { getCustomer, getCustomerDeliverySummary, getCustomerInsights } from "@/lib/admin/customers/queries";
import { currentQuery, parseListParams, type SearchParams } from "@/lib/admin/list-params";
import { listOrders, ORDER_SORTS } from "@/lib/admin/orders/queries";
import { can } from "@/lib/auth/permissions";
import { formatMoney } from "@/lib/money";
import { dateTimeFormat, numberFormat } from "@/lib/number";

type Props = PageProps<"/[locale]/admin/customers/[id]">;

/** `[id]` has no static params, so the params read itself is runtime data: keep it under Suspense. */
export default function CustomerPage({ params, searchParams }: Props) {
  return (
    <Suspense fallback={<TableSkeleton />}>
      <Content params={params} searchParams={searchParams} />
    </Suspense>
  );
}

function Card({ title, children }: { title: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-xl border bg-card p-4">
      <h2 className="text-sm font-medium text-muted-foreground">{title}</h2>
      {children}
    </section>
  );
}

async function Content({ params, searchParams }: { params: Props["params"]; searchParams: Props["searchParams"] }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const ctx = await requireAdminPage(locale, "customers.read");
  const sp = (await searchParams) as SearchParams;
  const list = parseListParams(sp, { sorts: ORDER_SORTS, defaultSort: "placed_at", pageSize: 10 });
  const canDelivery = can(ctx.role, "delivery.read");
  const [customer, t, tc] = await Promise.all([getCustomer(ctx.store.id, id), getTranslations("admin"), getTranslations("common")]);
  if (!customer) notFound();
  const [{ rows, total }, delivery, insights] = await Promise.all([
    listOrders(ctx.store.id, { ...list, customerId: customer.id }),
    canDelivery ? getCustomerDeliverySummary(ctx.store.id, customer.id) : Promise.resolve(null),
    getCustomerInsights(ctx.store.id, customer.id),
  ]);
  const date = dateTimeFormat(ctx.locale, { dateStyle: "medium" });
  const num = numberFormat(ctx.locale);
  const query = currentQuery(sp, ["sort", "dir"]);
  const basePath = `/admin/customers/${customer.id}`;
  const name = customer.full_name ?? customer.email;
  const money = (n: number) => formatMoney(n, ctx.store.currency, ctx.locale);
  const lastOrderAt = insights?.last_order_at ?? customer.last_order_at;
  // Whole days since the last order; computed per request (this page is dynamic anyway).
  // eslint-disable-next-line react-hooks/purity
  const daysAgo = lastOrderAt ? Math.max(0, Math.floor((Date.now() - new Date(lastOrderAt).getTime()) / 86_400_000)) : null;

  return (
    <>
      <CrumbLabel segment={customer.id} label={name} />
      <PageHeader
        back={{ href: "/admin/customers", label: t("nav.customers") }}
        title={
          <span className="flex flex-wrap items-center gap-3">
            <span>{name}</span>
            <Badge variant="outline" className="text-sm font-normal">
              {customer.user_id ? t("customers.account") : t("customers.guest")}
            </Badge>
          </span>
        }
        description={
          <span className="flex flex-wrap gap-x-3 gap-y-1">
            <span dir="ltr">{customer.email}</span>
            {customer.phone && (
              <a href={`tel:${customer.phone}`} dir="ltr" className="hover:underline">
                {customer.phone}
              </a>
            )}
            <span>
              {t("customers.joined")}: {date.format(new Date(customer.created_at))}
            </span>
          </span>
        }
      />

      {insights ? (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
            <KpiCard
              label={t("customers.orders")}
              value={num.format(insights.orders_total)}
              hint={t("customers.insights.deliveredOf", { count: insights.delivered })}
              icon={ShoppingBag}
              href="#orders"
            />
            <KpiCard label={t("customers.insights.items")} value={num.format(insights.units)} hint={t("customers.insights.distinctProducts", { count: insights.distinct_products })} icon={Package} />
            <KpiCard label={t("customers.spent")} value={money(insights.spent)} hint={insights.open_value > 0 ? t("customers.insights.plusOpen", { amount: money(insights.open_value) }) : undefined} icon={Receipt} />
            <KpiCard label={t("customers.insights.avgOrder")} value={money(insights.avg_order)} icon={TrendingUp} />
            <KpiCard
              label={t("customers.lastOrder")}
              value={lastOrderAt ? date.format(new Date(lastOrderAt)) : t("customers.never")}
              hint={daysAgo !== null ? t("customers.insights.daysAgo", { count: daysAgo }) : undefined}
              icon={Clock}
            />
            <KpiCard
              label={t("customers.insights.firstOrder")}
              value={insights.first_order_at ? date.format(new Date(insights.first_order_at)) : t("customers.never")}
              hint={insights.avg_days_between !== null ? t("customers.insights.everyDays", { count: Math.round(insights.avg_days_between) }) : undefined}
              icon={CalendarDays}
            />
          </div>
          <CustomerInsightsCards insights={insights} currency={ctx.store.currency} locale={ctx.locale} />
        </>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(11rem,1fr))] gap-3">
          <KpiCard label={t("customers.orders")} value={num.format(customer.orders_count)} icon={ShoppingBag} href="#orders" />
          <KpiCard label={t("customers.spent")} value={money(customer.total_spent)} icon={Receipt} />
          <KpiCard label={t("customers.lastOrder")} value={customer.last_order_at ? date.format(new Date(customer.last_order_at)) : t("customers.never")} icon={Clock} />
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[3fr_2fr]">
        <Card title={t("customers.details")}>
          {/* keyed on updated_at so the uncontrolled inputs remount with fresh defaults after a save + refresh */}
          <CustomerForm key={customer.updated_at} storeId={ctx.store.id} customer={customer} readOnly={!can(ctx.role, "customers.write")} />
        </Card>
        <div className="flex flex-col gap-4">
          <Card title={t("customers.addresses")}>
            <AddressCards addresses={customer.addresses} />
          </Card>
          {delivery && (
            <Card title={t("customers.delivery.title")}>
              <CustomerDeliveryCard summary={delivery} currency={ctx.store.currency} locale={ctx.locale} customerId={customer.id} />
            </Card>
          )}
        </div>
      </div>

      <section id="orders" className="flex scroll-mt-20 flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">{t("customers.ordersTitle")}</h2>
        <OrdersTable rows={rows} locale={ctx.locale} sort={{ sort: list.sort, dir: list.dir }} query={query} basePath={basePath} hideCustomer />
        <Pagination page={list.page} pageSize={list.pageSize} total={total} basePath={basePath} query={query} labels={{ prev: tc("previous"), next: tc("next") }} />
      </section>
      {/* SCOPE(customers): no delete/merge; GROWS LATER → GDPR export/delete */}
    </>
  );
}
