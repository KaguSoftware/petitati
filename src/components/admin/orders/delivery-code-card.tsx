"use client";

import { RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/shared/copy-button";
import { reissueDeliveryCodeAction } from "@/lib/admin/orders/actions";
import { useOptimisticAction } from "../shared/use-optimistic-action";

interface Props {
  storeId: string;
  orderId: string;
  code: string;
  attempts: number;
  limit: number;
  /** Reissue only makes sense while the order can still be delivered. */
  canReissue: boolean;
}

/**
 * What staff need when a customer rings up without their code: the code itself, how many wrong
 * tries are left, and one button that mints a new one and clears the lockout.
 */
export function DeliveryCodeCard({ storeId, orderId, code, attempts, limit, canReissue }: Props) {
  const t = useTranslations("admin.orders");
  const { run, pending } = useOptimisticAction("admin.orders");
  const left = Math.max(0, limit - attempts);
  const locked = left === 0;

  function reissue() {
    const fd = new FormData();
    fd.set("storeId", storeId);
    fd.set("orderId", orderId);
    run(() => reissueDeliveryCodeAction({}, fd), { success: t("deliverCode.reissued") });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-center gap-1">
        <p dir="ltr" className="text-2xl font-semibold tracking-[0.3em] tabular-nums">
          {code}
        </p>
        <CopyButton value={code} label={t("deliverCode.copyCode")} />
      </div>
      <p className={`text-center text-xs ${locked ? "font-medium text-destructive" : "text-muted-foreground"}`}>
        {locked ? t("deliverCode.locked") : t("deliverCode.attemptsLeft", { count: left })}
      </p>
      {canReissue && (
        <Button type="button" variant="outline" size="sm" onClick={reissue} disabled={pending} className="self-center">
          <RefreshCw data-icon="inline-start" />
          {t("actions.reissueCode")}
        </Button>
      )}
    </div>
  );
}
