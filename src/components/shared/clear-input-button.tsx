"use client";

import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

/**
 * The × inside a search box (the browser's own is hidden because it cannot be styled or
 * translated). Sits on the inline-end edge; the caller clears its value and refocuses the input.
 */
export function ClearInputButton({ onClear, className }: { onClear: () => void; className?: string }) {
  const t = useTranslations("common");
  return (
    <button
      type="button"
      onClick={onClear}
      aria-label={t("clearSearch")}
      className={cn(
        "absolute end-1 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none",
        className,
      )}
    >
      <X aria-hidden className="size-4" />
    </button>
  );
}
