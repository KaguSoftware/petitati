import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { isLocale } from "@/i18n/config";
import { DEFAULT_THEME, NAVBAR_VARS, VARIANT_KEYS, themeToCssVars, type VariantKey } from "@/lib/theme/types";
import { cn } from "@/lib/utils";
import { buildSectionPreviews, PREVIEW_STORE_SLUG } from "@/lib/theme/preview";
import { fixtureHeroSlides } from "@/lib/theme/fixtures";
import { gridCombo } from "@/lib/theme/preview-compose";
import { StoreProvider } from "@/components/storefront/store-provider";
import { MessagesProvider } from "@/components/intl-provider";
import { clientMessages, STOREFRONT_STAFF_NAMESPACES } from "@/i18n/namespaces";

/**
 * Dev-only visual harness: every section of one variant rendered with fixture data, no database.
 * The same `buildSectionPreviews` feeds the admin design picker, so what QA sees here is what the
 * owner sees there.
 */
/** Dev-only harness: allowed to block on params (no static params for variants). */
export const instant = false;

export default async function PreviewPage({ params }: PageProps<"/[locale]/preview/[variant]">) {
  if (process.env.NODE_ENV === "production") notFound();
  const { locale, variant } = await params;
  setRequestLocale(locale);
  if (!isLocale(locale) || !(VARIANT_KEYS as readonly string[]).includes(variant)) notFound();
  const v = variant as VariantKey;

  const currency = "TRY";
  const storeName = "Petitati";
  // Outside `s/[store]`, so it does not inherit the storefront message set; the harness renders
  // the real sections (plus admin-labelled chrome), so it needs both.
  const [ta, messages, p] = await Promise.all([
    getTranslations("admin"),
    clientMessages(locale, STOREFRONT_STAFF_NAMESPACES),
    buildSectionPreviews({ locale, storeName, logoUrl: null, currency, announcement: "Free shipping on orders over ₺2.000", heroSlides: fixtureHeroSlides, gridSize: 8 }),
  ]);
  const store = { id: PREVIEW_STORE_SLUG, slug: PREVIEW_STORE_SLUG, name: storeName, currency, locale, enabledLocales: ["en", "tr", "fa"], logoUrl: null };

  return (
    <div className="@container">
      <div data-storefront data-store-theme className={cn("flex min-h-screen flex-col bg-background font-sans text-foreground *:w-full", NAVBAR_VARS[v])} style={themeToCssVars(DEFAULT_THEME, locale) as React.CSSProperties}>
        <MessagesProvider locale={locale} messages={messages}>
        <StoreProvider value={store}>
        {p.announcementBar[v]}
        {p.navbar[v]}
        <Label text={`${ta("nav.design")} · ${v} · hero`} />
        {p.hero[v]}
        <Label text="categoryBanner" />
        {p.categoryBanner[v]}
        <Label text="productGrid + productCard" />
        {p.productGrid[gridCombo(v, v)]}
        <Label text="productPage + reviews" />
        {p.productPage[v]}
        <Label text="cartDrawer (cart view)" />
        {p.cartDrawer[v]}
        <Label text="checkout" />
        {p.checkout[v]}
        <Label text="newsletter + footer" />
          {p.newsletter[v]}
          {p.footer[v]}
        </StoreProvider>
        </MessagesProvider>
      </div>
    </div>
  );
}

function Label({ text }: { text: string }) {
  return <div className="bg-yellow-200 px-4 py-1 text-xs font-mono text-yellow-900">preview · {text}</div>;
}
