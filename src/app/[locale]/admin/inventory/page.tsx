import { History } from "lucide-react";
import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LowStockBanner } from "@/components/admin/inventory/low-stock-banner";
import { StockFilters } from "@/components/admin/inventory/stock-controls";
import { StockTable } from "@/components/admin/inventory/stock-table";
import { PageHeader } from "@/components/admin/shared/page-header";
import { TableSkeleton } from "@/components/admin/shared/table-skeleton";
import { Pagination } from "@/components/shared/pagination";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { requireAdminPage } from "@/lib/admin/context";
import { listStock, lowStockCount } from "@/lib/admin/inventory/queries";
import { STOCK_SORTS } from "@/lib/admin/inventory/types";
import { currentQuery, parseListParams, stringParam, type SearchParams } from "@/lib/admin/list-params";
import { can } from "@/lib/auth/permissions";

type Props = PageProps<"/[locale]/admin/inventory">;

export default async function InventoryPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  return (
    <>
      <PageHeader
        title={t("nav.inventory")}
        description={t("inventory.subtitle")}
        actions={
          <Link href="/admin/inventory/movements" className={buttonVariants({ variant: "outline" })}>
            <History data-icon="inline-start" />
            {t("crumbs.movements")}
          </Link>
        }
      />
      <Suspense fallback={<TableSkeleton />}>
        <StockList locale={locale} searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function StockList({ locale, searchParams }: { locale: string; searchParams: Props["searchParams"] }) {
  const ctx = await requireAdminPage(locale, "inventory.read");
  const sp = (await searchParams) as SearchParams;
  const list = parseListParams(sp, { sorts: STOCK_SORTS, defaultSort: "stock_qty", defaultDir: "asc" });
  const lowOnly = stringParam(sp, "low", 1) === "1";
  const threshold = ctx.store.low_stock_threshold;
  const [{ rows, total }, low, t] = await Promise.all([
    listStock(ctx.store.id, { ...list, lowOnly, threshold, locale: ctx.locale, fallback: ctx.store.default_locale }),
    lowStockCount(ctx.store.id),
    getTranslations("common"),
  ]);
  const query = currentQuery(sp, ["q", "low", "sort", "dir"]);
  return (
    <>
      {!lowOnly && <LowStockBanner count={low} threshold={threshold} locale={ctx.locale} />}
      <StockFilters lowOnly={lowOnly} />
      <StockTable
        rows={rows}
        storeId={ctx.store.id}
        locale={ctx.locale}
        canAdjust={can(ctx.role, "inventory.adjust")}
        canWrite={can(ctx.role, "products.write")}
        sort={{ sort: list.sort, dir: list.dir }}
        query={query}
        lowOnly={lowOnly}
      />
      <Pagination page={list.page} pageSize={list.pageSize} total={total} basePath="/admin/inventory" query={query} labels={{ prev: t("previous"), next: t("next"), range: t.raw("range") as string }} />
    </>
  );
}
