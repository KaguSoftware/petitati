import { ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export interface Crumb {
  /** omit on the current page */
  href?: string;
  label: string;
}

/** Shop › Cats › Cat food › current. The last item is the page; chevrons mirror under RTL. */
export function Breadcrumb({ items, label, className }: { items: Crumb[]; label: string; className?: string }) {
  if (items.length === 0) return null;
  return (
    <nav aria-label={label} className={cn("text-sm text-muted-foreground", className)}>
      <ol className="flex flex-wrap items-center gap-x-1 gap-y-0.5">
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <li key={`${item.href ?? ""}:${item.label}`} className="flex min-w-0 items-center gap-1">
              {i > 0 && <ChevronRight aria-hidden className="size-3.5 shrink-0 rtl:-scale-x-100" />}
              {item.href && !last ? (
                <Link href={item.href} className="bidi-auto truncate transition-colors hover:text-primary">
                  {item.label}
                </Link>
              ) : (
                <span aria-current={last ? "page" : undefined} className="bidi-auto truncate text-foreground">
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
