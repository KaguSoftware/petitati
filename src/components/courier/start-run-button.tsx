"use client";

import { useActionState } from "react";
import { Truck } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/storefront/shared/confirm-button";
import { startRunAction, type CourierActionState } from "@/lib/courier/actions";

/**
 * One tap at the depot: every stop assigned for today goes out, and its order is marked shipped.
 * It asks first (a mis-tap would tell every customer their parcel is on the way), and a failure
 * is shown instead of being swallowed.
 */
export function StartRunButton({ token, label, count }: { token: string; label: string; count: number }) {
  const t = useTranslations("courier");
  const [state, action, pending] = useActionState(startRunAction, {} as CourierActionState);
  return (
    <div className="flex flex-col gap-2">
      <ConfirmButton
        trigger={
          <Button type="button" size="xl" className="w-full" disabled={pending}>
            <Truck data-icon="inline-start" />
            {label}
          </Button>
        }
        title={t("startRunConfirm.title")}
        description={t("startRunConfirm.body", { count })}
        confirmLabel={label}
        onConfirm={() => {
          const fd = new FormData();
          fd.set("token", token);
          action(fd);
        }}
      />
      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {t.has(`errors.${state.error}`) ? t(`errors.${state.error}`) : t("errors.invalid")}
        </p>
      )}
    </div>
  );
}
