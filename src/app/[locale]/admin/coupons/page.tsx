import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { NewCouponButton } from "@/components/admin/coupons/coupon-dialog";
import { CouponsTable } from "@/components/admin/coupons/coupons-table";
import { CouponsToolbar } from "@/components/admin/coupons/coupons-toolbar";
import { PageHeader } from "@/components/admin/shared/page-header";
import { TableSkeleton } from "@/components/admin/shared/table-skeleton";
import { Pagination } from "@/components/shared/pagination";
import { requireAdminPage } from "@/lib/admin/context";
import { listCoupons } from "@/lib/admin/coupons/queries";
import { COUPON_SORTS } from "@/lib/admin/coupons/types";
import { currentQuery, parseListParams, type SearchParams } from "@/lib/admin/list-params";

type Props = PageProps<"/[locale]/admin/coupons">;

export default async function CouponsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  return (
    <>
      <PageHeader title={t("nav.coupons")} />
      <Suspense fallback={<TableSkeleton />}>
        <CouponsList locale={locale} searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function CouponsList({ locale, searchParams }: { locale: string; searchParams: Props["searchParams"] }) {
  const ctx = await requireAdminPage(locale, "coupons.manage");
  const sp = (await searchParams) as SearchParams;
  const list = parseListParams(sp, { sorts: COUPON_SORTS, defaultSort: "created_at" });
  const [{ rows, total }, t] = await Promise.all([listCoupons(ctx.store.id, list), getTranslations("common")]);
  const now = new Date(); // after the runtime reads above (Cache Components)
  const query = currentQuery(sp, ["q", "sort", "dir"]);
  return (
    <>
      <CouponsToolbar storeId={ctx.store.id} currency={ctx.store.currency} />
      <CouponsTable
        rows={rows}
        storeId={ctx.store.id}
        locale={ctx.locale}
        currency={ctx.store.currency}
        now={now}
        sort={{ sort: list.sort, dir: list.dir }}
        query={query}
        emptyAction={list.q ? undefined : <NewCouponButton storeId={ctx.store.id} currency={ctx.store.currency} />}
      />
      <Pagination page={list.page} pageSize={list.pageSize} total={total} basePath="/admin/coupons" query={query} labels={{ prev: t("previous"), next: t("next"), range: t.raw("range") as string }} />
    </>
  );
}
