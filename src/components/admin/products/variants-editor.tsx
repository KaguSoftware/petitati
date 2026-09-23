"use client";

import { ExternalLink, Plus, Settings2, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { LatinInput } from "@/components/forms/latin-input";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/config";
import { saveVariantTableAction } from "@/lib/admin/products/actions";
import type { OptionWithValues, VariantWithValues } from "@/lib/admin/products/types";
import { pickJson } from "@/lib/catalog/types";
import type { Translated } from "@/lib/db/types";
import { toMajor } from "@/lib/money";
import { numberFormat } from "@/lib/number";
import { cn } from "@/lib/utils";
import { UnsavedChangesGuard } from "../shared/unsaved-changes";
import { useActionToast } from "../shared/use-action-toast";

interface Props {
  storeId: string;
  productId: string;
  currency: string;
  locale: Locale;
  defaultLocale: Locale;
  enabledLocales: Locale[];
  lowStockThreshold: number;
  options: OptionWithValues[];
  variants: VariantWithValues[];
}

/** One editable row = one variant. Money and numbers stay strings while typing. */
interface Row {
  key: string;
  id?: string;
  name: Translated;
  /** Read-only label for products imported with several options ("Small · Red"). */
  fixedLabel?: string;
  sku: string;
  barcode: string;
  price: string;
  compare_at_price: string;
  cost_price: string;
  weight_grams: string;
  initial_stock: string;
  track_inventory: boolean;
  allow_backorder: boolean;
  is_active: boolean;
  source_url: string;
  /** Saved stock; null for a new row. */
  stockQty: number | null;
}

let seq = 0;
const nextKey = () => `new${++seq}`;
/** Persian/Arabic digits typed on a fa keyboard → ASCII, so the server parsers read them. */
const ascii = (v: string) => v.replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0)).replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660)).replace(/[٫،]/g, ".");
const digitsOnly = (v: string) => ascii(v).replace(/\D/g, "");
const major = (minor: number | null | undefined, currency: string) => (minor == null ? "" : String(toMajor(minor, currency)));

function toRows(variants: VariantWithValues[], options: OptionWithValues[], currency: string, locale: Locale, fallback: Locale): Row[] {
  const values = new Map(options.flatMap((o) => o.values.map((v) => [v.id, v.value] as const)));
  const multi = options.length >= 2;
  return variants.map((v) => ({
    key: v.id,
    id: v.id,
    name: (!multi && v.optionValueIds.map((id) => values.get(id)).find(Boolean)) || {},
    fixedLabel: multi
      ? v.optionValueIds
          .map((id) => pickJson(values.get(id), locale, fallback))
          .filter(Boolean)
          .join(" · ")
      : undefined,
    sku: v.sku ?? "",
    barcode: v.barcode ?? "",
    price: major(v.price, currency),
    compare_at_price: major(v.compare_at_price, currency),
    cost_price: major(v.cost_price, currency),
    weight_grams: v.weight_grams == null ? "" : String(v.weight_grams),
    initial_stock: "",
    track_inventory: v.track_inventory,
    allow_backorder: v.allow_backorder,
    is_active: v.is_active,
    source_url: v.sourceUrl ?? "",
    stockQty: v.stock_qty,
  }));
}

function blankRow(template?: Row): Row {
  return {
    key: nextKey(),
    name: {},
    sku: "",
    barcode: "",
    price: template?.price ?? "",
    compare_at_price: "",
    cost_price: "",
    weight_grams: "",
    initial_stock: "",
    track_inventory: true,
    allow_backorder: false,
    is_active: true,
    source_url: "",
    stockQty: null,
  };
}

/**
 * "Prices & stock": the whole variant setup as one small table with one Save.
 * Most products are a single row (price, stock, SKU, buy link). "Several sizes or types" turns it
 * into named rows ("2 kg", "10 kg"); behind the scenes that is one product option whose values
 * are the row names, which is what the storefront picker shows. The old options builder and
 * "Generate variants" are gone from the UI (their server actions remain).
 */
