"use client";

import { useTranslations } from "next-intl";
import { Label } from "@/components/ui/label";
import { PHONE_COUNTRIES } from "@/lib/phone/countries";
import { CountrySelect } from "./country-select";
import { LatinInput } from "./latin-input";

interface Props {
  /** Field name prefix: submits `<name>_country` and `<name>`. Defaults to "phone". */
  name?: string;
  defaultCountry: string;
  defaultNumber?: string;
  required?: boolean;
  error?: string;
  /** Override labels (defaults come from `auth.phone` / `auth.phoneCountry`). */
  labels?: { number?: string; country?: string };
  className?: string;
}

/** Country dial-code picker + LTR national number. The server composes E.164 (see lib/phone/normalize). */
export function PhoneField({ name = "phone", defaultCountry, defaultNumber = "", required = true, error, labels, className }: Props) {
  const t = useTranslations("auth");
  const numberId = `${name}-number`;
  const countryId = `${name}-country`;
  return (
    <div className={className}>
      <div className="grid grid-cols-[minmax(8.5rem,2fr)_3fr] gap-2">
        <div className="grid gap-1.5">
          <Label htmlFor={countryId} className="sr-only">
            {labels?.country ?? t("phoneCountry")}
          </Label>
          <CountrySelect id={countryId} name={`${name}_country`} defaultValue={defaultCountry} countries={PHONE_COUNTRIES} withDial required={required} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={numberId} className="sr-only">
            {labels?.number ?? t("phone")}
          </Label>
          <LatinInput
            kind="tel"
            id={numberId}
            name={name}
            defaultValue={defaultNumber}
            required={required}
            autoComplete="tel-national"
            placeholder={defaultCountry === "TR" ? "555 123 45 67" : "912 345 6789"}
            aria-invalid={error ? true : undefined}
          />
        </div>
      </div>
      {error && (
        <p role="alert" className="mt-1.5 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
