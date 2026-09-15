"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMoney, toMajor, toMinor } from "@/lib/money";
import { cn } from "@/lib/utils";
import { quickRanges, type QuickRange } from "./price-ranges";
import { useListingParams } from "./use-listing-params";

interface Props {
  /** the scope's real bounds and quartiles, minor units */
  priceMin: number | null;
  priceMax: number | null;
  quartiles: (number | null)[];
  currency: string;
  locale: string;
}

/** A price in major units as the shop shows it. */
function money(major: number, currency: string, locale: string) {
  return formatMoney(toMinor(major, currency), currency, locale);
}

export function rangeLabel(r: QuickRange, currency: string, locale: string, t: (key: string, values?: Record<string, string>) => string) {
  if (r.min == null && r.max != null) return t("under", { amount: money(r.max, currency, locale) });
  if (r.max == null && r.min != null) return t("over", { amount: money(r.min, currency, locale) });
  return t("priceRange", { min: money(r.min ?? 0, currency, locale), max: money(r.max ?? 0, currency, locale) });
}

/**
 * Min / max in major units plus one-tap round-number buckets over the scope's real range. The
 * inputs are keyed on the URL so a chip tap or "Clear all" resets what is typed (React 19 keeps
 * uncontrolled input state across re-renders otherwise).
 */
export function PriceFilter({ priceMin, priceMax, quartiles, currency, locale }: Props) {
  const t = useTranslations("shop");
  const { params, set } = useListingParams();
  const key = `${params.get("min") ?? ""}|${params.get("max") ?? ""}`;
  return <PriceForm key={key} priceMin={priceMin} priceMax={priceMax} quartiles={quartiles} currency={currency} locale={locale} t={t} params={params} set={set} />;
}

function PriceForm({
  priceMin,
  priceMax,
  quartiles,
  currency,
  locale,
  t,
  params,
  set,
}: Props & { t: ReturnType<typeof useTranslations>; params: URLSearchParams; set: (patch: Record<string, string | null>) => void }) {
  const minId = useId();
  const maxId = useId();
  const [min, setMin] = useState(params.get("min") ?? "");
  const [max, setMax] = useState(params.get("max") ?? "");
  const currentMin = params.get("min");
  const currentMax = params.get("max");
  const ranges = quickRanges(quartiles, currency);
  const isActive = (r: QuickRange) => (r.min != null ? String(r.min) : null) === currentMin && (r.max != null ? String(r.max) : null) === currentMax;

  const apply = () => {
    const lo = min.trim() ? String(Number(min.replace(",", "."))) : null;
    const hi = max.trim() ? String(Number(max.replace(",", "."))) : null;
    set({ min: lo && lo !== "NaN" ? lo : null, max: hi && hi !== "NaN" ? hi : null });
  };

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-2 text-sm font-semibold">{t("price")}</legend>
      <form
        className="flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          apply();
        }}
      >
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <Label htmlFor={minId} className="text-caption text-muted-foreground">
            {t("priceMin")}
          </Label>
          <Input
            id={minId}
            type="number"
            inputMode="decimal"
            min={0}
            step="any"
            dir="ltr"
            value={min}
            onChange={(e) => setMin(e.target.value)}
            placeholder={priceMin != null ? String(toMajor(priceMin, currency)) : "0"}
            className="h-10! rounded-lg bg-card"
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <Label htmlFor={maxId} className="text-caption text-muted-foreground">
            {t("priceMax")}
          </Label>
          <Input
            id={maxId}
            type="number"
            inputMode="decimal"
            min={0}
            step="any"
            dir="ltr"
            value={max}
            onChange={(e) => setMax(e.target.value)}
            placeholder={priceMax != null ? String(toMajor(priceMax, currency)) : ""}
            className="h-10! rounded-lg bg-card"
          />
        </div>
        <Button type="submit" variant="outline" size="lg" className="shrink-0 bg-card">
          {t("apply")}
        </Button>
      </form>
      {ranges.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {ranges.map((r) => {
            const on = isActive(r);
            return (
              <li key={`${r.min ?? ""}-${r.max ?? ""}`}>
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => (on ? set({ min: null, max: null }) : set({ min: r.min != null ? String(r.min) : null, max: r.max != null ? String(r.max) : null }))}
                  className={cn(
                    "inline-flex h-9 items-center rounded-full px-3.5 text-sm transition-colors focus-ring",
                    on ? "bg-primary text-primary-foreground" : "bg-card ring-1 ring-foreground/10 hover:bg-muted",
                  )}
                >
                  <bdi dir="ltr">{rangeLabel(r, currency, locale, t)}</bdi>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </fieldset>
  );
}