export function VariantsEditor({ storeId, productId, currency, locale, defaultLocale, options, variants }: Props) {
  const t = useTranslations("admin.products.table");
  const tc = useTranslations("admin.common");
  const num = numberFormat(locale);
  const multi = options.length >= 2;

  const initial = () => {
    const rows = toRows(variants, options, currency, locale, defaultLocale);
    return rows.length ? rows : [blankRow()];
  };
  const [rows, setRows] = useState<Row[]>(initial);
  const [optionName, setOptionName] = useState<Translated>(() => ({ ...(options.length === 1 ? options[0].name : {}) }));
  const [defaultKey, setDefaultKey] = useState(() => variants.find((v) => v.is_default)?.id ?? variants[0]?.id ?? "");
  const [several, setSeveral] = useState(() => multi || options.length === 1 || variants.length > 1);
  const [open, setOpen] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  // After a save the server re-renders with real ids: resync the drafts (derived state).
  const signature = JSON.stringify([variants, options]);
  const [seenSignature, setSeenSignature] = useState(signature);
  if (signature !== seenSignature) {
    setSeenSignature(signature);
    setRows(initial());
    setOptionName({ ...(options.length === 1 ? options[0].name : {}) });
    setDefaultKey(variants.find((v) => v.is_default)?.id ?? variants[0]?.id ?? "");
    setSeveral(multi || options.length === 1 || variants.length > 1);
    setDirty(false);
  }

  const [state, action, pending] = useActionToast(saveVariantTableAction, { errorNamespace: "admin.products", onSuccess: () => setDirty(false) });
  const errorRow = state.error ? state.id : undefined;
  const bad = (row: Row, field: string) => errorRow === row.key && !!state.fieldErrors?.[field];

  function patch(key: string, change: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...change } : r)));
    setDirty(true);
  }
  // Names are typed in the admin's language; other languages keep what they had.
  const nameOf = (r: Row) => r.name[locale] ?? pickJson(r.name, locale, defaultLocale);
  const firstKey = rows[0]?.key ?? "";
  const effectiveDefault = rows.some((r) => r.key === defaultKey) ? defaultKey : firstKey;

  const payload = rows.map((r) => ({
    key: r.key,
    id: r.id,
    name: multi ? {} : r.name,
    sku: r.sku,
    barcode: r.barcode,
    price: r.price,
    compare_at_price: r.compare_at_price,
    cost_price: r.cost_price,
    weight_grams: r.weight_grams,
    initial_stock: r.initial_stock,
    track_inventory: r.track_inventory,
    allow_backorder: r.allow_backorder,
    is_active: r.is_active,
    source_url: r.source_url,
  }));

  return (
    <section className="flex flex-col gap-4 rounded-xl border bg-card p-4">
      <UnsavedChangesGuard dirty={dirty} />
      <div>
        <h2 className="font-medium">{t("title")}</h2>
        <p className="text-sm text-muted-foreground">{several ? t("hintSeveral") : t("hintSingle")}</p>
      </div>

      <form action={action} className="flex flex-col gap-4">
        <input type="hidden" name="storeId" value={storeId} />
        <input type="hidden" name="productId" value={productId} />
        <input type="hidden" name="rows" value={JSON.stringify(payload)} />
        <input type="hidden" name="optionName" value={JSON.stringify(several && !multi ? optionName : {})} />
        <input type="hidden" name="defaultKey" value={effectiveDefault} />

        {several && !multi && (
          <div className="grid max-w-sm gap-1.5">
            <Label htmlFor="option-name">{t("chooseBy")}</Label>
            <Input
              id="option-name"
              value={optionName[locale] ?? pickJson(optionName, locale, defaultLocale)}
              placeholder={t("chooseByPlaceholder")}
              onChange={(e) => {
                setOptionName((prev) => ({ ...prev, [locale]: e.target.value }));
                setDirty(true);
              }}
            />
          </div>
        )}

        {/* Column headings, desktop only; on phones every field carries its own label. */}
        <div className={cn("hidden gap-2 px-1 text-xs font-medium text-muted-foreground lg:grid", several ? "lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_7rem_minmax(0,1fr)_minmax(0,1.4fr)_4.5rem]" : "lg:grid-cols-[minmax(0,1fr)_7rem_minmax(0,1fr)_minmax(0,1.4fr)_4.5rem]")}>
          {several && <span>{t("name")}</span>}
          <span>{t("price")}</span>
          <span>{t("stock")}</span>
          <span>{t("sku")}</span>
          <span>{t("buyLink")}</span>
          <span />
        </div>

        <ul className="flex flex-col gap-2">
          {rows.map((r) => {
            const f = (name: string) => `${name}-${r.key}`;
            const stockEditable = r.stockQty == null || (r.track_inventory && r.stockQty === 0);
            const isOpen = open === r.key;
            return (
              <li key={r.key} className={cn("rounded-lg border p-2", !r.is_active && "bg-muted/40", errorRow === r.key && "border-destructive")}>
                <div className={cn("grid items-end gap-2 sm:grid-cols-2", several ? "lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_7rem_minmax(0,1fr)_minmax(0,1.4fr)_4.5rem]" : "lg:grid-cols-[minmax(0,1fr)_7rem_minmax(0,1fr)_minmax(0,1.4fr)_4.5rem]")}>
                  {several && (
                    <Field id={f("name")} label={t("name")}>
                      {r.fixedLabel != null ? (
                        <span className="flex h-9 items-center truncate px-1 font-medium">{r.fixedLabel || t("unnamed")}</span>
                      ) : (
                        <Input id={f("name")} value={nameOf(r)} placeholder={t("namePlaceholder")} aria-invalid={bad(r, "name") || undefined} onChange={(e) => patch(r.key, { name: { ...r.name, [locale]: e.target.value } })} />
                      )}
                    </Field>
                  )}
                  <Field id={f("price")} label={t("price")}>
                    <MoneyField id={f("price")} currency={currency} value={r.price} invalid={bad(r, "price")} required onChange={(v) => patch(r.key, { price: v })} />
                  </Field>
                  <Field id={f("stock")} label={t("stock")}>
                    {!r.track_inventory ? (
                      <span className="flex h-9 items-center px-1 text-sm text-muted-foreground">{t("notTracked")}</span>
                    ) : stockEditable ? (
                      <Input id={f("stock")} inputMode="numeric" dir="ltr" className="tabular-nums" value={r.initial_stock} placeholder="0" aria-invalid={bad(r, "initial_stock") || undefined} onChange={(e) => patch(r.key, { initial_stock: digitsOnly(e.target.value) })} />
                    ) : (
                      <Link href={`/admin/inventory?q=${encodeURIComponent(r.sku)}`} title={t("stockViaInventory")} className="flex h-9 items-center gap-1 px-1 text-sm tabular-nums hover:underline">
                        {num.format(r.stockQty ?? 0)}
                        <span className="text-xs text-muted-foreground">{t("adjust")}</span>
                      </Link>
                    )}
                  </Field>
                  <Field id={f("sku")} label={t("sku")}>
                    <LatinInput kind="code" id={f("sku")} value={r.sku} className="tracking-normal" onChange={(e) => patch(r.key, { sku: e.target.value })} />
                  </Field>
                  <Field id={f("link")} label={t("buyLink")}>
                    <InputGroup>
                      <InputGroupInput id={f("link")} dir="ltr" inputMode="url" autoComplete="off" placeholder="https://www.trendyol.com/…" value={r.source_url} aria-invalid={bad(r, "source_url") || undefined} onChange={(e) => patch(r.key, { source_url: e.target.value.trim() })} />
                      {/^https?:\/\//.test(r.source_url) && (
                        <InputGroupAddon align="inline-end">
                          <a href={r.source_url} target="_blank" rel="noreferrer" aria-label={t("openLink")} className="text-muted-foreground hover:text-foreground">
                            <ExternalLink className="size-4" />
                          </a>
                        </InputGroupAddon>
                      )}
                    </InputGroup>
                  </Field>
                  <div className="flex items-center justify-end gap-0.5 sm:col-span-2 lg:col-span-1">
                    <Button type="button" variant="ghost" size="icon-sm" aria-expanded={isOpen} aria-label={t("more")} title={t("more")} onClick={() => setOpen(isOpen ? null : r.key)} className={cn(isOpen && "bg-muted")}>
                      <Settings2 />
                    </Button>
                    {rows.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={t("remove")}
                        title={t("remove")}
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => {
                          setRows((prev) => prev.filter((x) => x.key !== r.key));
                          setDirty(true);
                        }}
                      >
                        <Trash2 />
                      </Button>
                    )}
                  </div>
                </div>

                {isOpen && (
                  <div className="mt-3 grid gap-3 border-t pt-3 sm:grid-cols-2 lg:grid-cols-4">
                    <Field id={f("compare")} label={t("compareAt")} hint={t("compareAtHint")}>
                      <MoneyField id={f("compare")} currency={currency} value={r.compare_at_price} invalid={bad(r, "compare_at_price")} onChange={(v) => patch(r.key, { compare_at_price: v })} />
                    </Field>
                    <Field id={f("cost")} label={t("cost")} hint={t("costHint")}>
                      <MoneyField id={f("cost")} currency={currency} value={r.cost_price} invalid={bad(r, "cost_price")} onChange={(v) => patch(r.key, { cost_price: v })} />
                    </Field>
                    <Field id={f("weight")} label={t("weight")}>
                      <Input id={f("weight")} inputMode="numeric" dir="ltr" className="tabular-nums" value={r.weight_grams} aria-invalid={bad(r, "weight_grams") || undefined} onChange={(e) => patch(r.key, { weight_grams: digitsOnly(e.target.value) })} />
                    </Field>
                    <Field id={f("barcode")} label={t("barcode")}>
                      <LatinInput kind="code" id={f("barcode")} value={r.barcode} className="normal-case tracking-normal" onChange={(e) => patch(r.key, { barcode: e.target.value })} />
                    </Field>
                    <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm sm:col-span-2 lg:col-span-4">
                      <Toggle label={t("isActive")} checked={r.is_active} onChange={(v) => patch(r.key, { is_active: v })} />
                      <Toggle label={t("trackInventory")} checked={r.track_inventory} onChange={(v) => patch(r.key, { track_inventory: v })} />
                      <Toggle label={t("allowBackorder")} checked={r.allow_backorder} onChange={(v) => patch(r.key, { allow_backorder: v })} />
                      {several && (
                        <Toggle
                          label={t("isDefault")}
                          checked={effectiveDefault === r.key}
                          onChange={(v) => {
                            if (v) setDefaultKey(r.key);
                            setDirty(true);
                          }}
                        />
                      )}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        <div className="flex flex-wrap items-center gap-2">
          {several ? (
            !multi && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setRows((prev) => [...prev, blankRow(prev[prev.length - 1])]);
                  setDirty(true);
                }}
              >
                <Plus data-icon="inline-start" />
                {t("addRow")}
              </Button>
            )
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setSeveral(true);
                setRows((prev) => [...prev, blankRow(prev[0])]);
                setDirty(true);
              }}
            >
              <Plus data-icon="inline-start" />
              {t("makeSeveral")}
            </Button>
          )}
          <Button type="submit" disabled={pending || !dirty} className="ms-auto">
            {pending ? tc("saving") : tc("save")}
          </Button>
        </div>
      </form>
    </section>
  );
}

function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid min-w-0 gap-1">
      <Label htmlFor={id} className="text-xs font-medium text-muted-foreground lg:sr-only">
        {label}
      </Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function MoneyField({ id, currency, value, onChange, invalid, required }: { id: string; currency: string; value: string; onChange: (v: string) => void; invalid?: boolean; required?: boolean }) {
  return (
    <InputGroup>
      <InputGroupInput id={id} value={value} required={required} placeholder="0.00" inputMode="decimal" dir="ltr" autoComplete="off" className="text-start tabular-nums" aria-invalid={invalid || undefined} onChange={(e) => onChange(ascii(e.target.value))} />
      <InputGroupAddon align="inline-end">
        <InputGroupText className="text-xs font-medium tracking-wide uppercase">{currency}</InputGroupText>
      </InputGroupAddon>
    </InputGroup>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <Label className="flex items-center gap-2 font-normal">
      <Switch size="sm" checked={checked} onCheckedChange={onChange} />
      {label}
    </Label>
  );
}
