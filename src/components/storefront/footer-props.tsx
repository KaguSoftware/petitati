import "server-only";

import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import type { CategoryData } from "@/lib/catalog/types";
import type { ResolvedFooter, TrustIcon } from "@/lib/theme/footer";
import type { FooterProps } from "./sections/types";

/** Top-level categories shown in a footer's shop column (the navbar drawer lists them all). */
export const MAX_FOOTER_CATEGORIES = 6;

/** The four default promises, used while the owner has not written their own. */
const DEFAULT_TRUST: { icon: TrustIcon; key: "shipping" | "payment" | "returns" | "support" }[] = [
  { icon: "truck", key: "shipping" },
  { icon: "shield-check", key: "payment" },
  { icon: "rotate-ccw", key: "returns" },
  { icon: "headset", key: "support" },
];

interface Input {
  storeName: string;
  logoUrl: string | null;
  tagline: string | null;
  email: string | null;
  phone: string | null;
  categories: Pick<CategoryData, "slug" | "name">[];
  resolved: ResolvedFooter;
  localeSlot: ReactNode;
  year: number;
  /**
   * `store.settings.pages` + the locales to read it in. The footer linked About/Privacy/Terms
   * unconditionally, so a store whose owner had not written them showed three links to a page
   * containing a single em-dash. Omit to link all three (previews and fixtures).
   */
  pages?: { content: Record<string, Record<string, string>>; locale: string; fallback: string };
}

type FooterT = Awaited<ReturnType<typeof getTranslations<"footer">>>;

/** The trust promises as shown: null when the strip is off, the four message defaults when the owner wrote none. */
export function resolveTrustItems(resolved: ResolvedFooter, tf: FooterT): { icon: TrustIcon; title: string; text: string }[] | null {
  const defaults = DEFAULT_TRUST.map((d) => ({ icon: d.icon, title: tf(`trust.${d.key}.title`), text: tf(`trust.${d.key}.text`) }));
  return resolved.trustItems === null
    ? null
    : resolved.trustItems.length === 0
      ? defaults
      : resolved.trustItems.map((item, i) => ({ icon: item.icon, title: item.title ?? defaults[i]?.title ?? "", text: item.text ?? "" }));
}

/** One place that turns store data + settings into the footer contract, for the live chrome and the previews alike. */
export async function buildFooterProps(input: Input): Promise<FooterProps> {
  const [tn, tf] = await Promise.all([getTranslations("nav"), getTranslations("footer")]);
  const { resolved } = input;
  const hasPage = (key: string) => {
    if (!input.pages) return true;
    const { content, locale, fallback } = input.pages;
    return Boolean((content[key]?.[locale] ?? content[key]?.[fallback] ?? "").trim());
  };
  const trustItems = resolveTrustItems(resolved, tf);

  return {
    storeName: input.storeName,
    logoUrl: input.logoUrl,
    tagline: input.tagline,
    shopLinks: [
      { href: "/shop", label: tn("shop") },
      { href: "/brands", label: tn("brands") },
      ...input.categories.slice(0, MAX_FOOTER_CATEGORIES).map((c) => ({ href: `/c/${c.slug}`, label: c.name })),
    ],
    infoLinks: [
      ...(hasPage("about") ? [{ href: "/about", label: tf("about") }] : []),
      { href: "/account", label: tf("account") },
      ...(hasPage("privacy") ? [{ href: "/privacy", label: tf("privacy") }] : []),
      ...(hasPage("terms") ? [{ href: "/terms", label: tf("terms") }] : []),
    ],
    contact: { email: input.email, phone: input.phone, address: resolved.address, hours: resolved.hours },
    social: resolved.social.map((s) => ({ ...s, label: tf(`social.${s.key}`) })),
    trustItems,
    payments: resolved.payments.map((id) => ({ id, label: tf(`payments.${id}`) })),
    labels: {
      shop: tf("shop"),
      info: tf("info"),
      contact: tf("contact"),
      followUs: tf("followUs"),
      address: tf("address"),
      hours: tf("hours"),
      weAccept: tf("weAccept"),
      rights: tf("rights"),
    },
    localeSlot: input.localeSlot,
    year: input.year,
  };
}
