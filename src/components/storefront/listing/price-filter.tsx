"use client";

import { useId, useState, type KeyboardEvent } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { formatMoney, toMajor, toMinor } from "@/lib/money";
import { cn } from "@/lib/utils";
import {
  quickRanges,
  snapBounds,
  snapValue,
  type QuickRange,
  type SliderBounds,
} from "./price-ranges";
import { useListingParams } from "./use-listing-params";

interface Props {
  /** the scope's real bounds and quartiles, minor units */
  priceMin: number | null;
  priceMax: number | null;
  quartiles: (number | null)[];
  currency: string;
  locale: string;
  /** `lg` = phone sheet: taller inputs and chips */
  size?: "sm" | "lg";
}

/** A price in major units as the shop shows it. */
function money(major: number, currency: string, locale: string) {
  return formatMoney(toMinor(major, currency), currency, locale);
}

export function rangeLabel(
  r: QuickRange,
  currency: string,
  locale: string,
  t: (key: string, values?: Record<string, string>) => string,
) {
  if (r.min == null && r.max != null) return t("under", { amount: money(r.max, currency, locale) });
  if (r.max == null && r.min != null) return t("over", { amount: money(r.min, currency, locale) });
  return t("priceRange", {
    min: money(r.min ?? 0, currency, locale),
    max: money(r.max ?? 0, currency, locale),
  });
}

/**
 * A two-thumb slider over the scope's real price range, the two figures under it as small inputs
 * (typing works too), and one-tap round-number buckets. The form is keyed on the URL so a chip tap
 * or "Clear all" resets what is dragged or typed (React 19 keeps local state across re-renders
 * otherwise). A thumb parked on the track's end means "no bound" and writes nothing to the URL.
 */
export function PriceFilter({
  priceMin,
  priceMax,
  quartiles,
  currency,
  locale,
  size = "sm",
}: Props) {
  const t = useTranslations("shop");
  const { params, set } = useListingParams();
  const key = `${params.get("min") ?? ""}|${params.get("max") ?? ""}`;
  return (
    <PriceForm
      key={key}
      priceMin={priceMin}
      priceMax={priceMax}
      quartiles={quartiles}
      currency={currency}
      locale={locale}
      size={size}
      t={t}
      params={params}
      set={set}
    />
  );
}

function parse(v: string): number | null {
  const n = Number(v.trim().replace(",", "."));
  return v.trim() && Number.isFinite(n) && n >= 0 ? n : null;
}

function PriceForm({
  priceMin,
  priceMax,
  quartiles,
  currency,
  locale,
  size,
  t,
  params,
  set,
}: Props & {
  t: ReturnType<typeof useTranslations>;
  params: URLSearchParams;
  set: (patch: Record<string, string | null>) => void;
}) {
  const minId = useId();
  const maxId = useId();
  const lg = size === "lg";
  const inputClass = cn("rounded-lg bg-background", lg ? "h-11! text-base!" : "h-10!");
  const labelClass = cn("text-muted-foreground", lg ? "text-label" : "text-caption");
  const currentMin = params.get("min");
  const currentMax = params.get("max");
  const bounds = snapBounds(priceMin, priceMax, currency);
  const urlMin = currentMin != null ? parse(currentMin) : null;
  const urlMax = currentMax != null ? parse(currentMax) : null;
  const initial = (b: SliderBounds): [number, number] => {
    let lo = urlMin != null ? snapValue(urlMin, b) : b.lo;
    let hi = urlMax != null ? snapValue(urlMax, b) : b.hi;
    if (lo > hi) [lo, hi] = [hi, lo];
    return [lo, hi];
  };
  const [values, setValues] = useState<[number, number]>(() => (bounds ? initial(bounds) : [0, 0]));
  const [text, setText] = useState<[string, string]>(() => [currentMin ?? "", currentMax ?? ""]);
  const ranges = quickRanges(quartiles, currency);
  const isActive = (r: QuickRange) =>
    (r.min != null ? String(r.min) : null) === currentMin &&
    (r.max != null ? String(r.max) : null) === currentMax;

  /** Write a pair to the URL; an end sitting on the track's edge is "no bound". */
  const commit = (lo: number | null, hi: number | null) => {
    const min = lo != null && (!bounds || lo > bounds.lo) ? String(lo) : null;
    const max = hi != null && (!bounds || hi < bounds.hi) ? String(hi) : null;
    if (min === currentMin && max === currentMax) return;
    set({ min, max });
  };

  const commitTyped = () => {
    let lo = parse(text[0]);
    let hi = parse(text[1]);
    if (lo != null && hi != null && lo > hi) [lo, hi] = [hi, lo];
    commit(lo, hi);
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commitTyped();
    }
  };
  const onSlide = (v: number | readonly number[]) => {
    const [lo, hi] = v as readonly number[];
    setValues([lo, hi]);
    setText([
      bounds && lo > bounds.lo ? String(lo) : "",
      bounds && hi < bounds.hi ? String(hi) : "",
    ]);
  };

  return (
    <div className="flex flex-col gap-4">
      {bounds && (
        <div className="px-2 pt-3">
          <Slider
            aria-label={t("price")}
            value={values}
            min={bounds.lo}
            max={bounds.hi}
            step={bounds.step}
            largeStep={bounds.step * 20}
            minStepsBetweenValues={1}
            thumbCollisionBehavior="none"
            onValueChange={onSlide}
            onValueCommitted={(v) => {
              const [lo, hi] = v as readonly number[];
              commit(lo, hi);
            }}
            thumbProps={{
              getAriaLabel: (i) => (i === 0 ? t("priceMin") : t("priceMax")),
              getAriaValueText: (_, v) => money(v, currency, locale),
            }}
          />
        </div>
      )}
      <div className="flex items-end gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <Label htmlFor={minId} className={labelClass}>
            {t("priceMin")}
          </Label>
          <Input
            id={minId}
            type="number"
            inputMode="decimal"
            min={0}
            step="any"
            dir="ltr"
            value={text[0]}
            onChange={(e) => setText([e.target.value, text[1]])}
            onBlur={commitTyped}
            onKeyDown={onKey}
            placeholder={priceMin != null ? String(toMajor(priceMin, currency)) : "0"}
            className={inputClass}
          />
        </div>
        <span aria-hidden className="text-muted-foreground pb-3">
          –
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <Label htmlFor={maxId} className={labelClass}>
            {t("priceMax")}
          </Label>
          <Input
            id={maxId}
            type="number"
            inputMode="decimal"
            min={0}
            step="any"
            dir="ltr"
            value={text[1]}
            onChange={(e) => setText([text[0], e.target.value])}
            onBlur={commitTyped}
            onKeyDown={onKey}
            placeholder={priceMax != null ? String(toMajor(priceMax, currency)) : ""}
            className={inputClass}
          />
        </div>
      </div>
      {ranges.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {ranges.map((r) => {
            const on = isActive(r);
            return (
              <li key={`${r.min ?? ""}-${r.max ?? ""}`}>
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() =>
                    on
                      ? set({ min: null, max: null })
                      : set({
                          min: r.min != null ? String(r.min) : null,
                          max: r.max != null ? String(r.max) : null,
                        })
                  }
                  className={cn(
                    "focus-ring inline-flex items-center rounded-full transition-colors",
                    lg ? "text-base h-11 px-4" : "h-9 px-3.5 text-sm",
                    on ? "bg-primary text-primary-foreground" : "bg-muted/60 hover:bg-muted",
                  )}
                >
                  <bdi dir="ltr">{rangeLabel(r, currency, locale, t)}</bdi>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
