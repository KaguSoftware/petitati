"use client";

import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ListingFacets } from "@/lib/catalog/types";
import { parseBrands } from "./listing-params";
import { rangeLabel } from "./price-filter";
import { useListingParams } from "./use-listing-params";

interface Props {
  facets: ListingFacets;
  currency: string;
  locale: string;
  hideBrands?: boolean;
  brandNames: Record<string, string>;
}

/** One removable chip per active filter (and the search term), plus "Clear all". Nothing when the list is empty. */
export function ActiveFilters({ facets, currency, locale, hideBrands, brandNames }: Props) {
  const t = useTranslations("shop");
  const { params, set, clearAll } = useListingParams();
  const q = params.get("q");
  const brands = hideBrands ? [] : parseBrands(params.get("brand"));
  const min = params.get("min");
  const max = params.get("max");
  const stock = params.get("stock") === "1";
  const sale = params.get("sale") === "1";
  const nameOf = (slug: string) => facets.brands.find((b) => b.slug === slug)?.name ?? brandNames[slug] ?? slug;

  const chips: { key: string; label: string; remove: () => void; ltr?: boolean }[] = [];
  if (q) chips.push({ key: "q", label: t("searchChip", { q }), remove: () => set({ q: null }) });
  for (const slug of brands) chips.push({ key: `b:${slug}`, label: nameOf(slug), remove: () => set({ brand: brands.filter((s) => s !== slug).join(",") || null }) });
  if (min || max) {
    const r = { min: min ? Number(min) : undefined, max: max ? Number(max) : undefined };
    chips.push({ key: "price", label: rangeLabel(r, currency, locale, t), remove: () => set({ min: null, max: null }), ltr: true });
  }
  if (stock) chips.push({ key: "stock", label: t("inStockOnly"), remove: () => set({ stock: null }) });
  if (sale) chips.push({ key: "sale", label: t("onSaleOnly"), remove: () => set({ sale: null }) });
  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2" aria-label={t("activeFilters")}>
      {chips.map((c) => (
        <button
          key={c.key}
          type="button"
          onClick={c.remove}
          aria-label={t("remove", { label: c.label })}
          className="inline-flex h-9 max-w-full items-center gap-1.5 rounded-full bg-card ps-3.5 pe-2.5 text-sm ring-1 ring-foreground/10 transition-colors hover:bg-muted focus-ring"
        >
          {c.ltr ? <bdi dir="ltr" className="truncate">{c.label}</bdi> : <span className="bidi-auto truncate">{c.label}</span>}
          <X aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
        </button>
      ))}
      {chips.length > 1 && (
        <button type="button" onClick={clearAll} className="px-1 text-sm font-medium text-primary underline-offset-4 hover:underline focus-ring">
          {t("clearAll")}
        </button>
      )}
    </div>
  );
}
