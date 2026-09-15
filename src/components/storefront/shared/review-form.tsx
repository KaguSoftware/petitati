"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { submitReviewAction, type SimpleState } from "@/lib/account/actions";
import { cn } from "@/lib/utils";

export function ReviewForm({ storeSlug, productId }: { storeSlug: string; productId: string }) {
  const t = useTranslations("product");
  const [rating, setRating] = useState(5);
  const [state, action, pending] = useActionState(submitReviewAction, {} as SimpleState);

  if (state.ok) return <p className="text-sm text-muted-foreground">{t("reviewSubmitted")}</p>;

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
            className="grid size-11 place-items-center rounded-md transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Star className={cn("size-5", i <= rating ? "fill-accent text-accent" : "text-muted-foreground/40")} />
          </button>
        ))}
      </div>
      <Input name="title" placeholder={t("reviewTitle")} maxLength={120} />
      <Textarea name="body" placeholder={t("reviewBody")} required minLength={3} rows={3} />
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
