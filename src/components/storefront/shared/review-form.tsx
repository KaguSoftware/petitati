"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { submitReviewAction, type SimpleState } from "@/lib/account/actions";
import { cn } from "@/lib/utils";

const TITLE_MAX = 120;

export function ReviewForm({ storeSlug, productId }: { storeSlug: string; productId: string }) {
  const t = useTranslations("product");
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [state, action, pending] = useActionState(submitReviewAction, {} as SimpleState);

  if (state.ok)
    return (
      <p role="status" className="text-sm text-muted-foreground">
        {t("reviewSubmitted")}
      </p>
    );

  return (
    <form action={action} className="flex flex-col gap-3 rounded-xl bg-card p-4 shadow-sm ring-1 ring-foreground/5">
      <input type="hidden" name="storeSlug" value={storeSlug} />
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="rating" value={rating} />
      <p className="font-semibold">{t("writeReview")}</p>
      <div className="inline-flex self-start" dir="ltr">
        {[1, 2, 3, 4, 5].map((i) => (
          <button
            key={i}
            type="button"
            aria-label={t("rateStars", { count: i })}
            aria-pressed={i === rating}
            onClick={() => setRating(i)}
            className="grid size-11 place-items-center rounded-md transition-[color,background-color,scale] hover:bg-muted active:scale-90 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Star className={cn("size-5", i <= rating ? "fill-accent text-accent" : "text-muted-foreground/40")} />
          </button>
        ))}
      </div>
      <div className="grid gap-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <Label htmlFor="review-title">{t("reviewTitle")}</Label>
          <span aria-live="polite" className="text-caption text-muted-foreground tabular-nums">
            <bdi dir="ltr">
              {title.length}/{TITLE_MAX}
            </bdi>
          </span>
        </div>
        <Input id="review-title" name="title" maxLength={TITLE_MAX} value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="review-body">
          {t("reviewBody")}
          <span aria-hidden className="text-destructive">
            *
          </span>
        </Label>
        <Textarea id="review-body" name="body" required minLength={3} rows={3} />
      </div>
      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {t.has(`errors.${state.error}`) ? t(`errors.${state.error}`) : t("errors.failed")}
        </p>
      )}
      <Button type="submit" size="xl" disabled={pending} className="self-start">
        {t("writeReview")}
      </Button>
    </form>
  );
}
