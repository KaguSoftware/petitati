import { Plus } from "lucide-react";
import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ExpenseCategories } from "@/components/admin/finance/expense-categories";
import { ExpenseDialog } from "@/components/admin/finance/expense-dialog";
import { ExpensesFilters } from "@/components/admin/finance/expenses-filters";
import { ExpensesTable } from "@/components/admin/finance/expenses-table";
import { PageHeader } from "@/components/admin/shared/page-header";
import { TableSkeleton } from "@/components/admin/shared/table-skeleton";
import { Pagination } from "@/components/shared/pagination";
import { Button } from "@/components/ui/button";
import { requireAdminPage } from "@/lib/admin/context";
import { listExpenseCategories, listExpenses, resolveDateRange } from "@/lib/admin/finance/queries";
import { EXPENSE_SORTS } from "@/lib/admin/finance/types";
import { currentQuery, parseListParams, stringParam, type SearchParams } from "@/lib/admin/list-params";
import { can } from "@/lib/auth/permissions";

type Props = PageProps<"/[locale]/admin/finance/expenses">;

export default async function ExpensesPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  return (
    <>
      <PageHeader title={t("crumbs.expenses")} description={t("finance.expensesSubtitle")} back={{ href: "/admin/finance", label: t("nav.finance") }} />
      <Suspense fallback={<TableSkeleton />}>
        <Content locale={locale} searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Content({ locale, searchParams }: { locale: string; searchParams: Props["searchParams"] }) {
  const ctx = await requireAdminPage(locale, "finance.read");
  const sp = (await searchParams) as SearchParams;
  const list = parseListParams(sp, { sorts: EXPENSE_SORTS, defaultSort: "spent_on" });
  const category = stringParam(sp, "category", 40);
  const { from, to } = resolveDateRange(sp);
  const [{ rows, total }, categories, t, tc] = await Promise.all([
    listExpenses(ctx.store.id, { ...list, from, to, categoryId: category }),
    listExpenseCategories(ctx.store.id),
    getTranslations("admin.finance"),
    getTranslations("common"),
  ]);
  const query = currentQuery(sp, ["q", "category", "from", "to", "sort", "dir"]);
  const canWrite = can(ctx.role, "finance.write");
  const currency = ctx.store.currency;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
      <div className="flex min-w-0 flex-col gap-4">
        <ExpensesFilters categories={categories} current={category}>
          {canWrite && (
            <ExpenseDialog
              storeId={ctx.store.id}
              currency={currency}
              categories={categories}
              trigger={
                <Button size="sm">
                  <Plus data-icon="inline-start" />
                  {t("addExpense")}
                </Button>
              }
            />
          )}
        </ExpensesFilters>
        <ExpensesTable rows={rows} locale={ctx.locale} currency={currency} storeId={ctx.store.id} categories={categories} sort={{ sort: list.sort, dir: list.dir }} query={query} canWrite={canWrite} />
        <Pagination page={list.page} pageSize={list.pageSize} total={total} basePath="/admin/finance/expenses" query={query} labels={{ prev: tc("previous"), next: tc("next"), range: tc.raw("range") as string }} />
      </div>
      {canWrite && <ExpenseCategories storeId={ctx.store.id} categories={categories} />}
    </div>
  );
}
