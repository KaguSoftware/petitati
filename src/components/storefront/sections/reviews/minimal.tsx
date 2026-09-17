import { BadgeCheck, MessageSquareText } from "lucide-react";
import { EmptyState } from "@/components/storefront/shared/empty-state";
import { RatingStars } from "@/components/storefront/shared/rating-stars";
import type { ReviewsProps } from "../types";
import { dateTimeFormat } from "@/lib/number";

export function ReviewsMinimal({ reviews, ratingAvg, ratingCount, locale, labels, formSlot }: ReviewsProps) {
  return (
    <div className="grid gap-8 @tablet:grid-cols-[minmax(0,20rem)_1fr] @desktop:gap-12">
      <div className="flex flex-col gap-4 self-start @tablet:sticky @tablet:top-24">
        <h2 className="text-2xl font-semibold tracking-tight">{labels.title}</h2>
        {ratingCount > 0 && (
          <div className="flex items-center gap-3">
            <span className="font-heading text-4xl font-semibold tabular-nums">{ratingAvg.toFixed(1)}</span>
            <RatingStars value={ratingAvg} count={ratingCount} size={18} />
          </div>
        )}
        {formSlot}
      </div>
      {reviews.length === 0 ? (
        <EmptyState icon={MessageSquareText} title={labels.emptyTitle} description={labels.empty} />
      ) : (
        <ul className="divide-y">
          {reviews.map((r) => (
            <li key={r.id} className="flex flex-col gap-1.5 py-5 first:pt-0">
              <div className="flex flex-wrap items-center gap-2">
                <RatingStars value={r.rating} />
                <span className="text-sm font-medium">{r.authorName}</span>
                {r.isVerifiedPurchase && (
                  <span className="inline-flex items-center gap-1 text-xs text-primary">
                    <BadgeCheck className="size-3.5" /> {labels.verified}
                  </span>
                )}
                <time className="ms-auto text-xs text-muted-foreground" dateTime={r.createdAt}>
                  {dateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(r.createdAt))}
                </time>
              </div>
              {r.title && <p className="bidi-auto font-medium">{r.title}</p>}
              {r.body && <p className="bidi-auto text-sm text-muted-foreground">{r.body}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
