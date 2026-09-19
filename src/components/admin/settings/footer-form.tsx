"use client";

import { ArrowDown, ArrowUp, BadgePercent, Gift, Headset, Plus, RotateCcw, ShieldCheck, Trash2, Truck, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { UnsavedChangesGuard } from "@/components/admin/shared/unsaved-changes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { dirFor, localeNames, type Locale } from "@/i18n/config";
import { updateFooterAction } from "@/lib/admin/settings/actions";
import {
  MAX_TRUST_ITEMS,
  PAYMENT_METHODS,
  SOCIAL_KEYS,
  TRUST_ICONS,
  socialUrlProblem,
  type FooterContent,
  type PaymentMethod,
  type SocialKey,
  type TrustIcon,
  type TrustItem,
} from "@/lib/theme/footer";
import { cn } from "@/lib/utils";
import { useActionToast } from "../shared/use-action-toast";

interface Props {
  storeId: string;
  locale: Locale;
  enabledLocales: Locale[];
  footer: FooterContent;
}

const ICONS: Record<TrustIcon, LucideIcon> = { truck: Truck, "shield-check": ShieldCheck, "rotate-ccw": RotateCcw, headset: Headset, "badge-percent": BadgePercent, gift: Gift };
const SOCIAL_PLACEHOLDER: Record<SocialKey, string> = {
  instagram: "https://instagram.com/yourstore",
  facebook: "https://facebook.com/yourstore",
  whatsapp: "https://wa.me/90…",
  telegram: "https://t.me/yourstore",
  x: "https://x.com/yourstore",
};
const FORM_ID = "footer-form";

/**
 * Contact & footer settings: address / hours per locale, social links, the trust strip and payment
 * badges. One draft object, saved as a single JSON field (no nested forms); Save enables when dirty.
 */
export function FooterForm({ storeId, locale, enabledLocales, footer }: Props) {
  const t = useTranslations("admin.settings.footer");
  const tf = useTranslations("footer");
  const tc = useTranslations("admin.common");
  const [draft, setDraft] = useState<FooterContent>(footer);
  const [saved, setSaved] = useState(() => JSON.stringify(footer));
  const [, action, pending] = useActionToast(updateFooterAction, { errorNamespace: "admin.settings", onSuccess: () => setSaved(JSON.stringify(draft)) });
  const dirty = JSON.stringify(draft) !== saved;
  const localeTabs = enabledLocales.length ? enabledLocales : [locale];
  const initialLocale = localeTabs.includes(locale) ? locale : localeTabs[0];

  const setText = (field: "address" | "hours", l: Locale, value: string) =>
    setDraft((d) => {
      const next = { ...d[field] };
      if (value.trim() === "") delete next[l];
      else next[l] = value;
      return { ...d, [field]: next };
    });
  const setSocial = (key: SocialKey, value: string) =>
    setDraft((d) => {
      const next = { ...d.social };
      if (value.trim() === "") delete next[key];
      else next[key] = value;
      return { ...d, social: next };
    });
  const setItems = (items: TrustItem[]) => setDraft((d) => ({ ...d, trustItems: items }));
  const updateItem = (i: number, patch: Partial<TrustItem>) => setItems(draft.trustItems.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  const setItemText = (i: number, field: "title" | "text", l: Locale, value: string) => {
    const next = { ...draft.trustItems[i][field] };
    if (value.trim() === "") delete next[l];
    else next[l] = value;
    updateItem(i, { [field]: next });
  };
  const moveItem = (i: number, dir: -1 | 1) => {
    const target = i + dir;
    if (target < 0 || target >= draft.trustItems.length) return;
    const next = [...draft.trustItems];
    [next[i], next[target]] = [next[target], next[i]];
    setItems(next);
  };
  const togglePayment = (m: PaymentMethod, on: boolean) => setDraft((d) => ({ ...d, payments: PAYMENT_METHODS.filter((x) => (x === m ? on : d.payments.includes(x))) }));

  const localeTabsFor = (render: (l: Locale) => React.ReactNode) => (
    <Tabs defaultValue={initialLocale}>
      <TabsList variant="line">
        {localeTabs.map((l) => (
          <TabsTrigger key={l} value={l}>
            {localeNames[l]}
          </TabsTrigger>
        ))}
      </TabsList>
      {localeTabs.map((l) => (
        <TabsContent key={l} value={l} keepMounted className="flex flex-col gap-4 pt-2">
          {render(l)}
        </TabsContent>
      ))}
    </Tabs>
  );

  return (
    <div className="flex flex-col gap-6">
      {/* The form carries only the payload; every control below is a plain controlled input. */}
      <form id={FORM_ID} action={action} hidden>
        <input type="hidden" name="storeId" value={storeId} />
        <input type="hidden" name="footer" value={JSON.stringify(draft)} />
      </form>

      <Card>
        <CardHeader>
          <CardTitle>{t("addressHours")}</CardTitle>
          <CardDescription>{t("addressHoursHint")}</CardDescription>
        </CardHeader>
        <CardContent>
          {localeTabsFor((l) => (
            <>
              <div className="flex flex-col gap-2">
                <Label htmlFor={`address_${l}`}>{t("address")}</Label>
                <Textarea id={`address_${l}`} dir={dirFor(l)} rows={3} maxLength={400} value={draft.address[l] ?? ""} placeholder={t("addressPlaceholder")} onChange={(e) => setText("address", l, e.target.value)} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor={`hours_${l}`}>{t("hours")}</Label>
                <Textarea id={`hours_${l}`} dir={dirFor(l)} rows={2} maxLength={300} value={draft.hours[l] ?? ""} placeholder={t("hoursPlaceholder")} onChange={(e) => setText("hours", l, e.target.value)} />
              </div>
            </>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("social")}</CardTitle>
          <CardDescription>{t("socialHint")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {SOCIAL_KEYS.map((key) => {
            const value = draft.social[key] ?? "";
            const problem = value ? socialUrlProblem(key, value) : null;
            return (
              <div key={key} className="flex flex-col gap-2">
                <Label htmlFor={`social_${key}`}>{tf(`social.${key}`)}</Label>
                <Input
                  id={`social_${key}`}
                  dir="ltr"
                  inputMode="url"
                  autoCorrect="off"
                  spellCheck={false}
                  maxLength={300}
                  value={value}
                  placeholder={SOCIAL_PLACEHOLDER[key]}
                  aria-invalid={problem ? true : undefined}
                  aria-describedby={problem ? `social_${key}_error` : undefined}
                  onChange={(e) => setSocial(key, e.target.value)}
                />
                {problem && (
                  <p id={`social_${key}_error`} className="text-xs text-destructive">
                    {t(`errors.${problem}`)}
                  </p>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1.5">
            <CardTitle>{t("trust")}</CardTitle>
            <CardDescription>{t("trustHint")}</CardDescription>
          </div>
          <Label className="flex items-center gap-2 font-normal">
            <Switch checked={draft.trustEnabled} onCheckedChange={(on) => setDraft((d) => ({ ...d, trustEnabled: on }))} />
            {t("trustEnabled")}
          </Label>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ol className="flex flex-col gap-4">
            {draft.trustItems.map((item, i) => {
              const Icon = ICONS[item.icon];
              return (
                <li key={i} className={cn("flex flex-col gap-4 rounded-xl border p-4", !draft.trustEnabled && "opacity-60")}>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="flex items-center gap-2 text-sm font-medium">
                      <Icon className="size-4 text-primary" aria-hidden />
                      {t("item", { n: i + 1 })}
                    </h3>
                    <div className="flex items-center gap-1">
                      <Button type="button" size="icon-sm" variant="ghost" aria-label={t("moveUp")} disabled={i === 0} onClick={() => moveItem(i, -1)}>
                        <ArrowUp />
                      </Button>
                      <Button type="button" size="icon-sm" variant="ghost" aria-label={t("moveDown")} disabled={i === draft.trustItems.length - 1} onClick={() => moveItem(i, 1)}>
                        <ArrowDown />
                      </Button>
                      <Button type="button" size="icon-sm" variant="ghost" aria-label={t("removeItem")} className="text-destructive hover:text-destructive" onClick={() => setItems(draft.trustItems.filter((_, j) => j !== i))}>
                        <Trash2 />
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 sm:max-w-xs">
                    <Label htmlFor={`trust_${i}_icon`}>{t("icon")}</Label>
                    <Select value={item.icon} onValueChange={(v) => v && updateItem(i, { icon: v as TrustIcon })} modal={false}>
                      <SelectTrigger id={`trust_${i}_icon`} className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent alignItemWithTrigger={false}>
                        {TRUST_ICONS.map((ic) => {
                          const I = ICONS[ic];
                          return (
                            <SelectItem key={ic} value={ic}>
                              <span className="flex items-center gap-2">
                                <I className="size-4" aria-hidden />
                                {t(`icons.${ic}`)}
                              </span>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  {localeTabsFor((l) => (
                    <>
                      <div className="flex flex-col gap-2">
                        <Label htmlFor={`trust_${i}_title_${l}`}>{t("itemTitle")}</Label>
                        <Input id={`trust_${i}_title_${l}`} dir={dirFor(l)} maxLength={40} value={item.title[l] ?? ""} onChange={(e) => setItemText(i, "title", l, e.target.value)} />
                      </div>
                      <div className="flex flex-col gap-2">
                        <Label htmlFor={`trust_${i}_text_${l}`}>{t("itemText")}</Label>
                        <Input id={`trust_${i}_text_${l}`} dir={dirFor(l)} maxLength={120} value={item.text[l] ?? ""} onChange={(e) => setItemText(i, "text", l, e.target.value)} />
                      </div>
                    </>
                  ))}
                </li>
              );
            })}
          </ol>
          <div>
            <Button type="button" variant="outline" size="sm" disabled={draft.trustItems.length >= MAX_TRUST_ITEMS} onClick={() => setItems([...draft.trustItems, { icon: "truck", title: {}, text: {} }])}>
              <Plus data-icon="inline-start" />
              {t("addItem")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("payments")}</CardTitle>
          <CardDescription>{t("paymentsHint")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {PAYMENT_METHODS.map((m) => {
              const checked = draft.payments.includes(m);
              return (
                <Label key={m} className={cn("flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 font-normal transition-colors hover:bg-muted/50", checked && "border-primary bg-primary/5")}>
                  <Checkbox checked={checked} onCheckedChange={(on) => togglePayment(m, on === true)} />
                  <span>{tf(`payments.${m}`)}</span>
                </Label>
              );
            })}
          </div>
        </CardContent>
        <CardFooter className="justify-end gap-2">
          <UnsavedChangesGuard dirty={dirty && !pending} />
          <Button type="button" variant="ghost" disabled={!dirty || pending} onClick={() => setDraft(JSON.parse(saved) as FooterContent)}>
            {tc("cancel")}
          </Button>
          <Button type="submit" form={FORM_ID} disabled={!dirty || pending}>
            {pending ? tc("saving") : tc("save")}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
