"use client";

import { MoreHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Link } from "@/i18n/navigation";
import { deleteProductAction, setProductStatusAction, toggleBestsellerAction, toggleFeaturedAction } from "@/lib/admin/products/actions";
import type { ProductStatus } from "@/lib/db/types";
import { clearOptimistic, setOptimistic, useOptimisticRow } from "../shared/optimistic-store";
import { useOptimisticAction } from "../shared/use-optimistic-action";
import { cn } from "@/lib/utils";

/**
 * On-site toggle in the products table: a hollow pill, green while the product shows on the
 * storefront (active), grey otherwise. Flips active ↔ draft; an archived product turns active.
 * Shares the optimistic `status` with the row menu so both move together.
 */
export function VisibilityToggle({ storeId, productId, status: serverStatus, disabled }: { storeId: string; productId: string; status: ProductStatus; disabled?: boolean }) {
  const t = useTranslations("admin.products.visibility");
  const { status } = useOptimisticRow(productId, { status: serverStatus });
  const { run } = useOptimisticAction("admin.products");
  const on = status === "active";
  return (
    <button
      type="button"
      aria-pressed={on}
      disabled={disabled}
      title={on ? t("hideHint") : t("showHint")}
      onClick={() => {
        const next: ProductStatus = on ? "draft" : "active";
        const fd = new FormData();
        fd.set("storeId", storeId);
        fd.set("productId", productId);
        fd.set("status", next);
        run(() => setProductStatusAction({}, fd), {
          optimistic: () => setOptimistic(productId, { status: next }),
          rollback: () => clearOptimistic(productId, ["status"]),
        });
      }}
      className={cn(
        "inline-flex h-7 min-w-20 items-center justify-center gap-1.5 rounded-full border px-3 text-xs font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-60",
        on
          ? "border-emerald-600 text-emerald-700 hover:bg-emerald-500/10 dark:border-emerald-400 dark:text-emerald-300"
          : "border-border text-muted-foreground hover:bg-muted",
      )}
    >
      <span aria-hidden className={cn("size-1.5 rounded-full", on ? "bg-emerald-600 dark:bg-emerald-400" : "bg-muted-foreground/50")} />
      {on ? t("on") : status === "archived" ? t("archived") : t("off")}
    </button>
  );
}

/** Featured toggle in the products table: flips instantly, rolls back if the server rejects. */
export function FeaturedSwitch({ storeId, productId, checked, disabled }: { storeId: string; productId: string; checked: boolean; disabled?: boolean }) {
  const t = useTranslations("admin.products");
  const row = useOptimisticRow(productId, { is_featured: checked });
  const { run } = useOptimisticAction("admin.products");
  return (
    <Switch
      size="sm"
      checked={row.is_featured}
      disabled={disabled}
      aria-label={t("featured")}
      onCheckedChange={(next) => {
        const fd = new FormData();
        fd.set("storeId", storeId);
        fd.set("productId", productId);
        if (next) fd.set("is_featured", "on");
        run(() => toggleFeaturedAction({}, fd), {
          optimistic: () => setOptimistic(productId, { is_featured: next }),
          rollback: () => clearOptimistic(productId, ["is_featured"]),
        });
      }}
    />
  );
}

/** "Best seller" toggle, same optimistic shape as Featured. */
export function BestsellerSwitch({ storeId, productId, checked, disabled }: { storeId: string; productId: string; checked: boolean; disabled?: boolean }) {
  const t = useTranslations("admin.products");
  const row = useOptimisticRow(productId, { is_bestseller: checked });
  const { run } = useOptimisticAction("admin.products");
  return (
    <Switch
      size="sm"
      checked={row.is_bestseller}
      disabled={disabled}
      aria-label={t("bestseller")}
      onCheckedChange={(next) => {
        const fd = new FormData();
        fd.set("storeId", storeId);
        fd.set("productId", productId);
        if (next) fd.set("is_bestseller", "on");
        run(() => toggleBestsellerAction({}, fd), {
          optimistic: () => setOptimistic(productId, { is_bestseller: next }),
          rollback: () => clearOptimistic(productId, ["is_bestseller"]),
        });
      }}
    />
  );
}

interface RowActionsProps {
  storeId: string;
  productId: string;
  status: ProductStatus;
  slug: string;
  locale: string;
}

/** Per-row menu: edit, status changes, delete (with confirmation). */
export function ProductRowActions({ storeId, productId, status: serverStatus, slug, locale }: RowActionsProps) {
  const t = useTranslations("admin");
  // The status badge lives in another cell: both read the same optimistic row entry.
  const { status } = useOptimisticRow(productId, { status: serverStatus });
  const { run } = useOptimisticAction("admin.products");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  function setStatus(next: ProductStatus) {
    const fd = new FormData();
    fd.set("storeId", storeId);
    fd.set("productId", productId);
    fd.set("status", next);
    run(() => setProductStatusAction({}, fd), {
      optimistic: () => setOptimistic(productId, { status: next }),
      rollback: () => clearOptimistic(productId, ["status"]),
    });
  }
  async function remove() {
    setDeleting(true);
    const fd = new FormData();
    fd.set("storeId", storeId);
    fd.set("productId", productId);
    const res = await deleteProductAction({}, fd);
    setDeleting(false);
    if (res.error) toast.error(t.has(`common.errors.${res.error}`) ? t(`common.errors.${res.error}`) : t.has(`products.errors.${res.error}`) ? t(`products.errors.${res.error}`) : res.error);
    else setConfirmOpen(false);
  }

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={t("common.actions")} />}>
          <MoreHorizontal />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-44">
          <DropdownMenuItem render={<Link href={`/admin/products/${productId}`} />}>{t("common.edit")}</DropdownMenuItem>
          {status === "active" && <DropdownMenuItem render={<a href={`/${locale}/p/${slug}`} target="_blank" rel="noreferrer" />}>{t("products.actions.viewStorefront")}</DropdownMenuItem>}
          <DropdownMenuSeparator />
          {status !== "active" && <DropdownMenuItem onClick={() => setStatus("active")}>{t("products.actions.activate")}</DropdownMenuItem>}
          {status !== "draft" && <DropdownMenuItem onClick={() => setStatus("draft")}>{t("products.actions.draft")}</DropdownMenuItem>}
          {status !== "archived" && <DropdownMenuItem onClick={() => setStatus("archived")}>{t("products.actions.archive")}</DropdownMenuItem>}
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={() => setConfirmOpen(true)}>
            {t("common.delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("products.delete.title")}</AlertDialogTitle>
            <AlertDialogDescription>{t("products.delete.description")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t("common.cancel")}</AlertDialogCancel>
            <Button variant="destructive" onClick={remove} disabled={deleting}>
              {t("common.delete")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
