"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { updateStoreCommerceAction } from "@/lib/admin/settings/actions";
import { CURRENCIES } from "@/lib/admin/settings/constants";
import type { StoreRow } from "@/lib/db/types";
import { FormField } from "../shared/form-field";
import { NumberInput } from "../shared/number-input";
import { useActionToast } from "../shared/use-action-toast";
import { UnsavedChangesGuard, useFormDirty } from "@/components/admin/shared/unsaved-changes";

type StoreCommerce = Pick<StoreRow, "id" | "currency" | "tax_rate_bp" | "prices_include_tax" | "low_stock_threshold">;

export function CommerceForm({ store, locale }: { store: StoreCommerce; locale: string }) {
  const t = useTranslations("admin.settings.commerce");
  const tc = useTranslations("admin.common");
  const { dirty, reset: resetDirty, track } = useFormDirty();
  const [state, action, pending] = useActionToast(updateStoreCommerceAction, { errorNamespace: "admin.settings", onSuccess: () => resetDirty() });
  const errors = state.fieldErrors;
  const currencyName = (code: string) => {
    try {
      return new Intl.DisplayNames(locale, { type: "currency" }).of(code) ?? code;
    } catch {
      return code;
    }
  };

  return (
    <form action={action} {...track} className="flex flex-col gap-6">
      <UnsavedChangesGuard dirty={dirty && !pending} />
      <input type="hidden" name="storeId" value={store.id} />
      <Card>
        <CardHeader>
          <CardTitle>{t("pricing")}</CardTitle>
          <CardDescription>{t("pricingHint")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <FormField name="currency" label={t("currency")} description={t("currencyHint")} errors={errors}>
            <Select key={store.currency} name="currency" defaultValue={store.currency} modal={false}>
              <SelectTrigger id="currency" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    <span dir="ltr" className="font-mono text-xs">
                      {c}
                    </span>
                    <span className="text-muted-foreground">{currencyName(c)}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField name="tax_percent" label={t("taxRate")} description={t("taxRateHint")} errors={errors}>
            <NumberInput key={store.tax_rate_bp} id="tax_percent" name="tax_percent" defaultValue={store.tax_rate_bp / 100} min={0} max={100} step={0.5} format={{ maximumFractionDigits: 2 }} />
          </FormField>
          <div className="flex items-center justify-between gap-4 rounded-lg border px-3 py-2.5 sm:col-span-2">
            <div className="flex flex-col gap-0.5">
              <Label htmlFor="prices_include_tax">{t("pricesIncludeTax")}</Label>
              <span className="text-xs text-muted-foreground">{t("pricesIncludeTaxHint")}</span>
            </div>
            <Switch key={String(store.prices_include_tax)} id="prices_include_tax" name="prices_include_tax" defaultChecked={store.prices_include_tax} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("inventory")}</CardTitle>
          <CardDescription>{t("inventoryHint")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <FormField name="low_stock_threshold" label={t("lowStock")} description={t("lowStockHint")} errors={errors}>
            <NumberInput key={store.low_stock_threshold} id="low_stock_threshold" name="low_stock_threshold" defaultValue={store.low_stock_threshold} min={0} max={100000} step={1} />
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
