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
export function FilterPanel({
  facets,
  currency,
  locale,
  hideBrands,
  brandNames,
  categoryNav,
  activeCount,
  variant,
}: FilterPanelProps & { variant: "sidebar" | "sheet" }) {
  const t = useTranslations("shop");
  const tn = useTranslations("nav");
  const { params, set, clearAll } = useListingParams();
  const stockId = useId();
  const saleId = useId();
  const stock = params.get("stock") === "1";
  const sale = params.get("sale") === "1";
  const hasCategories = categoryNav.items.length > 0 || !!categoryNav.parent;
  // The phone sheet gets thumb-sized rows (48 px at 16 px); the desktop sidebar stays compact for the mouse.
  const size = variant === "sheet" ? "lg" : "sm";
  const lg = size === "lg";
  const switchRow = cn("flex items-center justify-between gap-3", lg ? "min-h-12" : "min-h-10");
  const switchLabel = cn("cursor-pointer font-normal", lg && "text-base");

  return (
    <div className={cn("flex flex-col", variant === "sidebar" ? "gap-4" : "divide-y")}>
      {hasCategories && (
        <FilterSection title={tn("categories")} variant={variant} size={size}>
          <CategoryFilter nav={categoryNav} size={size} />
        </FilterSection>
      )}
      {!hideBrands && facets.brands.length > 0 && (
        <FilterSection title={t("brands")} variant={variant} size={size} collapsible>
          <BrandFilter brands={facets.brands} brandNames={brandNames} size={size} />
        </FilterSection>
      )}
      <FilterSection title={t("price")} variant={variant} size={size} collapsible>
        <PriceFilter
          priceMin={facets.priceMin}
          priceMax={facets.priceMax}
          quartiles={facets.quartiles}
          currency={currency}
          locale={locale}
          size={size}
        />
      </FilterSection>
      <FilterSection title={t("availability")} variant={variant} size={size}>
        <div className="flex flex-col">
          <div className={switchRow}>
            <Label htmlFor={stockId} className={switchLabel}>
              {t("inStockOnly")}
            </Label>
            <Switch
              id={stockId}
              checked={stock}
              onCheckedChange={(on) => set({ stock: on ? "1" : null })}
            />
          </div>
          <div className={switchRow}>
            <Label htmlFor={saleId} className={switchLabel}>
              {t("onSaleOnly")}
            </Label>
            <Switch
              id={saleId}
              checked={sale}
              onCheckedChange={(on) => set({ sale: on ? "1" : null })}
            />
          </div>
        </div>
      </FilterSection>
      {activeCount > 0 && (
        <div className={cn(variant === "sheet" && "pt-4")}>
          <button
            type="button"
            onClick={clearAll}
            className={cn(
              "text-primary focus-ring font-medium underline-offset-4 hover:underline",
              lg ? "text-base min-h-11" : "text-sm",
            )}
          >
            {t("clearAll")}
          </button>
        </div>
      )}
    </div>
  );
}
