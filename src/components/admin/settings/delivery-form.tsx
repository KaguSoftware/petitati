"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Truck } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateDeliverySettingsAction } from "@/lib/admin/settings/actions";
import { MAX_SLOTS, type DeliverySettings, type DeliverySlot } from "@/lib/delivery/settings";
import type { Locale } from "@/i18n/config";
import { useActionToast } from "../shared/use-action-toast";
import { UnsavedChangesGuard, useFormDirty } from "@/components/admin/shared/unsaved-changes";

interface Props {
  storeId: string;
  settings: DeliverySettings;
  locale: Locale;
}

/** Delivery tab: the day's shape (slots, lead time) and the rules the code flow runs under. */
export function DeliveryForm({ storeId, settings, locale }: Props) {
  const t = useTranslations("admin.settings.delivery");
  const tc = useTranslations("admin.common");
  const [slots, setSlots] = useState<DeliverySlot[]>(settings.slots);
  const { dirty, reset: resetDirty, track } = useFormDirty();
  const [state, action, pending] = useActionToast(updateDeliverySettingsAction, { errorNamespace: "admin.settings", successMessage: tc("saved"), onSuccess: () => resetDirty() });
  const [attemptLimit, setAttemptLimit] = useState(String(settings.attemptLimit));
  const [leadDays, setLeadDays] = useState(String(settings.leadDays));
  const [cod, setCod] = useState(settings.codEnabled);

  const payload = JSON.stringify({
    slots: slots.filter((s) => s.key.trim() && s.from && s.to),
    attemptLimit: Number(attemptLimit) || settings.attemptLimit,
    leadDays: Number(leadDays) || 0,
    codEnabled: cod,
  });

  function update(i: number, patch: Partial<DeliverySlot>) {
    setSlots((prev) => prev.map((s, n) => (n === i ? { ...s, ...patch } : s)));
  }

  return (
    <form action={action} {...track} className="flex flex-col gap-4">
      <UnsavedChangesGuard dirty={dirty && !pending} />
      <input type="hidden" name="storeId" value={storeId} />
      <input type="hidden" name="delivery" value={payload} />

      <Card>
        <CardHeader>
          <CardTitle>{t("slots")}</CardTitle>
          <CardDescription>{t("slotsHint")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {slots.map((slot, i) => (
            <div key={i} className="flex flex-wrap items-end gap-2">
              <div className="flex min-w-40 flex-1 flex-col gap-1">
                <Label htmlFor={`slot-label-${i}`}>{t("slotLabel")}</Label>
                <Input
                  id={`slot-label-${i}`}
                  value={slot.label[locale] ?? ""}
                  onChange={(e) => update(i, { label: { ...slot.label, [locale]: e.target.value }, key: slot.key || `slot-${i + 1}` })}
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor={`slot-from-${i}`}>{t("slotFrom")}</Label>
                <Input id={`slot-from-${i}`} value={slot.from} onChange={(e) => update(i, { from: e.target.value })} placeholder="09:00" dir="ltr" className="w-24 tabular-nums" />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor={`slot-to-${i}`}>{t("slotTo")}</Label>
                <Input id={`slot-to-${i}`} value={slot.to} onChange={(e) => update(i, { to: e.target.value })} placeholder="13:00" dir="ltr" className="w-24 tabular-nums" />
              </div>
              <Button type="button" variant="ghost" size="icon" aria-label={tc("remove")} onClick={() => setSlots((prev) => prev.filter((_, n) => n !== i))}>
                <Trash2 />
              </Button>
            </div>
          ))}
          {slots.length < MAX_SLOTS && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="self-start"
              onClick={() => setSlots((prev) => [...prev, { key: `slot-${prev.length + 1}`, label: {}, from: "09:00", to: "13:00" }])}
            >
              <Plus data-icon="inline-start" />
              {t("addSlot")}
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("cod")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={cod} onCheckedChange={(v) => setCod(Boolean(v))} />
            {t("codHint")}
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <Label htmlFor="attemptLimit">{t("attemptLimit")}</Label>
              <Input id="attemptLimit" value={attemptLimit} onChange={(e) => setAttemptLimit(e.target.value)} inputMode="numeric" dir="ltr" className="tabular-nums" />
              <p className="text-xs text-muted-foreground">{t("attemptLimitHint")}</p>
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="leadDays">{t("leadDays")}</Label>
              <Input id="leadDays" value={leadDays} onChange={(e) => setLeadDays(e.target.value)} inputMode="numeric" dir="ltr" className="tabular-nums" />
            </div>
          </div>
        </CardContent>
      </Card>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={pending}>
          {tc("save")}
        </Button>
        <Link href="/admin/delivery" className={buttonVariants({ variant: "ghost", size: "sm" })}>
          <Truck data-icon="inline-start" />
          {t("openBoard")}
        </Link>
      </div>
    </form>
  );
}
