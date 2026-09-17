import { BadgeCheck } from "lucide-react";
import { RatingStars } from "@/components/storefront/shared/rating-stars";
import type { ReviewsProps } from "../types";
import { dateTimeFormat } from "@/lib/number";

/** Speech bubbles in a row that scrolls sideways; the score and the form sit above. */
export function ReviewsPlayful({ reviews, ratingAvg, ratingCount, locale, labels, formSlot }: ReviewsProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-4">
        <h2 className="text-2xl font-bold tracking-tight">{labels.title}</h2>
        {ratingCount > 0 && (
          <div className="flex items-center gap-3 rounded-full bg-accent/20 px-4 py-2 ring-1 ring-foreground/5">
            <span className="font-heading text-2xl font-bold tabular-nums text-accent-foreground">{ratingAvg.toFixed(1)}</span>
            <RatingStars value={ratingAvg} count={ratingCount} size={16} />
          </div>
        )}
      </div>
      {reviews.length === 0 ? (
        <p className="rounded-3xl bg-muted/60 px-6 py-10 text-center text-muted-foreground">{labels.empty}</p>
      ) : (
        <ul className="bleed-gutter flex snap-x gap-4 overflow-x-auto pt-1 pb-6 contain-inline-size [scrollbar-width:thin]">
          {reviews.map((r) => (
            <li
              key={r.id}
              className="relative mb-2 flex w-[85%] shrink-0 snap-start flex-col gap-1.5 rounded-3xl bg-muted p-5 after:absolute after:bottom-0 after:start-8 after:size-4 after:translate-y-1/2 after:rotate-45 after:rounded-sm after:bg-muted @phablet:w-[60%] @desktop:w-[38%]"
            >
              <div className="flex flex-wrap items-center gap-2">
                <RatingStars value={r.rating} />
                <time className="ms-auto text-xs text-muted-foreground" dateTime={r.createdAt}>
                  {dateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(r.createdAt))}
                </time>
              </div>
              {r.title && <p className="bidi-auto font-semibold">{r.title}</p>}
              {r.body && <p className="bidi-auto text-sm text-muted-foreground">{r.body}</p>}
              <div className="mt-auto flex flex-wrap items-center gap-2 pt-2">
                <span className="text-sm font-semibold">{r.authorName}</span>
                {r.isVerifiedPurchase && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-background px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    <BadgeCheck className="size-3.5" /> {labels.verified}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="rounded-3xl bg-primary/5 p-5 ring-1 ring-foreground/5">{formSlot}</div>
    </div>
  );
}
