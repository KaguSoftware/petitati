import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { MovementsFilters } from "@/components/admin/inventory/movements-filters";
import { MovementsTable } from "@/components/admin/inventory/movements-table";
import { PageHeader } from "@/components/admin/shared/page-header";
import { TableSkeleton } from "@/components/admin/shared/table-skeleton";
import { Pagination } from "@/components/shared/pagination";
import { requireAdminPage } from "@/lib/admin/context";
import { getVariantLabel, listMovements } from "@/lib/admin/inventory/queries";
import { ALL_STOCK_REASONS } from "@/lib/admin/inventory/types";
import { currentQuery, parseListParams, pickParam, stringParam, type SearchParams } from "@/lib/admin/list-params";

type Props = PageProps<"/[locale]/admin/inventory/movements">;

export default async function MovementsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  return (
    <>
      <PageHeader back={{ href: "/admin/inventory", label: t("nav.inventory") }} title={t("crumbs.movements")} description={t("inventory.movementsHint")} />
      <Suspense fallback={<TableSkeleton />}>
        <MovementsList locale={locale} searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function MovementsList({ locale, searchParams }: { locale: string; searchParams: Props["searchParams"] }) {
  const ctx = await requireAdminPage(locale, "inventory.read");
  const sp = (await searchParams) as SearchParams;
  const list = parseListParams(sp, { sorts: ["created_at"] as const, pageSize: 50 });
  const reason = pickParam(sp, "reason", ALL_STOCK_REASONS);
  const variantId = stringParam(sp, "variant", 36);
  const fallback = ctx.store.default_locale;
  const [{ rows, total }, variantFilter, t] = await Promise.all([
    listMovements(ctx.store.id, { variantId, reason, page: list.page, pageSize: list.pageSize, range: list.range, locale: ctx.locale, fallback }),
    variantId ? getVariantLabel(ctx.store.id, variantId, ctx.locale, fallback) : Promise.resolve(null),
    getTranslations("common"),
  ]);
  const query = currentQuery(sp, ["reason", "variant"]);
  return (
    <>
      <MovementsFilters reason={reason} variantFilter={variantFilter} />
      <MovementsTable rows={rows} locale={ctx.locale} />
      <Pagination page={list.page} pageSize={list.pageSize} total={total} basePath="/admin/inventory/movements" query={query} labels={{ prev: t("previous"), next: t("next"), range: t.raw("range") as string }} />
    </>
  );
}
