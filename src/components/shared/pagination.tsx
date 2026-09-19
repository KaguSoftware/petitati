import { ChevronLeft, ChevronRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

interface Props {
  page: number;
  pageSize: number;
  total: number;
  basePath: string;
  query: Record<string, string | undefined>;
  /** `range`: a "{from}–{to} of {total}" template (admin tables) shown instead of "page / pages". */
  labels: { prev: string; next: string; summary?: string; range?: string };
  className?: string;
}

/** Prev / next pagination that preserves the current query. Used by the storefront and admin. */
export function Pagination({ page, pageSize, total, basePath, query, labels, className }: Props) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  const href = (p: number) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) if (v) q.set(k, v);
    q.set("page", String(p));
    return `${basePath}?${q.toString()}`;
  };
  const cls = (disabled: boolean) => cn(buttonVariants({ variant: "outline", size: "sm" }), disabled && "pointer-events-none opacity-40");
  return (
    <nav className={cn("flex items-center justify-center gap-3 text-sm", className)}>
      {/* Disabled ends are spans: a link to page 0 (or pages + 1) is still a link to a crawler. */}
      {page > 1 ? (
        <Link href={href(page - 1)} rel="prev" className={cls(false)}>
          <ChevronLeft className="rtl:-scale-x-100" />
          {labels.prev}
        </Link>
      ) : (
        <span aria-disabled="true" className={cls(true)}>
          <ChevronLeft className="rtl:-scale-x-100" />
          {labels.prev}
        </span>
      )}
      <span className="text-muted-foreground tabular-nums">{labels.summary ?? (labels.range ? rangeText(labels.range, page, pageSize, total) : `${page} / ${pages}`)}</span>
      {page < pages ? (
        <Link href={href(page + 1)} rel="next" className={cls(false)}>
          {labels.next}
          <ChevronRight className="rtl:-scale-x-100" />
        </Link>
      ) : (
        <span aria-disabled="true" className={cls(true)}>
          {labels.next}
          <ChevronRight className="rtl:-scale-x-100" />
        </span>
      )}
    </nav>
  );
}

/** "21–40 of 340" from a template with {from}, {to} and {total}. */
function rangeText(template: string, page: number, pageSize: number, total: number) {
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return template.replace("{from}", String(from)).replace("{to}", String(to)).replace("{total}", String(total));
}
