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
  /** `lg` = phone sheet: 16 px title, thumb-sized fold row */
  size?: "sm" | "lg";
  children: ReactNode;
  className?: string;
}

/** One block of the filter panel: a titled tile in the sidebar, a foldable block in the phone sheet. */
export function FilterSection({
  title,
  variant,
  collapsible,
  defaultOpen = true,
  as: Heading = "h3",
  size = "sm",
  children,
  className,
}: Props) {
  const titleClass = cn("font-semibold", size === "lg" ? "text-base" : "text-sm");
  if (variant === "sheet" && collapsible) {
    return (
      <details open={defaultOpen} className={cn("group py-3", className)}>
        <summary
          className={cn(
            "focus-ring flex cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden",
            size === "lg" ? "min-h-12" : "min-h-9",
          )}
        >
          <Heading className={titleClass}>{title}</Heading>
          <ChevronDown
            aria-hidden
            className="text-muted-foreground size-5 transition-transform group-open:rotate-180"
          />
        </summary>
        <div className="pt-1 pb-2">{children}</div>
      </details>
    );
  }
  return (
    <section
      className={cn(
        "flex flex-col",
        variant === "sidebar"
          ? "bg-card ring-foreground/5 gap-3 rounded-2xl p-4 shadow-sm ring-1"
          : "gap-2 py-4",
        className,
      )}
    >
      <Heading className={cn(titleClass, size === "lg" && "flex min-h-12 items-center")}>
        {title}
      </Heading>
      {children}
    </section>
  );
}
