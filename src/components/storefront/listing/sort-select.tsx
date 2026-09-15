"use client";

import { useId } from "react";
import { useTranslations } from "next-intl";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ProductSort } from "@/lib/catalog/types";
import { SORTS } from "./listing-params";
import { useListingParams } from "./use-listing-params";

export function SortSelect() {
  const t = useTranslations("shop");
  const { params, set } = useListingParams();
  const id = useId();
  const current = ((params.get("sort") as ProductSort | null) ?? "newest") as ProductSort;
  const items = SORTS.map((s) => ({ value: s, label: t(`sort_${s}`) }));
  return (
    <div className="flex items-center gap-2">
      <Label htmlFor={id} className="hidden text-muted-foreground @phablet:flex">
        {t("sort")}
      </Label>
      <Select
        items={items}
        value={current}
        modal={false}
        onValueChange={(value) => {
          if (!value) return;
          set({ sort: value === "newest" ? null : String(value) });
        }}
      >
        <SelectTrigger id={id} size="sm" aria-label={t("sort")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="end" alignItemWithTrigger={false}>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
