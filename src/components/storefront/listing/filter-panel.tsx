"use client";

import { useId } from "react";
import { useTranslations } from "next-intl";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { ListingFacets } from "@/lib/catalog/types";
import { cn } from "@/lib/utils";
import { BrandFilter } from "./brand-filter";
import { CategoryFilter, type CategoryNav } from "./category-filter";
import { FilterSection } from "./filter-section";
import { PriceFilter } from "./price-filter";
import { useListingParams } from "./use-listing-params";

export interface FilterPanelProps {
  facets: ListingFacets;
  currency: string;
  locale: string;
  /** the /b/<slug> page fixes the brand, so it shows no brand section */
  hideBrands?: boolean;
  /** slug → name for every brand of the store, so a ticked brand keeps its name even when the other filters leave it with no products */
  brandNames: Record<string, string>;
  /** the sidebar's category links (children of the scope, siblings on a leaf, top-level on /shop) */
  categoryNav: CategoryNav;
  activeCount: number;
}

/**
 * The one filter body, used by the desktop sidebar (`sidebar`: a white tile per section) and the
 * phone sheet (`sheet`: plain blocks with dividers, the long ones foldable). Filters apply as they change.
 */
export function FilterPanel({ facets, currency, locale, hideBrands, brandNames, categoryNav, activeCount, variant }: FilterPanelProps & { variant: "sidebar" | "sheet" }) {
  const t = useTranslations("shop");
  const tn = useTranslations("nav");
  const { params, set, clearAll } = useListingParams();
  const stockId = useId();
  const saleId = useId();
  const stock = params.get("stock") === "1";
  const sale = params.get("sale") === "1";
  const hasCategories = categoryNav.items.length > 0 || !!categoryNav.parent;

  return (
    <div className={cn("flex flex-col", variant === "sidebar" ? "gap-4" : "divide-y")}>
      {hasCategories && (
        <FilterSection title={tn("categories")} variant={variant}>
          <CategoryFilter nav={categoryNav} />
        </FilterSection>
      )}
      {!hideBrands && facets.brands.length > 0 && (
        <FilterSection title={t("brands")} variant={variant} collapsible>
          <BrandFilter brands={facets.brands} brandNames={brandNames} />
        </FilterSection>
      )}
      <FilterSection title={t("price")} variant={variant} collapsible>
        <PriceFilter priceMin={facets.priceMin} priceMax={facets.priceMax} quartiles={facets.quartiles} currency={currency} locale={locale} />
      </FilterSection>
      <FilterSection title={t("availability")} variant={variant}>
        <div className="flex flex-col">
          <div className="flex min-h-10 items-center justify-between gap-3">
            <Label htmlFor={stockId} className="cursor-pointer font-normal">
              {t("inStockOnly")}
            </Label>
            <Switch id={stockId} checked={stock} onCheckedChange={(on) => set({ stock: on ? "1" : null })} />
          </div>
          <div className="flex min-h-10 items-center justify-between gap-3">
            <Label htmlFor={saleId} className="cursor-pointer font-normal">
              {t("onSaleOnly")}
            </Label>
            <Switch id={saleId} checked={sale} onCheckedChange={(on) => set({ sale: on ? "1" : null })} />
          </div>
        </div>
      </FilterSection>
      {activeCount > 0 && (
        <div className={cn(variant === "sheet" && "pt-4")}>
          <button type="button" onClick={clearAll} className="text-sm font-medium text-primary underline-offset-4 hover:underline focus-ring">
            {t("clearAll")}
          </button>
        </div>
      )}
    </div>
  );
}
