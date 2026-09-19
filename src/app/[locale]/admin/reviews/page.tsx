import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ReviewsTable } from "@/components/admin/reviews/reviews-table";
import { ReviewsTabs } from "@/components/admin/reviews/reviews-tabs";
import { PageHeader } from "@/components/admin/shared/page-header";
import { TabbedPanels } from "@/components/admin/shared/tabbed-panels";
import { TableSkeleton } from "@/components/admin/shared/table-skeleton";
import { Pagination } from "@/components/shared/pagination";
import { requireAdminPage } from "@/lib/admin/context";
import { currentQuery, isPlainList, parseListParams, pickParam, type SearchParams } from "@/lib/admin/list-params";
import { listReviews, reviewCounts } from "@/lib/admin/reviews/queries";
import { REVIEW_STATUSES } from "@/lib/admin/reviews/types";

type Props = PageProps<"/[locale]/admin/reviews">;

export default async function ReviewsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  return (
    <>
      <PageHeader title={t("nav.reviews")} />
      <Suspense fallback={<TableSkeleton />}>
        <ReviewsList locale={locale} searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function ReviewsList({ locale, searchParams }: { locale: string; searchParams: Props["searchParams"] }) {
  const ctx = await requireAdminPage(locale, "reviews.moderate");
  const sp = (await searchParams) as SearchParams;
  const status = pickParam(sp, "status", REVIEW_STATUSES) ?? "pending";
  const { page } = parseListParams(sp, { sorts: ["created_at"] as const });
  const listOpts = { locale: ctx.locale, fallback: ctx.store.default_locale };
  const plain = isPlainList(sp, ["status"]);
  // Fast path: counts + page 1 of all three moderation buckets in ONE wave; tabs switch client-side.
  const [counts, t, ta, ...pages] = await Promise.all([
    reviewCounts(ctx.store.id),
    getTranslations("common"),
    getTranslations("admin"),
    ...(plain ? REVIEW_STATUSES.map((s) => listReviews(ctx.store.id, { status: s, page: 1, ...listOpts })) : []),
  ]);
  const labels = { prev: t("previous"), next: t("next"), range: t.raw("range") as string };

  if (plain) {
    const panels = REVIEW_STATUSES.map((s, i) => ({
      value: s,
      label: ta(`status.review.${s}`),
      count: counts[s] ?? 0,
      content: (
        <>
          <ReviewsTable rows={pages[i].rows} storeId={ctx.store.id} locale={ctx.locale} status={s} />
          <Pagination page={1} pageSize={pages[i].pageSize} total={pages[i].total} basePath="/admin/reviews" query={{ status: s === "pending" ? undefined : s }} labels={labels} />
        </>
      ),
    }));
    return <TabbedPanels label={ta("common.status")} param="status" defaultValue="pending" initial={status} panels={panels} />;
  }

  const { rows, total, pageSize } = await listReviews(ctx.store.id, { status, page, ...listOpts });
  const query = currentQuery(sp, ["status"]);
  return (
    <>
      <ReviewsTabs counts={counts} current={status} />
      <ReviewsTable rows={rows} storeId={ctx.store.id} locale={ctx.locale} status={status} />
      <Pagination page={page} pageSize={pageSize} total={total} basePath="/admin/reviews" query={query} labels={labels} />
    </>
  );
}
