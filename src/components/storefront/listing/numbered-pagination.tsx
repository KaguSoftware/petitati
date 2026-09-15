import { ChevronLeft, ChevronRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { listingHref } from "./listing-params";
import { PageJump } from "./page-jump";

interface Props {
  page: number;
  pageSize: number;
  total: number;
  basePath: string;
  /** the current filters, preserved on every page link */
  query: Record<string, string | undefined>;
}

/** `1 … 4 5 6 … 13`: first and last always, the current page ±1, ellipses between. */
function window(page: number, pages: number): (number | "…")[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const set = new Set([1, pages, page - 1, page, page + 1]);
  if (page <= 3) [2, 3, 4].forEach((n) => set.add(n));
  if (page >= pages - 2) [pages - 3, pages - 2, pages - 1].forEach((n) => set.add(n));
  const nums = [...set].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  for (let i = 0; i < nums.length; i++) {
    if (i > 0 && nums[i] - nums[i - 1] > 1) out.push("…");
    out.push(nums[i]);
  }
  return out;
}

/**
 * Numbered pages with prev/next and, past seven pages, a jump box. Disabled ends are spans, not
 * links — the old prev/next component emitted `?page=0` on page 1.
 */
export async function NumberedPagination({ page, pageSize, total, basePath, query }: Props) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  const [t, tc] = await Promise.all([getTranslations("shop"), getTranslations("common")]);
  const href = (p: number) => listingHref(basePath, { ...query, page: p > 1 ? String(p) : undefined });
  const end = (disabled: boolean) => cn(buttonVariants({ variant: "outline", size: "icon-lg" }), "bg-card", disabled && "pointer-events-none opacity-40");

  return (
    <nav aria-label={t("pagination")} className="flex flex-col items-center gap-4">
      <ol className="flex flex-wrap items-center justify-center gap-1.5">
        <li>
          {page > 1 ? (
            <Link href={href(page - 1)} rel="prev" aria-label={tc("previous")} className={end(false)}>
              <ChevronLeft className="rtl:-scale-x-100" />
            </Link>
          ) : (
            <span aria-disabled="true" className={end(true)}>
              <ChevronLeft className="rtl:-scale-x-100" />
            </span>
          )}
        </li>
        {window(page, pages).map((item, i) =>
          item === "…" ? (
            <li key={`gap-${i}`} aria-hidden className="grid size-10 place-items-center text-muted-foreground">
              …
            </li>
          ) : (
            <li key={item}>
              <Link
                href={href(item)}
                aria-current={item === page ? "page" : undefined}
                aria-label={t("pageOf", { page: item, total: pages })}
                className={cn(buttonVariants({ variant: item === page ? "default" : "outline", size: "icon-lg" }), item !== page && "bg-card", "tabular-nums")}
              >
                <bdi dir="ltr">{item}</bdi>
              </Link>
            </li>
          ),
        )}
        <li>
          {page < pages ? (
            <Link href={href(page + 1)} rel="next" aria-label={tc("next")} className={end(false)}>
              <ChevronRight className="rtl:-scale-x-100" />
            </Link>
          ) : (
            <span aria-disabled="true" className={end(true)}>
              <ChevronRight className="rtl:-scale-x-100" />
            </span>
          )}
        </li>
      </ol>
      {pages > 7 && <PageJump pages={pages} basePath={basePath} query={query} />}
    </nav>
  );
}
