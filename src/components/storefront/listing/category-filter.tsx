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
 * 2026-09-15). Links, not checkboxes — a category is a page. The current filters (search, price,
 * stock…) travel with the link so narrowing down never resets what the shopper set.
 */
export function CategoryFilter({ nav }: { nav: CategoryNav }) {
  const tn = useTranslations("nav");
  const t = useTranslations("shop");
  const { params } = useListingParams();
  const keep: Record<string, string | undefined> = {};
  for (const k of ["q", "min", "max", "stock", "sale", "sort"] as const) keep[k] = params.get(k) ?? undefined;
  if (nav.items.length === 0 && !nav.parent) return null;

  return (
    <nav aria-label={tn("categories")} className="flex flex-col gap-2">
      <p className="text-sm font-semibold">{tn("categories")}</p>
      {nav.parent && (
        <Link href={listingHref(nav.parent.href, keep)} className="flex min-h-9 items-center gap-1 text-sm text-primary transition-colors hover:text-foreground focus-ring">
          <ChevronLeft aria-hidden className="size-4 rtl:-scale-x-100" />
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
                "flex min-h-9 items-center gap-3 rounded-md text-sm transition-colors hover:text-primary focus-ring",
                c.current ? "font-semibold text-foreground" : "text-foreground/85",
              )}
            >
              <span className="bidi-auto min-w-0 flex-1 truncate">{c.label}</span>
              <span className="text-caption text-muted-foreground tabular-nums" dir="ltr">
                {c.count}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
