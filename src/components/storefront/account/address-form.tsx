"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CountrySelect } from "@/components/forms/country-select";
import { LatinInput, type LatinKind } from "@/components/forms/latin-input";
import { EmptyState } from "@/components/storefront/shared/empty-state";
import { ConfirmButton } from "@/components/storefront/shared/confirm-button";
import { MapPin } from "lucide-react";
import { deleteAddressAction, saveAddressAction, type SimpleState } from "@/lib/account/actions";
import type { AddressRow } from "@/lib/db/types";

export function AddressList({ storeSlug, addresses, defaultCountry }: { storeSlug: string; addresses: AddressRow[]; defaultCountry: string }) {
  const t = useTranslations("account");
  const [editing, setEditing] = useState<AddressRow | "new" | null>(null);

  return (
    <div className="flex flex-col gap-4">
      {addresses.length === 0 && !editing && (
        <EmptyState
          icon={MapPin}
          title={t("noAddressesTitle")}
          description={t("noAddresses")}
          action={
            <Button size="xl" onClick={() => setEditing("new")}>
              {t("addAddress")}
            </Button>
          }
        />
      )}
      <ul className="grid gap-3 @phablet:grid-cols-2">
        {addresses.map((a) => (
          <li key={a.id} className="flex flex-col gap-2 rounded-xl border p-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-medium">{a.label ?? a.city}</span>
              {a.is_default && <span className="text-xs text-muted-foreground">{t("defaultAddress")}</span>}
            </div>
            <address className="not-italic text-muted-foreground">
              {a.full_name}<br />{a.line1}{a.line2 ? <><br />{a.line2}</> : null}<br />{a.postal_code} {a.city}{a.region ? `, ${a.region}` : ""}<br />{a.country}
            </address>
            <div className="mt-auto flex gap-2">
              <Button variant="outline" onClick={() => setEditing(a)}>{t("editAddress")}</Button>
              <ConfirmButton
                trigger={<Button variant="ghost">{t("deleteAddress")}</Button>}
                title={t("deleteAddressTitle")}
                description={t("deleteAddressBody")}
                confirmLabel={t("deleteAddress")}
                destructive
                onConfirm={() => {
                  const fd = new FormData();
                  fd.set("storeSlug", storeSlug);
                  fd.set("id", a.id);
                  return deleteAddressAction(fd);
                }}
              />
            </div>
          </li>
        ))}
      </ul>
      {editing ? (
        <AddressForm storeSlug={storeSlug} address={editing === "new" ? null : editing} defaultCountry={defaultCountry} onDone={() => setEditing(null)} />
      ) : (
        addresses.length > 0 && (
          <Button size="xl" className="self-start" onClick={() => setEditing("new")}>
            {t("addAddress")}
          </Button>
        )
      )}
    </div>
  );
}

function AddressForm({ storeSlug, address, defaultCountry, onDone }: { storeSlug: string; address: AddressRow | null; defaultCountry: string; onDone: () => void }) {
  const t = useTranslations("checkout");
  const ta = useTranslations("account");
  const tc = useTranslations("common");
  const [state, action, pending] = useActionState(async (prev: SimpleState, fd: FormData) => {
    const res = await saveAddressAction(prev, fd);
    if (res.ok) onDone();
    return res;
  }, {} as SimpleState);

  return (
    <form action={action} className="grid gap-4 rounded-xl bg-card p-4 shadow-sm ring-1 ring-foreground/5 @phablet:grid-cols-2">
      <input type="hidden" name="storeSlug" value={storeSlug} />
      {address && <input type="hidden" name="id" value={address.id} />}
      <F name="label" label={ta("label")} value={address?.label} />
      <F name="full_name" label={t("fullName")} value={address?.full_name} required auto="name" />
      <F name="phone" label={t("phone")} value={address?.phone} auto="tel" kind="tel" />
      <F name="line1" label={t("addressLine1")} value={address?.line1} required auto="address-line1" />
      <F name="line2" label={t("addressLine2")} value={address?.line2} auto="address-line2" />
      <F name="city" label={t("city")} value={address?.city} required auto="address-level2" />
      <F name="region" label={t("region")} value={address?.region} auto="address-level1" />
      <F name="postal_code" label={t("postalCode")} value={address?.postal_code} auto="postal-code" kind="postal" />
      <div className="grid gap-1.5">
        <Label htmlFor="addr-country">{t("country")}</Label>
        <CountrySelect id="addr-country" name="country" defaultValue={address?.country ?? defaultCountry} required />
      </div>
      <Label className="gap-2.5 font-normal @phablet:col-span-2">
        <Checkbox name="is_default" defaultChecked={address?.is_default ?? false} />
        {ta("defaultAddress")}
      </Label>
      {state.error && <p className="text-sm text-destructive @phablet:col-span-2">{tc("error")}</p>}
      <div className="flex gap-2 @phablet:col-span-2">
        <Button type="submit" size="lg" disabled={pending}>{tc("save")}</Button>
        <Button type="button" variant="ghost" size="lg" onClick={onDone}>{tc("cancel")}</Button>
      </div>
    </form>
  );
}

function F({ name, label, value, required, auto, kind }: { name: string; label: string; value?: string | null; required?: boolean; auto?: string; kind?: LatinKind }) {
  const id = `addr-${name}`;
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {kind ? (
        <LatinInput kind={kind} id={id} name={name} defaultValue={value ?? ""} required={required} autoComplete={auto} />
      ) : (
        <Input id={id} name={name} defaultValue={value ?? ""} required={required} autoComplete={auto} />
      )}
    </div>
  );
}
