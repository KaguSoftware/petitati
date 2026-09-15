import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  title: string;
  /** `sidebar`: a white tile per section; `sheet`: plain blocks separated by the sheet's dividers */
  variant: "sidebar" | "sheet";
  /** the sheet folds long sections (native details, no script) */
  collapsible?: boolean;
  defaultOpen?: boolean;
  /** heading tag; the section's own heading is visible, so children should not repeat it */
  as?: "h2" | "h3";
  children: ReactNode;
  className?: string;
}

const TITLE = "text-sm font-semibold";

/** One block of the filter panel: a titled tile in the sidebar, a foldable block in the phone sheet. */
export function FilterSection({ title, variant, collapsible, defaultOpen = true, as: Heading = "h3", children, className }: Props) {
  if (variant === "sheet" && collapsible) {
    return (
      <details open={defaultOpen} className={cn("group py-4", className)}>
        <summary className="flex min-h-9 cursor-pointer list-none items-center justify-between gap-3 focus-ring [&::-webkit-details-marker]:hidden">
          <Heading className={TITLE}>{title}</Heading>
          <ChevronDown aria-hidden className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
        </summary>
        <div className="pt-2">{children}</div>
      </details>
    );
  }
  return (
    <section className={cn("flex flex-col gap-3", variant === "sidebar" ? "rounded-2xl bg-card p-4 shadow-sm ring-1 ring-foreground/5" : "py-4", className)}>
      <Heading className={TITLE}>{title}</Heading>
      {children}
    </section>
  );
}
