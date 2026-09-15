"use client";

import { useTranslations } from "next-intl";
import { useMemo, useState, type ReactNode } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { LatinInput } from "@/components/forms/latin-input";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/config";
import type { BrandOption } from "@/lib/admin/brands/types";
import { saveProductAction } from "@/lib/admin/products/actions";
import { PRODUCT_STATUSES, type CategoryOption, type ProductEditData, type ProductTranslationInput } from "@/lib/admin/products/types";
import type { ProductStatus } from "@/lib/db/types";
import { cn } from "@/lib/utils";
import { FormField } from "../shared/form-field";
import { LocaleTabs } from "../shared/locale-tabs";
import { useActionToast } from "../shared/use-action-toast";

interface Props {
  storeId: string;
  locale: Locale;
  defaultLocale: Locale;
  enabledLocales: Locale[];
  product?: ProductEditData | null;
  categories: CategoryOption[];
  brands: BrandOption[];
  /** Replaces the admin page's sticky bar (a drawer supplies Cancel as its own close control). */
  footer?: (ctx: { pending: boolean; submitLabel: string }) => ReactNode;
  /** After a successful save of an existing product. */
  onSaved?: () => void;
  /**
   * Storefront host of the form: `/<locale>/p/`. Sent to the action, which then redirects a slug
   * change to the new address and a status change away from active to the admin editor, because
   * the storefront page it came from would 404 on refresh.
   */
  returnBase?: string;
}

const NO_BRAND = "__none";

const EMPTY: ProductTranslationInput = { name: "", short_description: "", description: "", seo_title: "", seo_description: "" };

