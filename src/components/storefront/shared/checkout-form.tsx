"use client";

import { cloneElement, isValidElement, startTransition, useActionState, useEffect, useRef, useState, type ReactElement } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { CountrySelect } from "@/components/forms/country-select";
import { LatinInput } from "@/components/forms/latin-input";
import { placeOrderAction, type CheckoutState } from "@/lib/checkout/actions";
import { formatMoney } from "@/lib/money";
import type { AddressRow } from "@/lib/db/types";
import { cn } from "@/lib/utils";

export interface ShippingOption {
  id: string;
  name: string;
  rate: number;
  freeOver: number | null;
  isFree: boolean;
}

interface Props {
  storeSlug: string;
  locale: string;
  currency: string;
  email: string | null;
  /** E.164 from the profile when signed in; guests type their own. */
  phone?: string | null;
  addresses: AddressRow[];
  shippingOptions: ShippingOption[];
  defaultCountry: string;
  /** Called by the parent when the shipping choice changes so the summary can update. */
  onShippingChange?: (id: string) => void;
}

/**
 * Label + control + error. The error is tied to the control (`aria-invalid` + `aria-describedby`)
 * so screen readers read it with the field, and required fields carry a visible star.
 */
function Field({ name, label, error, required, children }: { name: string; label: string; error?: string; required?: boolean; children: React.ReactNode }) {
  const errorId = `${name}-error`;
  const control = isValidElement(children)
    ? cloneElement(children as ReactElement<Record<string, unknown>>, { "aria-invalid": error ? true : undefined, "aria-describedby": error ? errorId : undefined })
    : children;
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={name}>
        {label}
        {required && (
          <span aria-hidden className="text-destructive">
            *
          </span>
        )}
      </Label>
      {control}
      {error && (
        <p id={errorId} className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

export function CheckoutForm({ storeSlug, locale, currency, email, phone, addresses, shippingOptions, defaultCountry, onShippingChange }: Props) {
  const t = useTranslations("checkout");
  const tc = useTranslations("cart");
  const [state, action, pending] = useActionState(placeOrderAction, {} as CheckoutState);
  const defaultAddr = addresses.find((a) => a.is_default) ?? addresses[0];
  const [addr, setAddr] = useState<AddressRow | undefined>(defaultAddr);
  // The action sends codes (required / tooShort / tooLong / invalid); unknown ones read as "invalid".
  const fe = Object.fromEntries(Object.entries(state.fieldErrors ?? {}).map(([k, code]) => [k, t.has(`fieldErrors.${code}`) ? t(`fieldErrors.${code}`) : t("fieldErrors.invalid")]));
  const formRef = useRef<HTMLFormElement>(null);
  // After a rejected submit, put the cursor in the first field that needs fixing.
  useEffect(() => {
    if (state.fieldErrors && Object.keys(state.fieldErrors).length) formRef.current?.querySelector<HTMLElement>("[aria-invalid=true]")?.focus();
  }, [state]);

  return (
    <form
      ref={formRef}
      // Submitted by hand rather than through `action=`: React 19 resets a form after its action runs,
      // which wiped every field the shopper had typed whenever the server rejected one of them.
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => action(fd));
      }}
      className="flex flex-col gap-8"
    >
      <p className="-mb-4 text-sm text-muted-foreground">
        <span aria-hidden className="text-destructive">
          *
        </span>{" "}
        {t("requiredNote")}
      </p>
      <input type="hidden" name="storeSlug" value={storeSlug} />
      <input type="hidden" name="locale" value={locale} />

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">{t("contact")}</h2>
        {!email && <p className="text-sm text-muted-foreground">{t("guestNotice")}</p>}
        <Field name="email" label={t("email")} error={fe.email} required>
          <LatinInput kind="email" id="email" name="email" defaultValue={email ?? ""} required autoComplete="email" />
        </Field>
        <Field name="phone" label={t("phone")} error={fe.phone}>
          <LatinInput kind="tel" id="phone" name="phone" defaultValue={phone ?? addr?.phone ?? ""} autoComplete="tel" />
        </Field>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">{t("shippingAddress")}</h2>
        {addresses.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {addresses.map((a) => (
              <Button
                key={a.id}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAddr(a)}
                className={cn(addr?.id === a.id && "border-primary bg-primary/10")}
              >
                {a.label ?? a.city}
              </Button>
            ))}
          </div>
        )}
        <Field name="full_name" label={t("fullName")} error={fe.full_name} required>
          <Input id="full_name" name="full_name" key={`fn-${addr?.id}`} defaultValue={addr?.full_name ?? ""} required autoComplete="name" />
        </Field>
        <Field name="line1" label={t("addressLine1")} error={fe.line1} required>
          <Input id="line1" name="line1" key={`l1-${addr?.id}`} defaultValue={addr?.line1 ?? ""} required autoComplete="address-line1" />
        </Field>
        <Field name="line2" label={t("addressLine2")} error={fe.line2}>
          <Input id="line2" name="line2" key={`l2-${addr?.id}`} defaultValue={addr?.line2 ?? ""} autoComplete="address-line2" />
        </Field>
        <div className="grid grid-cols-1 gap-4 @phablet:grid-cols-2">
          <Field name="city" label={t("city")} error={fe.city} required>
            <Input id="city" name="city" key={`c-${addr?.id}`} defaultValue={addr?.city ?? ""} required autoComplete="address-level2" />
          </Field>
          <Field name="region" label={t("region")} error={fe.region}>
            <Input id="region" name="region" key={`r-${addr?.id}`} defaultValue={addr?.region ?? ""} autoComplete="address-level1" />
          </Field>
          <Field name="postal_code" label={t("postalCode")} error={fe.postal_code}>
            <LatinInput kind="postal" id="postal_code" name="postal_code" key={`p-${addr?.id}`} defaultValue={addr?.postal_code ?? ""} autoComplete="postal-code" />
          </Field>
          <Field name="country" label={t("country")} error={fe.country} required>
            <CountrySelect id="country" name="country" key={`co-${addr?.id}`} defaultValue={addr?.country ?? defaultCountry} required />
          </Field>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">{t("shippingMethod")}</h2>
        <RadioGroup
          name="shipping_rate_id"
          required
          defaultValue={shippingOptions[0]?.id}
          onValueChange={(value) => onShippingChange?.(String(value))}
          className="gap-2"
        >
          {shippingOptions.map((opt) => (
            <Label
              key={opt.id}
              className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-sm font-normal transition-colors has-data-checked:border-primary has-data-checked:bg-primary/5"
            >
              <span className="flex items-center gap-2.5">
                <RadioGroupItem value={opt.id} />
                {opt.name}
              </span>
              <span className="tabular-nums">{opt.isFree ? tc("freeShipping") : formatMoney(opt.rate, currency, locale)}</span>
            </Label>
          ))}
        </RadioGroup>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">{t("payment")}</h2>
        <p className="flex items-start gap-2.5 rounded-lg bg-muted/60 px-4 py-3 text-sm text-muted-foreground">
          <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
          <span>{t("paymentManual")}</span>
        </p>
      </section>

      <Field name="customer_note" label={t("noteLabel")}>
        <Textarea id="customer_note" name="customer_note" rows={3} />
      </Field>

      <Label className="items-center gap-2.5 font-normal leading-none">
        <Checkbox name="accepts_marketing" className="size-5" />
        {t("marketingOptIn")}
      </Label>

      {/* `invalid` normally means per-field errors are shown above, so the banner would be noise —
          but if none came back the form used to fail silently. Unknown codes fall back too. */}
      {state.error && (state.error !== "invalid" || Object.keys(fe).length === 0) && (
        <p role="alert" className="text-sm text-destructive">
          {t.has(`errors.${state.error}`) ? t(`errors.${state.error}`) : t("errors.failed")}
        </p>
      )}

      <Button type="submit" size="xl" disabled={pending}>
        {t("placeOrder")}
      </Button>
    </form>
  );
}
