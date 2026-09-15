"use client";

import { useId, useState } from "react";
import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ListingFacets } from "@/lib/catalog/types";
import { cn } from "@/lib/utils";
import { parseBrands } from "./listing-params";
import { useListingParams } from "./use-listing-params";

const SHOW = 8;

/**
 * The brand filter: a search box over the brands actually present in this scope, then checkbox
 * rows with counts. This is what the old 122-entry "All brands" select became. Ticked brands are
 * pinned to the top so they never scroll out of sight; the rest are cut at eight with a toggle.
 */
export function BrandFilter({
  brands: facetBrands,
  brandNames,
  size = "sm",
}: {
  brands: ListingFacets["brands"];
  brandNames: Record<string, string>;
  size?: "sm" | "lg";
}) {
  const t = useTranslations("shop");
  const { params, set } = useListingParams();
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(false);
  const searchId = useId();
  const lg = size === "lg";
  const selected = parseBrands(params.get("brand"));
  const selectedSet = new Set(selected);
  // A ticked brand that the price/stock filters emptied still needs a row, or it could never be unticked.
  const brands = [
    ...facetBrands,
    ...selected
      .filter((slug) => !facetBrands.some((b) => b.slug === slug))
      .map((slug) => ({ id: slug, slug, name: brandNames[slug] ?? slug, count: 0 })),
  ];

  const needle = query.trim().toLowerCase();
  const matching = needle ? brands.filter((b) => b.name.toLowerCase().includes(needle)) : brands;
  const pinned = matching.filter((b) => selectedSet.has(b.slug));
  const rest = matching.filter((b) => !selectedSet.has(b.slug));
  const hidden = !needle && !expanded ? Math.max(0, pinned.length + rest.length - SHOW) : 0;
  const shown = [...pinned, ...rest].slice(0, hidden ? SHOW : undefined);

  const toggle = (slug: string, on: boolean) => {
    const next = on ? [...selected, slug] : selected.filter((s) => s !== slug);
    set({ brand: next.length ? [...new Set(next)].sort().join(",") : null });
  };

  return (
    <fieldset className="flex min-w-0 flex-col gap-2">
      <legend className="sr-only">{t("brands")}</legend>
      {brands.length > SHOW && (
        <div className="relative">
          <Search
            aria-hidden
            className="text-muted-foreground pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2"
          />
          <Input
            id={searchId}
            type="search"
            dir="auto"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchBrands")}
            aria-label={t("searchBrands")}
            className={cn(
              "bg-background rounded-lg ps-9 [&::-webkit-search-cancel-button]:appearance-none",
              lg ? "text-base! h-11!" : "h-10!",
            )}
          />
        </div>
      )}
      {shown.length === 0 ? (
        <p className={cn("text-muted-foreground py-2", lg ? "text-base" : "text-sm")}>
          {t("noBrandsFound")}
        </p>
      ) : (
        <ul className="flex flex-col">
          {shown.map((b) => {
            const id = `${searchId}-${b.slug}`;
            const on = selectedSet.has(b.slug);
            return (
              <li
                key={b.id}
                className={cn("flex items-center gap-3", lg ? "min-h-12" : "min-h-10")}
              >
                <Checkbox
                  id={id}
                  checked={on}
                  onCheckedChange={(checked) => toggle(b.slug, checked === true)}
                  className={cn(lg && "size-5")}
                />
                <Label
                  htmlFor={id}
                  className={cn(
                    "bidi-auto min-w-0 flex-1 cursor-pointer truncate font-normal",
                    lg && "text-base",
                    on && "font-medium",
                  )}
                >
                  {b.name}
                </Label>
                <span
                  className={cn(
                    "text-muted-foreground tabular-nums",
                    lg ? "text-label" : "text-caption",
                  )}
                  dir="ltr"
                >
                  {b.count}
                </span>
              </li>
            );
          })}
        </ul>
      )}
      {(hidden > 0 || (expanded && !needle && brands.length > SHOW)) && (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
          className={cn(
            "text-primary focus-ring self-start py-1 font-medium underline-offset-4 hover:underline",
            lg ? "text-base min-h-11" : "text-sm",
          )}
        >
          {expanded ? t("showFewer") : t("showAllBrands", { count: brands.length })}
        </button>
      )}
    </fieldset>
  );
}