const TR_MAP: Record<string, string> = { ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u", İ: "i" };
export function slugify(input: string): string {
  return input
    .replace(/[çğıöşüİ]/g, (c) => TR_MAP[c] ?? c)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

/** Field-error keys that live under admin.products.fieldErrors rather than admin.common. */
export function useProductFieldErrors(raw: Record<string, string> | undefined) {
  const t = useTranslations("admin.products.fieldErrors");
  return useMemo(() => {
    if (!raw) return undefined;
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(raw)) out[k] = t.has(v) ? t(v) : v;
    return out;
  }, [raw, t]);
}

export function ProductForm({ storeId, locale, defaultLocale, enabledLocales, product, categories, brands, footer, onSaved, returnBase }: Props) {
  const t = useTranslations("admin");
  const [state, action, pending] = useActionToast(saveProductAction, { errorNamespace: "admin.products", onSuccess: () => onSaved?.() });
  const errors = useProductFieldErrors(state.fieldErrors);

  const [translations, setTranslations] = useState<Partial<Record<Locale, ProductTranslationInput>>>(() => {
    const out: Partial<Record<Locale, ProductTranslationInput>> = {};
    for (const l of enabledLocales) {
      const row = product?.translations.find((r) => r.locale === l);
      out[l] = row
        ? { name: row.name, short_description: row.short_description ?? "", description: row.description ?? "", seo_title: row.seo_title ?? "", seo_description: row.seo_description ?? "" }
        : { ...EMPTY };
    }
    return out;
  });
  const [activeLocale, setActiveLocale] = useState<Locale>(() => (enabledLocales.includes(locale) ? locale : defaultLocale));
  // Jump to the locale whose required name is missing when the server rejects the form (state derived during render).
  const [seenState, setSeenState] = useState(state);
  if (state !== seenState) {
    setSeenState(state);
    const wanted = state.fieldErrors?.translations as Locale | undefined;
    if (wanted && enabledLocales.includes(wanted)) setActiveLocale(wanted);
  }
  // Every field is controlled: React resets uncontrolled inputs after a form action completes.
  const [slug, setSlug] = useState(product?.product.slug ?? "");
  const [brandId, setBrandId] = useState(product?.product.brand_id ?? NO_BRAND);
  const [tags, setTags] = useState(product?.product.tags.join(", ") ?? "");
  const [featured, setFeatured] = useState(product?.product.is_featured ?? false);
  const [bestseller, setBestseller] = useState(product?.product.is_bestseller ?? false);
  const [slugTouched, setSlugTouched] = useState(!!product);
  const [status, setStatus] = useState<ProductStatus>(product?.product.status ?? "draft");

  const current = translations[activeLocale] ?? EMPTY;
  const missing = enabledLocales.filter((l) => !translations[l]?.name?.trim());
  const statusItems = PRODUCT_STATUSES.map((s) => ({ value: s, label: t(`status.product.${s}`) }));
  const brandItems = [{ value: NO_BRAND, label: t("brands.none") }, ...brands.map((b) => ({ value: b.id, label: b.name }))];
  const dirFor = (l: Locale) => (l === "fa" ? "rtl" : "ltr");

  function patch(field: keyof ProductTranslationInput, value: string) {
    setTranslations((prev) => ({ ...prev, [activeLocale]: { ...(prev[activeLocale] ?? EMPTY), [field]: value } }));
    if (field === "name" && activeLocale === defaultLocale && !slugTouched) setSlug(slugify(value));
  }

  const submitLabel = pending ? t("common.saving") : product ? t("common.save") : t("common.create");
  const nameError = errors?.name && (state.fieldErrors?.translations ?? defaultLocale) === activeLocale ? { name: errors.name } : undefined;

  return (
    <form action={action} className="flex flex-col gap-6">
      <input type="hidden" name="storeId" value={storeId} />
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="productId" value={product?.product.id ?? ""} />
      <input type="hidden" name="translations" value={JSON.stringify(translations)} />
      <input type="hidden" name="brand_id" value={brandId === NO_BRAND ? "" : brandId} />
      {returnBase && product && (
        <>
          <input type="hidden" name="returnBase" value={returnBase} />
          <input type="hidden" name="originalSlug" value={product.product.slug} />
        </>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section className="flex flex-col gap-4 rounded-xl border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-medium text-muted-foreground">{t("products.details")}</h2>
            <LocaleTabs locales={enabledLocales} value={activeLocale} onValueChange={setActiveLocale} missing={missing} required={defaultLocale} />
          </div>
          <div key={activeLocale} className="flex flex-col gap-4" lang={activeLocale} dir={dirFor(activeLocale)}>
            <FormField name="name" label={t("products.name")} errors={nameError} required={activeLocale === defaultLocale}>
              <Input id="name" value={current.name} onChange={(e) => patch("name", e.target.value)} autoComplete="off" />
            </FormField>
            <FormField name="short_description" label={t("products.shortDescription")}>
              <Textarea id="short_description" rows={2} value={current.short_description} onChange={(e) => patch("short_description", e.target.value)} />
            </FormField>
            <FormField name="description" label={t("products.description")}>
              <Textarea id="description" rows={8} value={current.description} onChange={(e) => patch("description", e.target.value)} />
            </FormField>
            <details className="group rounded-lg border">
              <summary className="cursor-pointer select-none px-3 py-2 text-sm font-medium">{t("products.seo")}</summary>
              <div className="flex flex-col gap-4 border-t p-3">
                <FormField name="seo_title" label={t("products.seoTitle")}>
                  <Input id="seo_title" value={current.seo_title} onChange={(e) => patch("seo_title", e.target.value)} />
                </FormField>
                <FormField name="seo_description" label={t("products.seoDescription")}>
                  <Textarea id="seo_description" rows={2} value={current.seo_description} onChange={(e) => patch("seo_description", e.target.value)} />
                </FormField>
              </div>
            </details>
          </div>
        </section>

        <aside className="flex flex-col gap-4">
          <section className="flex flex-col gap-4 rounded-xl border bg-card p-4">
            <FormField name="status" label={t("common.status")} errors={errors}>
              <Select name="status" items={statusItems} value={status} onValueChange={(v) => v && setStatus(v as ProductStatus)} modal={false}>
                <SelectTrigger id="status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false}>
                  {statusItems.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField name="slug" label={t("products.slug")} errors={errors} description={t("products.slugHint")} required>
              <LatinInput
                kind="code"
                id="slug"
                name="slug"
                value={slug}
                className="normal-case tracking-normal"
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(e.target.value.toLowerCase());
                }}
              />
            </FormField>
            <FormField name="brand_id" label={t("products.brand")} errors={errors}>
              <Select items={brandItems} value={brandId} onValueChange={(v) => v && setBrandId(String(v))} modal={false}>
                <SelectTrigger id="brand_id" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false}>
                  {brandItems.map((b) => (
                    <SelectItem key={b.value} value={b.value}>
                      {b.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField name="tags" label={t("products.tags")} errors={errors} description={t("products.tagsHint")}>
              <Input id="tags" name="tags" value={tags} onChange={(e) => setTags(e.target.value)} autoComplete="off" dir="auto" />
            </FormField>
            <Label className="flex items-center justify-between gap-3">
              <span>{t("products.featured")}</span>
              <Switch name="is_featured" checked={featured} onCheckedChange={setFeatured} />
            </Label>
            <Label className="flex items-center justify-between gap-3">
              <span className="flex flex-col gap-0.5">
                <span>{t("products.bestseller")}</span>
                <span className="text-xs font-normal text-muted-foreground">{t("products.bestsellerHint")}</span>
              </span>
              <Switch name="is_bestseller" checked={bestseller} onCheckedChange={setBestseller} />
            </Label>
          </section>

          <section className="flex flex-col gap-3 rounded-xl border bg-card p-4">
            <h2 className="text-sm font-medium text-muted-foreground">{t("products.categories")}</h2>
            {categories.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("products.noCategories")}{" "}
                <Link href="/admin/products/categories" className="underline underline-offset-4">
                  {t("crumbs.categories")}
                </Link>
              </p>
            ) : (
              <ul className="flex max-h-72 flex-col gap-2 overflow-y-auto">
                {categories.map((c) => (
                  <li key={c.id}>
                    <Label className={cn("flex cursor-pointer items-center gap-2 font-normal", c.parentId && "ps-5")}>
                      <Checkbox name="categoryIds" value={c.id} defaultChecked={product?.categoryIds.includes(c.id) ?? false} />
                      <span>{c.name}</span>
                    </Label>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>

      {footer ? (
        footer({ pending, submitLabel })
      ) : (
        <div className="sticky bottom-0 -mx-4 flex items-center justify-end gap-2 border-t bg-background/95 px-4 py-3 backdrop-blur md:-mx-6 md:px-6">
          <Link href="/admin/products" className={buttonVariants({ variant: "ghost" })}>
            {t("common.cancel")}
          </Link>
          <Button type="submit" disabled={pending}>
            {submitLabel}
          </Button>
        </div>
      )}
    </form>
  );
}
