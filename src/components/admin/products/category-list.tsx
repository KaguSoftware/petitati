"use client";

import { ChevronDown, ChevronUp, CornerDownRight, FolderTree, ImageIcon, Pencil, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/i18n/config";
import { Link } from "@/i18n/navigation";
import { reorderCategoriesAction } from "@/lib/admin/products/actions";
import type { CategoryAdminRow, CategoryOption } from "@/lib/admin/products/types";
import { numberFormat } from "@/lib/number";
import { DataTable, type Column } from "../shared/data-table";
import { EmptyState } from "../shared/empty-state";
import { StatusBadge } from "../shared/status-badge";
import { useOptimisticAction } from "../shared/use-optimistic-action";
import { CategoryDeleteButton, CategoryDialog } from "./category-dialog";

interface Props {
  rows: CategoryAdminRow[];
  storeId: string;
  locale: Locale;
  defaultLocale: Locale;
  enabledLocales: Locale[];
  canWrite: boolean;
}

type TreeRow = CategoryAdminRow & { depth: number; parentKey: string | null; siblingIndex: number; siblingCount: number };

const bySort = (a: CategoryAdminRow, b: CategoryAdminRow) => a.sort_order - b.sort_order || a.name.localeCompare(b.name);

/** Orders categories as a tree (parents first, children indented right after), siblings by sort order. */
function treeOrder(rows: CategoryAdminRow[]): TreeRow[] {
  const ids = new Set(rows.map((r) => r.id));
  const byParent = new Map<string | null, CategoryAdminRow[]>();
  // A parent from another store (or deleted) counts as top level.
  for (const r of rows) {
    const key = r.parent_id && ids.has(r.parent_id) ? r.parent_id : null;
    byParent.set(key, [...(byParent.get(key) ?? []), r]);
  }
  const out: TreeRow[] = [];
  const seen = new Set<string>();
  const walk = (parent: string | null, depth: number) => {
    const kids = (byParent.get(parent) ?? []).sort(bySort);
    kids.forEach((r, i) => {
      if (seen.has(r.id)) return;
      seen.add(r.id);
      out.push({ ...r, depth, parentKey: parent, siblingIndex: i, siblingCount: kids.length });
      walk(r.id, depth + 1);
    });
  };
  walk(null, 0);
  return out;
}

/**
 * The category tree. Every row has "+ Subcategory" (opens the dialog with this row as parent) and
 * up/down arrows that move it among its siblings; the order is local state so a move paints
 * instantly and rolls back if the server refuses.
 */
export function CategoryList({ rows: serverRows, storeId, locale, defaultLocale, enabledLocales, canWrite }: Props) {
  const t = useTranslations("admin");
  const num = numberFormat(locale);
  const [rows, setRows] = useState(serverRows);
  const [seen, setSeen] = useState(serverRows);
  if (seen !== serverRows) {
    setSeen(serverRows);
    setRows(serverRows);
  }
  const { run } = useOptimisticAction("admin.products");
  const parents: CategoryOption[] = rows.map((r) => ({ id: r.id, name: r.name, parentId: r.parent_id }));
  const ordered = treeOrder(rows);

  function move(row: TreeRow, dir: -1 | 1) {
    const siblings = ordered.filter((r) => r.parentKey === row.parentKey);
    const from = siblings.findIndex((r) => r.id === row.id);
    const to = from + dir;
    if (from < 0 || to < 0 || to >= siblings.length) return;
    const ids = siblings.map((r) => r.id);
    [ids[from], ids[to]] = [ids[to], ids[from]];
    const position = new Map(ids.map((id, i) => [id, i + 1]));
    const snapshot = rows;
    setRows(rows.map((r) => (position.has(r.id) ? { ...r, sort_order: position.get(r.id)! } : r)));
    const fd = new FormData();
    fd.set("storeId", storeId);
    for (const id of ids) fd.append("categoryIds", id);
    run(() => reorderCategoriesAction({}, fd), { rollback: () => setRows(snapshot) });
  }

  const dialogProps = { storeId, locale, defaultLocale, enabledLocales, parents };

  const columns: Column<TreeRow>[] = [
    {
      key: "name",
      header: t("categories.name"),
      cell: (r) => (
        <div className="flex min-w-0 items-center gap-2" style={r.depth > 0 ? { paddingInlineStart: `${(r.depth - 1) * 1.75 + 0.25}rem` } : undefined}>
          {r.depth > 0 && <CornerDownRight aria-hidden className="size-4 shrink-0 text-muted-foreground/70 rtl:-scale-x-100" />}
          <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-md border bg-muted text-muted-foreground">
            {r.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element -- storage host is user-configurable
              <img src={r.image_url} alt="" className="size-full object-cover" loading="lazy" />
            ) : (
              <ImageIcon className="size-4" />
            )}
          </span>
          <span className="flex min-w-0 flex-col">
            <span className={r.depth === 0 ? "truncate font-semibold" : "truncate font-medium"}>{r.name}</span>
            {r.depth > 0 && r.parentName && <span className="truncate text-xs text-muted-foreground">{t("categories.inParent", { parent: r.parentName })}</span>}
          </span>
        </div>
      ),
    },
    {
      key: "products",
      header: t("categories.products"),
      cell: (r) => (
        <Link href={`/admin/products?category=${r.id}`} className="tabular-nums hover:underline">
          {num.format(r.productCount)}
        </Link>
      ),
      className: "text-end",
      hideBelow: "sm",
    },
    { key: "active", header: t("common.status"), cell: (r) => <StatusBadge kind="store" value={r.is_active ? "active" : "inactive"} />, hideBelow: "md" },
    ...(canWrite
      ? [
          {
            key: "actions",
            header: <span className="sr-only">{t("common.actions")}</span>,
            cell: (r: TreeRow) => (
              <div className="flex items-center justify-end gap-0.5">
                <CategoryDialog
                  {...dialogProps}
                  presetParent={{ id: r.id, name: r.name }}
                  trigger={
                    <Button type="button" variant="ghost" size="sm" className="text-muted-foreground">
                      <Plus data-icon="inline-start" />
                      <span className="hidden sm:inline">{t("categories.addSub")}</span>
                      <span className="sr-only sm:hidden">{t("categories.addSubFor", { name: r.name })}</span>
                    </Button>
                  }
                />
                <Button type="button" variant="ghost" size="icon-sm" aria-label={t("categories.moveUp")} disabled={r.siblingIndex === 0} onClick={() => move(r, -1)}>
                  <ChevronUp />
                </Button>
                <Button type="button" variant="ghost" size="icon-sm" aria-label={t("categories.moveDown")} disabled={r.siblingIndex === r.siblingCount - 1} onClick={() => move(r, 1)}>
                  <ChevronDown />
                </Button>
                <CategoryDialog
                  {...dialogProps}
                  category={r}
                  trigger={
                    <Button type="button" variant="ghost" size="icon-sm" aria-label={t("common.edit")}>
                      <Pencil />
                    </Button>
                  }
                />
                <CategoryDeleteButton storeId={storeId} categoryId={r.id} productCount={r.productCount} />
              </div>
            ),
            className: "text-end whitespace-nowrap",
          } satisfies Column<TreeRow>,
        ]
      : []),
  ];
  return (
    <DataTable
      columns={columns}
      rows={ordered}
      rowKey={(r) => r.id}
      empty={
        <EmptyState
          icon={FolderTree}
          title={t("categories.empty")}
          description={t("categories.emptyHint")}
          action={canWrite ? <CategoryDialog {...dialogProps} trigger={<Button type="button">{t("categories.new")}</Button>} /> : null}
        />
      }
    />
  );
}
