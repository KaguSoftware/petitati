import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CustomersFilters } from "@/components/admin/customers/customers-filters";
import { CustomersTable } from "@/components/admin/customers/customers-table";
import { PageHeader } from "@/components/admin/shared/page-header";
import { TableSkeleton } from "@/components/admin/shared/table-skeleton";
import { Pagination } from "@/components/shared/pagination";
import { requireAdminPage } from "@/lib/admin/context";
import { listCustomers } from "@/lib/admin/customers/queries";
import { CUSTOMER_SORTS, MARKETING_FILTERS } from "@/lib/admin/customers/types";
import { currentQuery, parseListParams, pickParam, type SearchParams } from "@/lib/admin/list-params";

type Props = PageProps<"/[locale]/admin/customers">;

export default async function CustomersPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  return (
    <>
      <PageHeader title={t("nav.customers")} />
      <Suspense fallback={<TableSkeleton />}>
        <CustomersList locale={locale} searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function CustomersList({ locale, searchParams }: { locale: string; searchParams: Props["searchParams"] }) {
  const ctx = await requireAdminPage(locale, "customers.read");
  const sp = (await searchParams) as SearchParams;
  const list = parseListParams(sp, { sorts: CUSTOMER_SORTS, defaultSort: "created_at" });
  const marketing = pickParam(sp, "marketing", MARKETING_FILTERS);
  const [{ rows, total }, t] = await Promise.all([listCustomers(ctx.store.id, { ...list, marketing }), getTranslations("common")]);
  const query = currentQuery(sp, ["q", "marketing", "sort", "dir"]);
  return (
    <>
      <CustomersFilters marketing={marketing} />
      <CustomersTable rows={rows} locale={ctx.locale} currency={ctx.store.currency} sort={{ sort: list.sort, dir: list.dir }} query={query} />
      <Pagination page={list.page} pageSize={list.pageSize} total={total} basePath="/admin/customers" query={query} labels={{ prev: t("previous"), next: t("next"), range: t.raw("range") as string }} />
    </>
  );
}
