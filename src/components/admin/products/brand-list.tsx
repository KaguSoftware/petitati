"use client";

import { ArrowDownAZ, BadgeCheck, ChevronDown, ChevronsUp, ChevronUp, Pencil } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { reorderBrandsAction, sortBrandsByNameAction } from "@/lib/admin/brands/actions";
import type { BrandAdminRow } from "@/lib/admin/brands/types";
import { numberFormat } from "@/lib/number";
import { ConfirmDialog } from "../shared/confirm-dialog";
import { DataTable, type Column } from "../shared/data-table";
import { EmptyState } from "../shared/empty-state";
import { useOptimisticAction } from "../shared/use-optimistic-action";
import { BrandActiveSwitch, BrandDeleteButton, BrandDialog } from "./brand-dialog";

interface Props {
  rows: BrandAdminRow[];
  storeId: string;
  canWrite: boolean;
}

/** "Royal Canin" → "RC" for the logo placeholder. */
function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

/**
 * Brands in the order the shop shows them. The order is local state moved by arrow buttons (no
 * drag dependency, works on touch); each move sends the whole id list, and rolls back on error.
 */
export function BrandList({ rows, storeId, canWrite }: Props) {
  const t = useTranslations("admin");
  const locale = useLocale();
  const num = numberFormat(locale);
  const [order, setOrder] = useState(rows);
  // A server refresh (new brand, A–Z, delete) replaces the local order.
  const [seen, setSeen] = useState(rows);
  if (seen !== rows) {
    setSeen(rows);
    setOrder(rows);
  }
  const { run, pending } = useOptimisticAction("admin.products");

  function move(from: number, to: number) {
    if (to < 0 || to >= order.length || from === to) return;
    const snapshot = order;
    const next = [...order];
    const [row] = next.splice(from, 1);
    next.splice(to, 0, row);
    setOrder(next);
    const fd = new FormData();
    fd.set("storeId", storeId);
    for (const b of next) fd.append("brandIds", b.id);
    run(() => reorderBrandsAction({}, fd), { rollback: () => setOrder(snapshot) });
  }

  const columns: Column<BrandAdminRow>[] = [
    {
      key: "position",
      header: t("brands.position"),
      cell: (r) => {
        const i = order.indexOf(r);
        return (
          <div className="flex items-center gap-1">
            <span className="w-7 text-center text-sm font-medium tabular-nums text-muted-foreground">{num.format(i + 1)}</span>
            {canWrite && (
              <>
                <Button type="button" variant="ghost" size="icon-xs" aria-label={t("brands.moveTop")} title={t("brands.moveTop")} disabled={i === 0} onClick={() => move(i, 0)}>
                  <ChevronsUp />
                </Button>
                <Button type="button" variant="ghost" size="icon-xs" aria-label={t("brands.moveUp")} disabled={i === 0} onClick={() => move(i, i - 1)}>
                  <ChevronUp />
                </Button>
                <Button type="button" variant="ghost" size="icon-xs" aria-label={t("brands.moveDown")} disabled={i === order.length - 1} onClick={() => move(i, i + 1)}>
                  <ChevronDown />
                </Button>
              </>
            )}
          </div>
        );
      },
      className: "w-36",
    },
    {
      key: "name",
      header: t("brands.name"),
      cell: (r) => (
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-md border bg-muted text-xs font-semibold text-muted-foreground">
            {r.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element -- storage host is user-configurable
              <img src={r.logo_url} alt="" className="size-full object-contain p-0.5" loading="lazy" />
            ) : (
              initials(r.name)
            )}
          </span>
          <span className="truncate font-medium">{r.name}</span>
        </div>
      ),
    },
    {
      key: "products",
      header: t("brands.products"),
      cell: (r) => (
        <Link href={`/admin/products?brand=${r.id}`} className="tabular-nums hover:underline">
          {num.format(r.productCount)}
        </Link>
      ),
      className: "text-end",
      hideBelow: "sm",
    },
    {
      key: "active",
      header: t("brands.active"),
      cell: (r) => <BrandActiveSwitch storeId={storeId} brandId={r.id} checked={r.is_active} disabled={!canWrite} />,
      className: "text-center",
    },
    ...(canWrite
      ? [
          {
            key: "actions",
            header: <span className="sr-only">{t("common.actions")}</span>,
            cell: (r: BrandAdminRow) => (
              <div className="flex items-center justify-end gap-0.5">
                <BrandDialog
                  storeId={storeId}
                  brand={r}
                  trigger={
                    <Button type="button" variant="ghost" size="icon-sm" aria-label={t("common.edit")}>
                      <Pencil />
                    </Button>
                  }
                />
                <BrandDeleteButton storeId={storeId} brandId={r.id} productCount={r.productCount} />
              </div>
            ),
            className: "w-20 text-end",
          } satisfies Column<BrandAdminRow>,
        ]
      : []),
  ];

  return (
    <div className="flex flex-col gap-3">
      {order.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">{t("brands.orderHint")}</p>
          {canWrite && (
            <ConfirmDialog
              trigger={
                <Button type="button" variant="outline" size="sm" disabled={pending}>
                  <ArrowDownAZ data-icon="inline-start" />
                  {t("brands.sortAz")}
                </Button>
              }
              title={t("brands.sortAzTitle")}
              description={t("brands.sortAzDescription")}
              confirmLabel={t("brands.sortAz")}
              action={() => {
                const fd = new FormData();
                fd.set("storeId", storeId);
                return sortBrandsByNameAction({}, fd);
              }}
            />
          )}
        </div>
      )}
      <DataTable
        columns={columns}
        rows={order}
        rowKey={(r) => r.id}
        empty={
          <EmptyState
            icon={BadgeCheck}
            title={t("brands.empty")}
            description={t("brands.emptyHint")}
            action={canWrite ? <BrandDialog storeId={storeId} trigger={<Button type="button">{t("brands.new")}</Button>} /> : null}
          />
        }
      />
    </div>
  );
}
