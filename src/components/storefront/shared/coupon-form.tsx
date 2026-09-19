"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LatinInput } from "@/components/forms/latin-input";
import { applyCouponAction, removeCouponAction, type CartActionState } from "@/lib/cart/actions";

export function CouponForm({ storeSlug, appliedCode }: { storeSlug: string; appliedCode: string | null }) {
  const t = useTranslations("cart");
  const [state, action, pending] = useActionState(applyCouponAction, {} as CartActionState);

  if (appliedCode) {
    return (
      <form action={removeCouponAction} className="flex items-center justify-between rounded-md border border-dashed px-3 py-2 text-sm">
        <input type="hidden" name="storeSlug" value={storeSlug} />
        <span>
          {t("couponCode")}: <strong dir="ltr">{appliedCode}</strong>
        </span>
        <Button type="submit" variant="ghost" size="icon" aria-label={t("remove")} className="size-10">
          <X />
        </Button>
      </form>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="storeSlug" value={storeSlug} />
      <div className="flex gap-2">
        <LatinInput kind="code" name="code" placeholder={t("couponCode")} aria-label={t("couponCode")} className="placeholder:normal-case placeholder:tracking-normal" required />
        <Button type="submit" variant="outline" size="xl" disabled={pending} className="shrink-0">
          {t("applyCoupon")}
        </Button>
      </div>
      {state.error === "coupon_invalid" && (
        <p role="alert" className="text-sm text-destructive">
          {t("couponInvalid")}
        </p>
      )}
    </form>
  );
}
