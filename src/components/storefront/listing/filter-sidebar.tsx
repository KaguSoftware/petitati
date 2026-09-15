"use client";

import { useTranslations } from "next-intl";
import { FilterPanel, type FilterPanelProps } from "./filter-panel";

/** Desktop only; the phone gets the same panel inside FilterSheet. */
export function FilterSidebar(props: FilterPanelProps) {
  const t = useTranslations("shop");
  return (
    <aside aria-label={t("filters")} className="hidden @desktop:block">
      <FilterPanel {...props} />
    </aside>
  );
}
