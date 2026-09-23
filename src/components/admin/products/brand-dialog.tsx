"use client";

import { Trash2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { LatinInput } from "@/components/forms/latin-input";
import { deleteBrandAction, saveBrandAction, toggleBrandActiveAction } from "@/lib/admin/brands/actions";
import type { BrandAdminRow } from "@/lib/admin/brands/types";
import { ConfirmDialog } from "../shared/confirm-dialog";
import { FormField } from "../shared/form-field";
import { ImageUploader } from "../shared/image-uploader";
import { clearOptimistic, setOptimistic, useOptimisticRow } from "../shared/optimistic-store";
import { useActionToast } from "../shared/use-action-toast";
import { useOptimisticAction } from "../shared/use-optimistic-action";
import { useProductFieldErrors } from "./product-form";

interface Props {
  storeId: string;
  /** Existing brand to edit; omit for "new". */
  brand?: BrandAdminRow;
  trigger: React.ReactElement;
}

export function BrandDialog({ storeId, brand, trigger }: Props) {
  const t = useTranslations("admin");
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        {open && <BrandForm storeId={storeId} brand={brand} title={brand ? t("brands.edit") : t("brands.new")} onDone={() => setOpen(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function BrandForm({ storeId, brand, title, onDone }: Omit<Props, "trigger"> & { title: string; onDone: () => void }) {
  const t = useTranslations("admin");
  const [state, action, pending] = useActionToast(saveBrandAction, { errorNamespace: "admin.products", onSuccess: onDone });
  const errors = useProductFieldErrors(state.fieldErrors);
  // Every field is controlled: React resets uncontrolled inputs after a form action completes.
  const [name, setName] = useState(brand?.name ?? "");
  // Empty = the server makes one from the name (Farsi included); only the Advanced section shows it.
  const [slug, setSlug] = useState(brand?.slug ?? "");
  const [logoUrl, setLogoUrl] = useState(brand?.logo_url ?? "");
  const [active, setActive] = useState(brand?.is_active ?? true);

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="storeId" value={storeId} />
      <input type="hidden" name="brandId" value={brand?.id ?? ""} />
      <input type="hidden" name="logo_url" value={logoUrl} />
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{t("brands.dialogHint")}</DialogDescription>
      </DialogHeader>

      <FormField name="name" label={t("brands.name")} errors={errors} required>
        <Input
          id="name"
          name="name"
          value={name}
          autoComplete="off"
          dir="auto"
          onChange={(e) => setName(e.target.value)}
        />
      </FormField>
      <details className="group rounded-lg border px-3 py-2" open={!!errors?.slug}>
        <summary className="cursor-pointer text-sm text-muted-foreground select-none">{t("brands.advanced")}</summary>
        <div className="pt-3">
          <FormField name="slug" label={t("brands.slug")} description={t("brands.slugHint")} errors={errors}>
            <LatinInput kind="code" id="slug" name="slug" value={slug} className="normal-case tracking-normal" onChange={(e) => setSlug(e.target.value.toLowerCase())} />
          </FormField>
        </div>
      </details>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">{t("brands.logo")}</span>
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <span className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element -- storage host is user-configurable */}
              <img src={logoUrl} alt="" className="size-16 rounded-md border bg-muted object-contain p-1" />
              <Button type="button" variant="outline" size="icon-xs" className="absolute -end-2 -top-2 rounded-full" aria-label={t("common.remove")} onClick={() => setLogoUrl("")}>
                <X />
              </Button>
            </span>
          ) : null}
          <ImageUploader storeId={storeId} folder="brands" onUploaded={(url) => setLogoUrl(url)} label={logoUrl ? t("brands.replaceLogo") : undefined} />
        </div>
      </div>

      <Label className="flex items-center justify-between gap-3">
        <span>{t("brands.active")}</span>
        <Switch name="is_active" checked={active} onCheckedChange={setActive} />
      </Label>

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onDone}>
          {t("common.cancel")}
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? t("common.saving") : brand ? t("common.save") : t("common.create")}
        </Button>
      </DialogFooter>
    </form>
  );
}

/** Active toggle in the brands table: flips instantly, rolls back if the server rejects. */
export function BrandActiveSwitch({ storeId, brandId, checked, disabled }: { storeId: string; brandId: string; checked: boolean; disabled?: boolean }) {
  const t = useTranslations("admin.brands");
  const row = useOptimisticRow(brandId, { is_active: checked });
  const { run } = useOptimisticAction("admin.products");
  return (
    <Switch
      size="sm"
      checked={row.is_active}
      disabled={disabled}
      aria-label={t("active")}
      onCheckedChange={(next) => {
        const fd = new FormData();
        fd.set("storeId", storeId);
        fd.set("brandId", brandId);
        if (next) fd.set("is_active", "on");
        run(() => toggleBrandActiveAction({}, fd), {
          optimistic: () => setOptimistic(brandId, { is_active: next }),
          rollback: () => clearOptimistic(brandId, ["is_active"]),
        });
      }}
    />
  );
}

/** Delete with confirmation; lives here so the server-rendered list can pass plain props. */
export function BrandDeleteButton({ storeId, brandId, productCount }: { storeId: string; brandId: string; productCount: number }) {
  const t = useTranslations("admin");
  return (
    <ConfirmDialog
      trigger={
        <Button type="button" variant="ghost" size="icon-sm" aria-label={t("common.delete")} className="text-muted-foreground hover:text-destructive">
          <Trash2 />
        </Button>
      }
      title={t("brands.deleteConfirm")}
      description={t("brands.deleteDescription", { count: productCount })}
      confirmLabel={t("common.delete")}
      destructive
      action={() => {
        const fd = new FormData();
        fd.set("storeId", storeId);
        fd.set("brandId", brandId);
        return deleteBrandAction({}, fd);
      }}
    />
  );
}
