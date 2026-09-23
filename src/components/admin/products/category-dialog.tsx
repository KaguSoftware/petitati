"use client";

import { Trash2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { LatinInput } from "@/components/forms/latin-input";
import type { Locale } from "@/i18n/config";
import { deleteCategoryAction, saveCategoryAction } from "@/lib/admin/products/actions";
import type { CategoryAdminRow, CategoryOption } from "@/lib/admin/products/types";
import { ConfirmDialog } from "../shared/confirm-dialog";
import { FormField } from "../shared/form-field";
import { ImageUploader } from "../shared/image-uploader";
import { LocaleTabs } from "../shared/locale-tabs";
import { useActionToast } from "../shared/use-action-toast";
import { useProductFieldErrors } from "./product-form";

interface Props {
  storeId: string;
  locale: Locale;
  defaultLocale: Locale;
  enabledLocales: Locale[];
  /** Existing category to edit; omit for "new". */
  category?: CategoryAdminRow;
  /** Every category; the dialog leaves out this one and its own subcategories. */
  parents: CategoryOption[];
  /** "+ Subcategory" on a row: new category that starts under this parent. */
  presetParent?: { id: string; name: string };
  trigger: React.ReactElement;
}

/**
 * Parent choices as an indented tree ("— Dogs", "—— Dog food"), without `selfId` and everything
 * under it, so a category can never become its own grandchild.
 */
function parentChoices(all: CategoryOption[], selfId?: string): { id: string; label: string }[] {
  const ids = new Set(all.map((c) => c.id));
  const kids = new Map<string | null, CategoryOption[]>();
  for (const c of all) {
    const key = c.parentId && ids.has(c.parentId) ? c.parentId : null;
    kids.set(key, [...(kids.get(key) ?? []), c]);
  }
  const out: { id: string; label: string }[] = [];
  const walk = (parent: string | null, depth: number) => {
    for (const c of kids.get(parent) ?? []) {
      if (c.id === selfId) continue; // skips the whole branch below it too
      out.push({ id: c.id, label: `${"— ".repeat(depth)}${c.name}` });
      walk(c.id, depth + 1);
    }
  };
  walk(null, 0);
  return out;
}

const NONE = "__none";

export function CategoryDialog({ storeId, locale, defaultLocale, enabledLocales, category, parents, presetParent, trigger }: Props) {
  const t = useTranslations("admin");
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        {open && (
          <CategoryForm
            storeId={storeId}
            locale={locale}
            defaultLocale={defaultLocale}
            enabledLocales={enabledLocales}
            category={category}
            parents={parents}
            presetParent={presetParent}
            title={category ? t("categories.edit") : presetParent ? t("categories.newSub", { parent: presetParent.name }) : t("categories.new")}
            onDone={() => setOpen(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function CategoryForm({ storeId, locale, defaultLocale, enabledLocales, category, parents, presetParent, title, onDone }: Omit<Props, "trigger"> & { title: string; onDone: () => void }) {
  const t = useTranslations("admin");
  const [state, action, pending] = useActionToast(saveCategoryAction, { errorNamespace: "admin.products", onSuccess: onDone });
  const errors = useProductFieldErrors(state.fieldErrors);
  const [translations, setTranslations] = useState<Partial<Record<Locale, { name: string; description: string }>>>(() =>
    Object.fromEntries(
      enabledLocales.map((l) => {
        const row = category?.translations.find((r) => r.locale === l);
        return [l, { name: row?.name ?? "", description: row?.description ?? "" }];
      }),
    ),
  );
  const [active, setActive] = useState<Locale>(enabledLocales.includes(locale) ? locale : defaultLocale);
  const [seenState, setSeenState] = useState(state);
  if (state !== seenState) {
    setSeenState(state);
    const wanted = state.fieldErrors?.translations as Locale | undefined;
    if (wanted && enabledLocales.includes(wanted)) setActive(wanted);
  }
  // Empty = the server makes one from the name; only the Advanced section shows it.
  const [slug, setSlug] = useState(category?.slug ?? "");
  const [parentId, setParentId] = useState(category?.parent_id ?? presetParent?.id ?? NONE);
  const [imageUrl, setImageUrl] = useState(category?.image_url ?? "");

  const current = translations[active] ?? { name: "", description: "" };
  // A name in any one language is enough (the server copies it to the default language).
  const anyName = enabledLocales.some((l) => translations[l]?.name.trim());
  const missing = anyName ? [] : [active];
  const parentItems = [{ value: NONE, label: t("categories.noParent") }, ...parentChoices(parents, category?.id).map((p) => ({ value: p.id, label: p.label }))];
  const nameError = errors?.name && (state.fieldErrors?.translations ?? defaultLocale) === active ? { name: errors.name } : undefined;

  function patch(field: "name" | "description", value: string) {
    setTranslations((prev) => ({ ...prev, [active]: { ...(prev[active] ?? { name: "", description: "" }), [field]: value } }));
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="storeId" value={storeId} />
      <input type="hidden" name="categoryId" value={category?.id ?? ""} />
      <input type="hidden" name="translations" value={JSON.stringify(translations)} />
      <input type="hidden" name="parent_id" value={parentId === NONE ? "" : parentId} />
      <input type="hidden" name="image_url" value={imageUrl} />
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{t("categories.dialogHint")}</DialogDescription>
      </DialogHeader>

      {enabledLocales.length > 1 && <LocaleTabs locales={enabledLocales} value={active} onValueChange={setActive} missing={missing} />}
      <div key={active} className="flex flex-col gap-4" lang={active} dir={active === "fa" ? "rtl" : "ltr"}>
        <FormField name="name" label={t("categories.name")} errors={nameError} required={!anyName}>
          <Input id="name" value={current.name} onChange={(e) => patch("name", e.target.value)} autoComplete="off" />
        </FormField>
        <FormField name="description" label={t("categories.description")}>
          <Textarea id="description" rows={2} value={current.description} onChange={(e) => patch("description", e.target.value)} />
        </FormField>
      </div>

      <FormField name="parent_id" label={t("categories.parent")} description={t("categories.parentHint")} errors={errors}>
          <Select items={parentItems} value={parentId} onValueChange={(v) => v && setParentId(String(v))} modal={false}>
            <SelectTrigger id="parent_id" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              {parentItems.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
      </FormField>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">{t("categories.image")}</span>
        <div className="flex items-center gap-3">
          {imageUrl ? (
            <span className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element -- storage host is user-configurable */}
              <img src={imageUrl} alt="" className="size-16 rounded-md border object-cover" />
              <Button type="button" variant="outline" size="icon-xs" className="absolute -end-2 -top-2 rounded-full" aria-label={t("common.remove")} onClick={() => setImageUrl("")}>
                <X />
              </Button>
            </span>
          ) : null}
          <ImageUploader storeId={storeId} folder="categories" onUploaded={(url) => setImageUrl(url)} label={imageUrl ? t("categories.replaceImage") : undefined} />
        </div>
      </div>

      <Label className="flex items-center justify-between gap-3">
        <span>{t("categories.active")}</span>
        <Switch name="is_active" defaultChecked={category?.is_active ?? true} />
      </Label>

      <details className="rounded-lg border px-3 py-2" open={!!errors?.slug}>
        <summary className="cursor-pointer text-sm text-muted-foreground select-none">{t("categories.advanced")}</summary>
        <div className="pt-3">
          <FormField name="slug" label={t("categories.slug")} description={t("categories.slugHint")} errors={errors}>
            <LatinInput kind="code" id="slug" name="slug" value={slug} className="normal-case tracking-normal" onChange={(e) => setSlug(e.target.value.toLowerCase())} />
          </FormField>
        </div>
      </details>

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onDone}>
          {t("common.cancel")}
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? t("common.saving") : category ? t("common.save") : t("common.create")}
        </Button>
      </DialogFooter>
    </form>
  );
}

/** Delete with confirmation; lives here so the server-rendered list can pass plain props. */
export function CategoryDeleteButton({ storeId, categoryId, productCount }: { storeId: string; categoryId: string; productCount: number }) {
  const t = useTranslations("admin");
  return (
    <ConfirmDialog
      trigger={
        <Button type="button" variant="ghost" size="icon-sm" aria-label={t("common.delete")} className="text-muted-foreground hover:text-destructive">
          <Trash2 />
        </Button>
      }
      title={t("categories.delete.title")}
      description={t("categories.delete.description", { count: productCount })}
      confirmLabel={t("common.delete")}
      destructive
      action={() => {
        const fd = new FormData();
        fd.set("storeId", storeId);
        fd.set("categoryId", categoryId);
        return deleteCategoryAction({}, fd);
      }}
    />
  );
}
