import { BadgeCheck, FolderTree, Plus } from "lucide-react";
import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ProductsFilters, ProductsToolbar } from "@/components/admin/products/products-filters";
import { ProductsTable } from "@/components/admin/products/products-table";
import { PageHeader } from "@/components/admin/shared/page-header";
import { TabbedPanels } from "@/components/admin/shared/tabbed-panels";
import { TableSkeleton } from "@/components/admin/shared/table-skeleton";
import { Pagination } from "@/components/shared/pagination";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { listBrandOptions } from "@/lib/admin/brands/queries";
import { requireAdminPage } from "@/lib/admin/context";
import { currentQuery, isPlainList, parseListParams, pickParam, stringParam, type SearchParams } from "@/lib/admin/list-params";
import { listCategoryOptions, listProducts, productStatusCounts } from "@/lib/admin/products/queries";
import { PRODUCT_SORTS, PRODUCT_STATUSES } from "@/lib/admin/products/types";
import { can } from "@/lib/auth/permissions";

type Props = PageProps<"/[locale]/admin/products">;

export default async function ProductsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  return (
    <>
      <PageHeader
        title={t("nav.products")}
        actions={
          <>
            <Link href="/admin/products/categories" className={buttonVariants({ variant: "outline" })}>
              <FolderTree data-icon="inline-start" />
              {t("crumbs.categories")}
            </Link>
            <Link href="/admin/products/brands" className={buttonVariants({ variant: "outline" })}>
              <BadgeCheck data-icon="inline-start" />
              {t("crumbs.brands")}
            </Link>
            <Link href="/admin/products/new" className={buttonVariants()}>
              <Plus data-icon="inline-start" />
              {t("products.new")}
            </Link>
          </>
        }
      />
      <Suspense fallback={<TableSkeleton />}>
        <ProductsList locale={locale} searchParams={searchParams} />
      </Suspense>
    </>
  );
}

const BUCKETS = ["all", ...PRODUCT_STATUSES] as const;

async function ProductsList({ locale, searchParams }: { locale: string; searchParams: Props["searchParams"] }) {
  const ctx = await requireAdminPage(locale, "products.read");
  const sp = (await searchParams) as SearchParams;
  const list = parseListParams(sp, { sorts: PRODUCT_SORTS, defaultSort: "updated_at" });
  const status = pickParam(sp, "status", PRODUCT_STATUSES);
  const categoryId = stringParam(sp, "category", 36);
  const brandId = stringParam(sp, "brand", 36);
  const fallback = ctx.store.default_locale;
  const canWrite = can(ctx.role, "products.write");
  const tableProps = { storeId: ctx.store.id, locale: ctx.locale, currency: ctx.store.currency, lowStockThreshold: ctx.store.low_stock_threshold, canWrite, sort: { sort: list.sort, dir: list.dir } };
  const plain = isPlainList(sp, ["status"]);
  // Fast path: nothing but `status` in the URL → counts + page 1 of every bucket in ONE wave, tabs
  // switch client-side. Search/category/page/sort fall back to server-driven paging.
  const [counts, categories, brands, t, ta, ...pages] = await Promise.all([
    productStatusCounts(ctx.store.id),
    listCategoryOptions(ctx.store.id, ctx.locale, fallback),
    listBrandOptions(ctx.store.id),
    getTranslations("common"),
    getTranslations("admin"),
    ...(plain ? BUCKETS.map((b) => listProducts(ctx.store.id, { ...list, status: b === "all" ? undefined : b, locale: ctx.locale, fallback })) : []),
  ]);
  const labels = { prev: t("previous"), next: t("next"), range: t.raw("range") as string };

  if (plain) {
    const panels = BUCKETS.map((b, i) => {
      const query = { status: b === "all" ? undefined : b };
      return {
        value: b,
        label: b === "all" ? ta("common.all") : ta(`status.product.${b}`),
        count: counts[b] ?? 0,
        content: (
          <>
            <ProductsTable rows={pages[i].rows} {...tableProps} query={query} />
            <Pagination page={1} pageSize={list.pageSize} total={pages[i].total} basePath="/admin/products" query={query} labels={labels} />
          </>
        ),
      };
    });
    return (
      <TabbedPanels label={ta("common.status")} param="status" defaultValue="all" initial={status ?? "all"} panels={panels}>
        <ProductsToolbar categories={categories} brands={brands} />
      </TabbedPanels>
    );
  }

  const { rows, total } = await listProducts(ctx.store.id, { ...list, status, categoryId, brandId, locale: ctx.locale, fallback });
  const query = currentQuery(sp, ["q", "status", "category", "brand", "sort", "dir"]);
  return (
    <>
      <ProductsFilters counts={counts} status={status} categoryId={categoryId} categories={categories} brandId={brandId} brands={brands} />
      <ProductsTable rows={rows} {...tableProps} query={query} />
      <Pagination page={list.page} pageSize={list.pageSize} total={total} basePath="/admin/products" query={query} labels={labels} />
    </>
  );
}
