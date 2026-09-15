"use client";

import { useState } from "react";
import { SlidersHorizontal, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { OverlayScroll } from "@/components/ui/overlay-scroll";
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { FilterPanel, type FilterPanelProps } from "./filter-panel";

/**
 * Phone/tablet filters: a "Filters (n)" button opening a drawer from the end edge. Filters apply
 * as they change (the URL updates behind the sheet, which keeps its own open state), and the
 * footer button reads the live count so the shopper knows what "Show products" will give them.
 */
export function FilterSheet(props: FilterPanelProps & { total: number }) {
  const t = useTranslations("shop");
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant="outline" size="lg" className="bg-card @desktop:hidden" />}>
        <SlidersHorizontal data-icon="inline-start" />
        {props.activeCount > 0 ? t("filtersWithCount", { count: props.activeCount }) : t("filters")}
      </SheetTrigger>
      <SheetContent side="end" showCloseButton={false} className="gap-0 p-0">
        <div className="flex h-16 shrink-0 items-center justify-between gap-2 border-b px-4">
          <SheetTitle className="text-base font-semibold">{t("filters")}</SheetTitle>
          <SheetClose render={<Button variant="ghost" size="icon-lg" aria-label={t("closeFilters")} />}>
            <XIcon />
          </SheetClose>
        </div>
        <OverlayScroll className="flex-1">
          <div className="px-4 py-1">
            <FilterPanel {...props} variant="sheet" />
          </div>
        </OverlayScroll>
        <div className="shrink-0 border-t p-3">
          <SheetClose render={<Button size="xl" className="w-full" />}>{t("showResults", { count: props.total })}</SheetClose>
        </div>
      </SheetContent>
    </Sheet>
  );
}
