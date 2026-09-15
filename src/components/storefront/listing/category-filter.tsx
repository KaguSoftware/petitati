"use client";

import { ChevronLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { listingHref } from "./listing-params";
import { useListingParams } from "./use-listing-params";

export interface CategoryNav {
  /** one level up, when the page is inside a category */
  parent?: { href: string; label: string };
  /** the children of the current category (or its siblings on a leaf), each with its product count */
  items: { href: string; label: string; count: number; current?: boolean }[];
}

/**
 * "Categories" at the top of the filter sidebar: where the subcategory tiles used to be (owner,
 * 2026-09-15). The enclosing FilterSection draws the title. Links, not checkboxes — a category is a page. The current filters (search, price,
 * stock…) travel with the link so narrowing down never resets what the shopper set.
 */
export function CategoryFilter({ nav, size = "sm" }: { nav: CategoryNav; size?: "sm" | "lg" }) {
  const tn = useTranslations("nav");
  const t = useTranslations("shop");
  const { params } = useListingParams();
  const keep: Record<string, string | undefined> = {};
  for (const k of ["q", "min", "max", "stock", "sale", "sort"] as const)
    keep[k] = params.get(k) ?? undefined;
  if (nav.items.length === 0 && !nav.parent) return null;
  const lg = size === "lg";
  const row = lg ? "min-h-12 text-base" : "min-h-9 text-sm";
  const count = lg ? "text-label" : "text-caption";

  return (
    <nav aria-label={tn("categories")} className="flex flex-col gap-1">
      {nav.parent && (
        <Link
          href={listingHref(nav.parent.href, keep)}
          className={cn(
            "text-primary hover:text-foreground focus-ring flex items-center gap-1 transition-colors",
            row,
          )}
        >
          <ChevronLeft aria-hidden className={cn("rtl:-scale-x-100", lg ? "size-5" : "size-4")} />
          <span className="bidi-auto truncate">{t("allIn", { name: nav.parent.label })}</span>
        </Link>
      )}
      <ul className="flex flex-col">
        {nav.items.map((c) => (
          <li key={c.href}>
            <Link
              href={listingHref(c.href, keep)}
              aria-current={c.current ? "page" : undefined}
              className={cn(
                "hover:text-primary focus-ring flex items-center gap-3 rounded-md transition-colors",
                row,
                c.current ? "text-foreground font-semibold" : "text-foreground/85",
              )}
            >
              <span className="bidi-auto min-w-0 flex-1 truncate">{c.label}</span>
              <span className={cn("text-muted-foreground tabular-nums", count)} dir="ltr">
                {c.count}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
