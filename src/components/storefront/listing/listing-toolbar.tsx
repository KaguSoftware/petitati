import { getTranslations } from "next-intl/server";
import type { FilterPanelProps } from "./filter-panel";
import { FilterSheet } from "./filter-sheet";
import { SortSelect } from "./sort-select";

/** The row above the grid: result count, the phone "Filters" button and the sort select. */
export async function ListingToolbar({ total, ...panel }: FilterPanelProps & { total: number }) {
  const t = await getTranslations("shop");
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-sm">
      <p className="text-muted-foreground">{t("results", { count: total })}</p>
      <div className="flex items-center gap-2">
        <FilterSheet total={total} {...panel} />
        <SortSelect />
      </div>
    </div>
  );
}
