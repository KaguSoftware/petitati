"use client";

import { Minus, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

interface Props {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number | null;
  disabled?: boolean;
  className?: string;
}

/**
 * The one quantity stepper. The product page and the cart each had their own copy of this widget
 * at different heights (44px and 40px) with `aria-label="-"` / `"+"` — untranslated punctuation,
 * announced by screen readers as "hyphen, button".
 *
 * `dir="ltr"` on purpose: a stepper reads minus, count, plus in every locale, including RTL.
 * Buttons are 44px so they clear the touch-target floor on phones.
 */
export function QuantityStepper({ value, onChange, min = 1, max = null, disabled = false, className }: Props) {
  const t = useTranslations("product");
  const atMin = disabled || value <= min;
  const atMax = disabled || (max !== null && value >= max);
  const step = "grid size-11 place-items-center transition-colors hover:bg-muted disabled:opacity-40 disabled:hover:bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset";

  return (
    <div dir="ltr" className={cn("inline-flex h-11 items-center rounded-lg border bg-card", className)}>
      <button type="button" aria-label={t("decreaseQty")} className={cn(step, "rounded-s-lg")} disabled={atMin} onClick={() => onChange(Math.max(min, value - 1))}>
        <Minus className="size-4" />
      </button>
      <output aria-label={t("quantity")} className="min-w-9 px-1 text-center text-sm tabular-nums">
        {value}
      </output>
      <button type="button" aria-label={t("increaseQty")} className={cn(step, "rounded-e-lg")} disabled={atMax} onClick={() => onChange(max !== null ? Math.min(max, value + 1) : value + 1)}>
        <Plus className="size-4" />
      </button>
    </div>
  );
}
