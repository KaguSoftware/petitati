"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LatinInput } from "@/components/forms/latin-input";
import { PhoneField } from "@/components/forms/phone-field";
import { updatePasswordAction, updateProfileAction, type SimpleState } from "@/lib/account/actions";

interface ProfileProps {
  fullName: string;
  email: string;
  phone: { country: string; national: string };
}

export function ProfileForm({ fullName, email, phone }: ProfileProps) {
  const t = useTranslations("account");
  const ta = useTranslations("auth");
  const tc = useTranslations("common");
  const [state, action, pending] = useActionState(updateProfileAction, {} as SimpleState);
  return (
    <form action={action} className="flex max-w-md flex-col gap-4">
      <div className="grid gap-1.5">
        <Label htmlFor="full_name">{t("name")}</Label>
        <Input id="full_name" name="full_name" defaultValue={fullName} required />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="profile-email">{t("email")}</Label>
        <LatinInput kind="email" id="profile-email" value={email} disabled />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="phone-number">{t("phone")}</Label>
        <PhoneField defaultCountry={phone.country} defaultNumber={phone.national} error={state.error && state.error !== "invalid" && state.error !== "auth" ? ta(`errors.${state.error}`) : undefined} />
      </div>
      <p role="status" className="text-sm text-muted-foreground empty:hidden">{state.ok ? t("saved") : ""}</p>
      {(state.error === "invalid" || state.error === "auth") && (
        <p role="alert" className="text-sm text-destructive">
          {tc("error")}
        </p>
      )}
      <Button type="submit" size="lg" disabled={pending} className="self-start">{tc("save")}</Button>
    </form>
  );
}

export function PasswordForm() {
  const t = useTranslations("account");
  const tc = useTranslations("common");
  const [state, action, pending] = useActionState(updatePasswordAction, {} as SimpleState);
  return (
    <form action={action} className="flex max-w-md flex-col gap-4">
      <div className="grid gap-1.5">
        <Label htmlFor="password">{t("newPassword")}</Label>
        <LatinInput kind="password" id="password" name="password" minLength={8} required autoComplete="new-password" />
      </div>
      <p role="status" className="text-sm text-muted-foreground empty:hidden">{state.ok ? t("saved") : ""}</p>
      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {t.has(`passwordErrors.${state.error}`) ? t(`passwordErrors.${state.error}`) : tc("error")}
        </p>
      )}
      <Button type="submit" size="lg" disabled={pending} className="self-start">{tc("save")}</Button>
    </form>
  );
}
