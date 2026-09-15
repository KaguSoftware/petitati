import { ImageIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { ProductListRow, ProductSort } from "@/lib/admin/products/types";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import { DataTable, type Column } from "../shared/data-table";
import { EmptyState } from "../shared/empty-state";
import { SortHeader } from "../shared/sort-header";
import { OptimisticStatusBadge } from "../shared/optimistic-status-badge";
import { BestsellerSwitch, FeaturedSwitch, ProductRowActions } from "./product-row-controls";
import { dateTimeFormat, numberFormat } from "@/lib/number";

interface Props {
  rows: ProductListRow[];
  storeId: string;
  locale: string;
  currency: string;
  lowStockThreshold: number;
  canWrite: boolean;
  sort: { sort: ProductSort; dir: "asc" | "desc" };
  query: Record<string, string | undefined>;
  emptyAction?: React.ReactNode;
}

export async function ProductsTable({ rows, storeId, locale, currency, lowStockThreshold, canWrite, sort, query, emptyAction }: Props) {
  const t = await getTranslations("admin");
  const num = numberFormat(locale);
  const date = dateTimeFormat(locale, { dateStyle: "medium" });
  const basePath = "/admin/products";
  const price = (r: ProductListRow) => {
    if (r.priceMin == null || r.priceMax == null) return <span className="text-muted-foreground">—</span>;
    const min = formatMoney(r.priceMin, currency, locale);
    return r.priceMin === r.priceMax ? min : `${min} – ${formatMoney(r.priceMax, currency, locale)}`;
  };
  const columns: Column<ProductListRow>[] = [
    {
      key: "name",
      header: <SortHeader label={t("products.name")} sortKey="name" current={sort} basePath={basePath} query={query} />,
      cell: (r) => (
        <Link href={`/admin/products/${r.id}`} className="group flex min-w-0 items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-md border bg-muted text-muted-foreground">
            {r.thumbnail ? (
              // eslint-disable-next-line @next/next/no-img-element -- admin thumbnails come from arbitrary storage hosts
              <img src={r.thumbnail} alt="" className="size-full object-cover" loading="lazy" />
            ) : (
              <ImageIcon className="size-4" />
            )}
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="truncate font-medium group-hover:underline">{r.name}</span>
            <span className="truncate text-xs text-muted-foreground" dir="ltr">
              /{r.slug}
            </span>
          </span>
        </Link>
      ),
    },
    { key: "status", header: t("common.status"), cell: (r) => <OptimisticStatusBadge id={r.id} kind="product" value={r.status} /> },
    { key: "price", header: t("products.price"), cell: (r) => <span className="tabular-nums whitespace-nowrap">{price(r)}</span>, hideBelow: "md" },
    {
      key: "stock",
      header: t("products.stock"),
      cell: (r) =>
        r.tracksStock ? (
          <span className={cn("tabular-nums", r.stockTotal <= 0 ? "font-medium text-destructive" : r.stockTotal <= lowStockThreshold && "font-medium text-amber-700 dark:text-amber-300")}>
            {num.format(r.stockTotal)}
            <span className="ms-1 text-xs font-normal text-muted-foreground">{t("products.variantsCount", { count: r.variantCount })}</span>
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">{t("products.untracked")}</span>
        ),
      className: "text-end",
      hideBelow: "sm",
    },
    { key: "brand", header: t("products.brand"), cell: (r) => <span className="text-muted-foreground">{r.brandName ?? "—"}</span>, hideBelow: "lg" },
    {
      key: "categories",
      header: t("products.categories"),
      cell: (r) => <span className="line-clamp-2 text-muted-foreground">{r.categoryNames.length ? r.categoryNames.join(", ") : "—"}</span>,
      hideBelow: "lg",
    },
    {
      key: "updated",
      header: <SortHeader label={t("products.updated")} sortKey="updated_at" current={sort} basePath={basePath} query={query} />,
      cell: (r) => <span className="text-muted-foreground tabular-nums whitespace-nowrap">{date.format(new Date(r.updated_at))}</span>,
      hideBelow: "xl",
    },
    {
      key: "featured",
      header: t("products.featured"),
      cell: (r) => <FeaturedSwitch storeId={storeId} productId={r.id} checked={r.is_featured} disabled={!canWrite} />,
      className: "text-center",
      hideBelow: "md",
    },
    {
      key: "bestseller",
      header: t("products.bestseller"),
      cell: (r) => <BestsellerSwitch storeId={storeId} productId={r.id} checked={r.is_bestseller} disabled={!canWrite} />,
      className: "text-center",
      hideBelow: "lg",
    },
    ...(canWrite
      ? [
          {
            key: "actions",
            header: <span className="sr-only">{t("common.actions")}</span>,
            cell: (r: ProductListRow) => <ProductRowActions storeId={storeId} productId={r.id} status={r.status} slug={r.slug} locale={locale} />,
            className: "w-10 text-end",
          } satisfies Column<ProductListRow>,
        ]
      : []),
  ];
  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(r) => r.id}
      empty={<EmptyState title={t("common.noResults")} description={t("products.emptyHint")} action={emptyAction} />}
    />
  );
}
