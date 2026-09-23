"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneField } from "@/components/forms/phone-field";
import { completeProfileAction, type AuthState } from "@/lib/auth/actions";

interface Props {
  locale: string;
  next?: string;
  defaultCountry: string;
  /** Ask for a name too when the profile has none (some OAuth providers omit it). */
  askName: boolean;
  /** Invited staff have no password yet. */
  askPassword?: boolean;
}

export function CompleteProfileForm({ locale, next, defaultCountry, askName, askPassword }: Props) {
  const t = useTranslations();
  const [state, action, pending] = useActionState(completeProfileAction, {} as AuthState);
  const phoneError = state.fieldErrors?.phone;

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="locale" value={locale} />
      {next && <input type="hidden" name="next" value={next} />}
      <p className="text-sm text-muted-foreground">{askPassword ? t("auth.completeInviteIntro") : t("auth.completeProfileIntro")}</p>
      {askName && (
        <div className="grid gap-2">
          <Label htmlFor="full_name">{t("checkout.fullName")}</Label>
          <Input id="full_name" name="full_name" autoComplete="name" required />
        </div>
      )}
      <div className="grid gap-2">
        <Label htmlFor="phone-number">{t("auth.phone")}</Label>
        <PhoneField defaultCountry={defaultCountry} error={phoneError ? t(`auth.errors.${phoneError}`) : undefined} />
        <p className="text-xs text-muted-foreground">{t("auth.phoneHint")}</p>
      </div>
      {askPassword && (
        <div className="grid gap-2">
          <Label htmlFor="password">{t("auth.choosePassword")}</Label>
          <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required dir="ltr" aria-invalid={state.fieldErrors?.password ? true : undefined} />
          <p className="text-xs text-muted-foreground">{t("auth.choosePasswordHint")}</p>
        </div>
      )}
      {state.error && !phoneError && (
        <p role="alert" className="text-sm text-destructive">
          {state.error === "invalid" || state.error === "auth" ? t("common.error") : t.has(`auth.errors.${state.error}`) ? t(`auth.errors.${state.error}`) : state.error}
        </p>
      )}
      <Button type="submit" size="xl" disabled={pending}>
        {t("auth.continue")}
      </Button>
    </form>
  );
}
