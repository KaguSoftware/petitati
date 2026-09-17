"use client";

import { Languages } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePathname, useRouter } from "@/i18n/navigation";
import { localeNames, locales, type Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";

interface Props {
  /** Restrict to the store's enabled locales. */
  enabled?: readonly string[];
  /** `compact` shows an icon + locale code (navbar); `full` shows the language name. */
  variant?: "compact" | "full";
  /**
   * A line shown under the options — the storefront uses it for the "this shop is Turkish, other
   * languages are machine-translated" notice the owner asked for (2026-09-15).
   */
  notice?: string;
  className?: string;
}

export function LocaleSwitcher({ enabled, variant = "full", notice, className }: Props) {
  const locale = useLocale();
  const t = useTranslations("common");
  const pathname = usePathname();
  const router = useRouter();
  const [pending, start] = useTransition();
  const items = locales
    .filter((l) => !enabled || enabled.includes(l))
    .map((l) => ({ value: l, label: localeNames[l] }));

  return (
    <Select
      items={items}
      value={locale}
      modal={false}
      disabled={pending}
      onValueChange={(value) => {
        const next = value as Locale;
        if (!next || next === locale) return;
        document.cookie = `NEXT_LOCALE=${next}; path=/; max-age=31536000; samesite=lax`;
        start(() => router.replace(pathname, { locale: next }));
      }}
    >
      <SelectTrigger
        aria-label={t("language")}
        size="sm"
        /**
         * The `!`s are load-bearing. `SelectTrigger` packs its geometry into `data-[size=sm]:`
         * variants, which Tailwind emits AFTER plain utilities and which therefore beat anything
         * passed in here — so the old `rounded-full` silently lost to `data-[size=sm]:rounded-[…]`
         * and this rendered as a 10px-radius box, not a pill. The padding had a second problem:
         * this project's `cn` is the `cn` package, not `tailwind-merge`, and it does not treat
         * `px-*` as conflicting with the base `ps-*`/`pe-*`, which win on emission order. The old
         * `px-2.5` was dead too, leaving 8px on the chevron side.
         *
         * Compact = a 40 px round icon button on phones (the bar holds burger, logo, account and
         * cart there, so the code and the chevron only appear from @tablet, where they fit).
         */
        className={cn(
          variant === "compact" &&
            "h-10! w-10 justify-center gap-0 rounded-full! border-transparent bg-transparent ps-0! pe-0! hover:bg-muted @tablet:w-auto @tablet:gap-2 @tablet:border-border/70 @tablet:ps-3.5! @tablet:pe-2.5! [&>svg:last-child]:hidden @tablet:[&>svg:last-child]:block",
          className,
        )}
      >
        {variant === "compact" ? (
          <>
            <Languages className="text-muted-foreground" />
            <span translate="no" className="notranslate hidden text-caption font-medium uppercase tracking-wide @tablet:inline">{locale}</span>
          </>
        ) : (
          <SelectValue translate="no" className="notranslate" />
        )}
      </SelectTrigger>
      <SelectContent
        align="end"
        alignItemWithTrigger={false}
        className={cn(notice && "min-w-64")}
        footer={
          notice ? (
            <p role="note" className="bidi-auto max-w-64 border-t px-2.5 py-2 text-caption leading-snug text-muted-foreground">
              {notice}
            </p>
          ) : undefined
        }
      >
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {/* Each name in its own language, kept out of browser page translation: a translated page
                otherwise turns "Türkçe" into "English" and the menu shows English twice. */}
            <span lang={item.value} translate="no" className="notranslate">
              {item.label}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
