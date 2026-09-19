"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { LatinInput } from "@/components/forms/latin-input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { localeNames, locales, type Locale } from "@/i18n/config";
import { updateStoreGeneralAction } from "@/lib/admin/settings/actions";
import type { StoreRow } from "@/lib/db/types";
import { cn } from "@/lib/utils";
import { FormField } from "../shared/form-field";
import { useActionToast } from "../shared/use-action-toast";
import { UnsavedChangesGuard, useFormDirty } from "@/components/admin/shared/unsaved-changes";
import { translateFieldErrors } from "./field-errors";
import { TimezoneSelect } from "./timezone-select";

type StoreGeneral = Pick<StoreRow, "id" | "name" | "tagline" | "contact_email" | "contact_phone" | "email_from" | "timezone" | "default_locale" | "enabled_locales">;

export function GeneralForm({ store }: { store: StoreGeneral }) {
  const t = useTranslations("admin.settings.general");
  const ts = useTranslations("admin.settings");
  const tc = useTranslations("admin.common");
  const { dirty, reset: resetDirty, track } = useFormDirty();
  const [state, action, pending] = useActionToast(updateStoreGeneralAction, { errorNamespace: "admin.settings", onSuccess: () => resetDirty() });
  const [defaultLocale, setDefaultLocale] = useState<Locale>(store.default_locale);
  const [enabled, setEnabled] = useState<Locale[]>(store.enabled_locales);
  const errors = translateFieldErrors(state.fieldErrors, ts);
  const localeItems = locales.map((l) => ({ value: l, label: localeNames[l] }));

  function toggle(l: Locale, on: boolean) {
    setEnabled((prev) => (on ? locales.filter((x) => x === l || prev.includes(x)) : prev.filter((x) => x !== l)));
  }

  return (
    <form action={action} {...track} className="flex flex-col gap-6">
      <UnsavedChangesGuard dirty={dirty && !pending} />
      <input type="hidden" name="storeId" value={store.id} />
      <Card>
        <CardHeader>
          <CardTitle>{t("identity")}</CardTitle>
          <CardDescription>{t("identityHint")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <FormField name="name" label={t("name")} errors={errors} required>
            <Input key={store.name} id="name" name="name" defaultValue={store.name} required maxLength={120} />
          </FormField>
          <FormField name="tagline" label={t("tagline")} description={t("taglineHint")} errors={errors}>
            <Input key={store.tagline ?? ""} id="tagline" name="tagline" defaultValue={store.tagline ?? ""} maxLength={200} />
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("contact")}</CardTitle>
          <CardDescription>
            {t("contactHint")} {t("contactFooterHint")}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <FormField name="contact_email" label={t("contactEmail")} errors={errors}>
            <LatinInput key={store.contact_email ?? ""} kind="email" id="contact_email" name="contact_email" defaultValue={store.contact_email ?? ""} autoComplete="off" />
          </FormField>
          <FormField name="contact_phone" label={t("contactPhone")} errors={errors}>
            <LatinInput key={store.contact_phone ?? ""} kind="tel" id="contact_phone" name="contact_phone" defaultValue={store.contact_phone ?? ""} autoComplete="off" />
          </FormField>
          <FormField name="email_from" label={t("emailFrom")} description={t("emailFromHint")} errors={errors} className="sm:col-span-2">
            <Input key={store.email_from ?? ""} id="email_from" name="email_from" dir="ltr" className="text-start" defaultValue={store.email_from ?? ""} placeholder="Petitati <noreply@example.com>" autoComplete="off" spellCheck={false} />
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("localisation")}</CardTitle>
          <CardDescription>{t("localisationHint")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <FormField name="timezone" label={t("timezone")} errors={errors}>
            <TimezoneSelect key={store.timezone} id="timezone" name="timezone" defaultValue={store.timezone} className="w-full" />
          </FormField>
          <FormField name="default_locale" label={t("defaultLocale")} errors={errors}>
            <Select
              items={localeItems}
              name="default_locale"
              value={defaultLocale}
              onValueChange={(v) => {
                const l = v as Locale;
                setDefaultLocale(l);
                toggle(l, true);
              }}
              modal={false}
            >
              <SelectTrigger id="default_locale" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>
                {locales.map((l) => (
                  <SelectItem key={l} value={l}>
                    {localeNames[l]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField name="enabled_locales" label={t("enabledLocales")} description={t("enabledLocalesHint")} errors={errors} className="sm:col-span-2">
            <div className="flex flex-wrap gap-2">
              {locales.map((l) => {
                const checked = enabled.includes(l);
                const locked = l === defaultLocale;
                return (
                  <Label
                    key={l}
                    className={cn("flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 font-normal transition-colors hover:bg-muted/50", checked && "border-primary bg-primary/5", locked && "cursor-default")}
                  >
                    <Checkbox name="enabled_locales" value={l} checked={checked} disabled={locked} onCheckedChange={(on) => toggle(l, on)} />
                    <span>{localeNames[l]}</span>
                    {locked && <span className="text-xs text-muted-foreground">({t("default")})</span>}
                  </Label>
                );
              })}
            </div>
            {/* Disabled checkboxes do not submit; keep the default locale in the payload. */}
            <input type="hidden" name="enabled_locales" value={defaultLocale} />
          </FormField>
        </CardContent>
        <CardFooter className="justify-end">
          <Button type="submit" disabled={pending}>
            {pending ? tc("saving") : tc("save")}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
