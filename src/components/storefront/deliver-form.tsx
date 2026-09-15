"use client";

import { useActionState } from "react";
import { CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { LatinInput } from "@/components/forms/latin-input";
import { confirmDeliveryPublicAction, type DeliveryFormState } from "@/lib/delivery/actions";

/**
 * Two fields, one answer. Every failure reads the same ("invalid") unless the code is locked or the
 * order is not out for delivery yet — the form must not tell a stranger which order numbers exist.
 */
export function DeliverForm({ slug, defaultNumber }: { slug: string; defaultNumber?: string }) {
  const t = useTranslations("deliver");
  const [state, action, pending] = useActionState(confirmDeliveryPublicAction, {} as DeliveryFormState);

  if (state.ok) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl bg-primary/10 p-8 text-center">
        <CheckCircle2 className="size-10 text-primary" />
        <p className="text-lg font-medium">{t("success", { number: state.number ?? "" })}</p>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-5 rounded-xl bg-card p-5 shadow-sm ring-1 ring-foreground/5 @tablet:p-6">
      <input type="hidden" name="slug" value={slug} />
      <div className="flex flex-col gap-2">
        <Label htmlFor="number">{t("orderNumber")}</Label>
        <LatinInput kind="code" id="number" name="number" required defaultValue={defaultNumber} placeholder="2609-00042" className="normal-case tracking-normal" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="code">{t("code")}</Label>
        <LatinInput
          kind="code"
          id="code"
          name="code"
          required
          inputMode="numeric"
          pattern="[0-9]{6}"
          maxLength={6}
          autoComplete="off"
          placeholder="000000"
          className="text-center text-2xl tracking-[0.4em] tabular-nums"
        />
        <p className="text-sm text-muted-foreground">{t("codeHint")}</p>
      </div>
      {state.error && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {t(state.error)}
        </p>
      )}
      <Button type="submit" size="xl" disabled={pending}>
        {t("submit")}
      </Button>
    </form>
  );
}
