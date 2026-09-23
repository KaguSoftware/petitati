import { ImageIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { ProductListRow, ProductSort } from "@/lib/admin/products/types";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import { DataTable, type Column } from "../shared/data-table";
import { EmptyState } from "../shared/empty-state";
import { SortHeader } from "../shared/sort-header";
import { ProductRowActions, VisibilityToggle } from "./product-row-controls";
import { numberFormat } from "@/lib/number";

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
  const basePath = "/admin/products";
  const price = (r: ProductListRow) => {
    if (r.priceMin == null || r.priceMax == null) return <span className="text-muted-foreground">—</span>;
    const min = formatMoney(r.priceMin, currency, locale);
    return r.priceMin === r.priceMax ? min : `${min} – ${formatMoney(r.priceMax, currency, locale)}`;
  };
  // Kept to what staff scan for: which product, is it on the site, price, stock. Featured,
  // best seller, categories and dates live on the product page; the table must fit without
  // sideways scrolling, so the name wraps to two lines instead of widening the table.
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
            <span className="line-clamp-2 font-medium whitespace-normal group-hover:underline">{r.name}</span>
            {r.brandName && <span className="truncate text-xs text-muted-foreground">{r.brandName}</span>}
          </span>
        </Link>
      ),
      className: "w-full min-w-44",
    },
    { key: "status", header: t("products.visibility.header"), cell: (r) => <VisibilityToggle storeId={storeId} productId={r.id} status={r.status} disabled={!canWrite} /> },
    { key: "price", header: t("products.price"), cell: (r) => <span className="tabular-nums whitespace-nowrap">{price(r)}</span>, hideBelow: "sm" },
    {
      key: "stock",
      header: t("products.stock"),
      cell: (r) =>
        r.tracksStock ? (
          <span className={cn("tabular-nums", r.stockTotal <= 0 ? "font-medium text-destructive" : r.stockTotal <= lowStockThreshold && "font-medium text-amber-700 dark:text-amber-300")}>{num.format(r.stockTotal)}</span>
        ) : (
          <span className="text-xs text-muted-foreground">{t("products.untracked")}</span>
        ),
      className: "text-end",
      hideBelow: "md",
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
