"use client";

import { useState } from "react";
import { Check, ChevronDown, Copy, Link2, MoreHorizontal, Pencil, RefreshCw, Trash2, UserRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { copyText } from "@/components/shared/copy-button";
import { deleteCourierAction, getCourierLinkAction, rotateCourierTokenAction } from "@/lib/admin/delivery/actions";
import { useOptimisticAction } from "../shared/use-optimistic-action";
import { CourierDialog, type CourierDraft } from "./courier-dialog";

interface Props {
  storeId: string;
  locale: string;
  courier: CourierDraft;
  hasStops: boolean;
  /** "icon" = the ⋯ in a table row (default); "button" = a labelled Actions button on the courier page. */
  variant?: "icon" | "button";
}

/**
 * Per-courier actions. The private link is fetched on demand rather than rendered into the page, so
 * a screenshot of the couriers list never leaks a working link.
 */
export function CourierRowActions({ storeId, locale, courier, hasStops, variant = "icon" }: Props) {
  const t = useTranslations("admin.delivery.couriers");
  const tc = useTranslations("admin.common");
  const { run, pending } = useOptimisticAction("admin.delivery");
  const [edit, setEdit] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  function form() {
    const fd = new FormData();
    fd.set("storeId", storeId);
    fd.set("courierId", courier.id!);
    return fd;
  }

  function showLink() {
    const fd = form();
    fd.set("locale", locale);
    run(async () => {
      const res = await getCourierLinkAction({}, fd);
      if (res.link) setLink(res.link);
      return res;
    });
  }

  function rotate() {
    run(async () => {
      const res = await rotateCourierTokenAction({}, form());
      if (res.ok) {
        setLink(null);
        toast.success(t("rotated"));
      }
      return res;
    });
  }

  async function copy() {
    if (!link) return;
    if (!(await copyText(link))) return;
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger render={variant === "icon" ? <Button variant="ghost" size="icon-sm" aria-label={tc("actions")} disabled={pending} /> : <Button variant="outline" size="sm" disabled={pending} />}>
          {variant === "icon" ? (
            <MoreHorizontal />
          ) : (
            <>
              {tc("actions")}
              <ChevronDown data-icon="inline-end" />
            </>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-44">
          {variant === "icon" && courier.id && (
            <DropdownMenuItem render={<Link href={`/admin/delivery/couriers/${courier.id}`} />}>
              <UserRound data-icon="inline-start" />
              {t("open")}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => setEdit(true)}>
            <Pencil data-icon="inline-start" />
            {tc("edit")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={showLink}>
            <Link2 data-icon="inline-start" />
            {t("link")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={rotate}>
            <RefreshCw data-icon="inline-start" />
            {t("rotate")}
          </DropdownMenuItem>
          {!hasStops && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => setConfirmDelete(true)}>
                <Trash2 data-icon="inline-start" />
                {tc("delete")}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <CourierDialog storeId={storeId} courier={courier} open={edit} onOpenChange={setEdit} />

      {/* The link, shown only after an explicit click. */}
      <Dialog open={link !== null} onOpenChange={(o) => !o && setLink(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("link")}</DialogTitle>
            <DialogDescription>{t("linkHint")}</DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <Input readOnly value={link ?? ""} dir="ltr" className="font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
            <Button type="button" variant="outline" onClick={copy} aria-label={t("copy")}>
              {copied ? <Check /> : <Copy />}
            </Button>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setLink(null)}>
              {tc("back")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("deleteConfirm", { name: courier.name })}</DialogTitle>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setConfirmDelete(false)}>
              {tc("cancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={pending}
              onClick={() => {
                run(() => deleteCourierAction({}, form()), { onSuccess: () => setConfirmDelete(false) });
              }}
            >
              {tc("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
