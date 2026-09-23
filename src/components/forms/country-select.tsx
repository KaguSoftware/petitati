"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { OverlayScroll } from "@/components/ui/overlay-scroll";
import { COUNTRIES, type Country, countryFlag, countryName } from "@/lib/phone/countries";
import { cn } from "@/lib/utils";

interface CountryItem {
  value: string;
  label: string;
  dial: string;
}

interface Props {
  /** Form field name; submits the ISO alpha-2 code. */
  name: string;
  id?: string;
  defaultValue?: string | null;
  /** Show the `+dial` code next to each country (phone pickers). */
  withDial?: boolean;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  onValueChange?: (code: string | null) => void;
  /** A short list shown in the given order (no alphabetical sort). The current value is kept even when not in it. */
  countries?: readonly Country[];
}

/** Searchable country picker (Base UI Combobox). Names are localised via Intl.DisplayNames. */
export function CountrySelect({ name, id, defaultValue, withDial = false, required, disabled, className, onValueChange, countries }: Props) {
  const locale = useLocale();
  const t = useTranslations("common");
  const current = defaultValue?.toUpperCase();
  const items = useMemo<CountryItem[]>(() => {
    const toItem = (c: Country): CountryItem => {
      const label = countryName(c.code, locale);
      return { value: c.code, label: withDial ? `${label} (+${c.dial})` : label, dial: c.dial };
    };
    if (!countries) return COUNTRIES.map(toItem).sort((a, b) => a.label.localeCompare(b.label, locale));
    const list = countries.map(toItem);
    const saved = current && !countries.some((c) => c.code === current) ? COUNTRIES.find((c) => c.code === current) : undefined;
    return saved ? [...list, toItem(saved)] : list;
  }, [locale, withDial, countries, current]);
  const initial = current ? (items.find((i) => i.value === current) ?? null) : null;

  return (
    <Combobox<CountryItem>
      items={items}
      name={name}
      defaultValue={initial}
      required={required}
      disabled={disabled}
      modal={false}
      locale={locale}
      onValueChange={(v) => onValueChange?.(v ? v.value : null)}
    >
      <ComboboxInput id={id} placeholder={t("selectCountry")} className={cn("w-full", className)} autoComplete="off" />
      <ComboboxContent>
        <ComboboxEmpty>{t("noResults")}</ComboboxEmpty>
        <OverlayScroll className="max-h-[min(18rem,var(--available-height))]">
          <ComboboxList className="max-h-none overflow-visible">
            {(item: CountryItem) => (
              <ComboboxItem key={item.value} value={item}>
                <span aria-hidden className="w-6 text-center">
                  {countryFlag(item.value)}
                </span>
                <span className="flex-1 truncate">{countryName(item.value, locale)}</span>
                {withDial && (
                  <span dir="ltr" className="text-muted-foreground tabular-nums">
                    +{item.dial}
                  </span>
                )}
              </ComboboxItem>
            )}
          </ComboboxList>
        </OverlayScroll>
      </ComboboxContent>
    </Combobox>
  );
}
