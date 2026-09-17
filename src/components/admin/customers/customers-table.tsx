import { getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";
import type { CustomerSort, CustomerStatsRow } from "@/lib/admin/customers/types";
import { formatMoney } from "@/lib/money";
import { DataTable, type Column } from "../shared/data-table";
import { EmptyState } from "../shared/empty-state";
import { SortHeader } from "../shared/sort-header";
import { dateTimeFormat, numberFormat } from "@/lib/number";

interface Props {
  rows: CustomerStatsRow[];
  locale: string;
  currency: string;
  sort: { sort: CustomerSort; dir: "asc" | "desc" };
  query: Record<string, string | undefined>;
}

export async function CustomersTable({ rows, locale, currency, sort, query }: Props) {
  const t = await getTranslations("admin.customers");
  const date = dateTimeFormat(locale, { dateStyle: "medium" });
  const num = numberFormat(locale);
  const basePath = "/admin/customers";
  const columns: Column<CustomerStatsRow>[] = [
    {
      key: "customer",
      header: t("name"),
      cell: (r) => (
        <div className="flex min-w-0 flex-col">
          <Link href={`/admin/customers/${r.id}`} className="truncate font-medium outline-none after:absolute after:inset-0 hover:underline focus-visible:after:rounded-md focus-visible:after:ring-3 focus-visible:after:ring-ring/50">
            {r.full_name ?? r.email}
          </Link>
          <span className="truncate text-xs text-muted-foreground" dir="ltr">
            {r.email}
          </span>
        </div>
      ),
    },
    {
      key: "phone",
      header: t("phone"),
      cell: (r) => (
        <span className="text-muted-foreground tabular-nums" dir="ltr">
          {r.phone ?? "—"}
        </span>
      ),
      hideBelow: "lg",
    },
    {
      key: "orders",
      header: <SortHeader label={t("orders")} sortKey="orders_count" current={sort} basePath={basePath} query={query} className="justify-end" />,
      cell: (r) => <span className="tabular-nums">{num.format(r.orders_count)}</span>,
      className: "text-end",
      hideBelow: "md",
    },
    {
      key: "spent",
      header: <SortHeader label={t("spent")} sortKey="total_spent" current={sort} basePath={basePath} query={query} className="justify-end" />,
      cell: (r) => <span className="font-medium tabular-nums">{formatMoney(r.total_spent, currency, locale)}</span>,
      className: "text-end",
    },
    {
      key: "marketing",
      header: t("marketing"),
      cell: (r) =>
        r.accepts_marketing ? (
          <Badge variant="outline" className="border-transparent bg-emerald-500/10 font-medium text-emerald-700 dark:text-emerald-300">
            {t("marketingYes")}
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">{t("marketingNo")}</span>
        ),
      hideBelow: "lg",
    },
    {
      key: "joined",
      header: <SortHeader label={t("joined")} sortKey="created_at" current={sort} basePath={basePath} query={query} />,
      cell: (r) => <span className="text-muted-foreground tabular-nums">{date.format(new Date(r.created_at))}</span>,
      hideBelow: "md",
    },
  ];
  const tc = await getTranslations("admin.common");
  return <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} linkedRows empty={<EmptyState title={tc("noResults")} description={tc("noResultsHint")} />} />;
}
