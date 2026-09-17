import type { LucideIcon } from "lucide-react";
import { PackageOpen } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Props {
  icon?: LucideIcon;
  title: ReactNode;
  description?: ReactNode;
  /** Usually a `Link` styled with `buttonVariants({ size: "xl" })`. */
  action?: ReactNode;
  /** `panel` (default) sits on a muted tile; `plain` has no box, for use inside an existing panel. */
  tone?: "panel" | "plain";
  className?: string;
}

/**
 * The one empty state for the storefront (cart, orders, wishlist, addresses, search results,
 * reviews, brands): an icon disc on the theme's muted tint, a short title, an optional line of
 * help and one primary action. Shop-sized so it reads on a phone.
 */
export function EmptyState({ icon: Icon = PackageOpen, title, description, action, tone = "panel", className }: Props) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-4 px-6 text-center", tone === "panel" ? "rounded-xl bg-card py-14 shadow-sm ring-1 ring-foreground/5 @tablet:py-20" : "py-10", className)}>
      <span aria-hidden className="grid size-16 place-items-center rounded-full bg-muted text-primary">
        <Icon className="size-7" strokeWidth={1.75} />
      </span>
      <div className="flex flex-col gap-1.5">
        <p className="bidi-auto font-heading text-lg font-semibold tracking-tight">{title}</p>
        {description && <p className="bidi-auto max-w-sm text-sm text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
