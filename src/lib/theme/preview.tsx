import "server-only";

import { Suspense, type ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/config";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { AccountMenuFallback } from "@/components/storefront/shared/account-button";
import { AddToCartPanel } from "@/components/storefront/shared/add-to-cart-panel";
import { CartButtonFallback } from "@/components/storefront/shared/cart-button";
import { CartLineControls } from "@/components/storefront/shared/cart-line-controls";
import { CheckoutForm } from "@/components/storefront/shared/checkout-form";
import { CouponForm } from "@/components/storefront/shared/coupon-form";
import { NewsletterForm } from "@/components/storefront/shared/newsletter-form";
import { ReviewForm } from "@/components/storefront/shared/review-form";
import { computeTotals } from "@/lib/checkout/totals";
import { formatMoney } from "@/lib/money";
import { buildFooterProps } from "@/components/storefront/footer-props";
import { fixtureCart, fixtureCategories, fixtureContactPhone, fixtureFooterContent, fixtureHeroImage, fixtureProduct, fixtureProducts, fixtureReviews, fixtureTopCategories } from "./fixtures";
import { resolveFooter } from "./footer";
import type { ResolvedHeroSlide } from "./hero";
import { gridCombo, type SectionPreviews } from "./preview-compose";
import { renderSection } from "./registry";
import { PREVIEW_STORE_SLUG } from "./preview-slug";
import { VARIANT_KEYS, type VariantKey } from "./types";

export interface PreviewInput {
  locale: Locale;
  storeName: string;
  logoUrl: string | null;
  currency: string;
  /** Announcement text; empty renders nothing (the bar variants return null). */
  announcement: string;
  /** Resolved hero slides; none (or missing parts of the first) fall back to the `home` messages and the fixture photo. */
  heroSlides?: ResolvedHeroSlide[];
  /** Products per grid preview (16 combos are rendered, so keep it small). */
  gridSize?: number;
}

export { PREVIEW_STORE_SLUG } from "./preview-slug";

/**
 * Every section variant rendered with fixture data and inert slots, no database. Used by the
 * dev harness (/preview/[variant]) and the admin design picker, so both always show the same thing.
 */
export async function buildSectionPreviews(input: PreviewInput): Promise<SectionPreviews> {
  const { locale, storeName, logoUrl, currency, announcement, gridSize = 6 } = input;
  const [t, tn, tf, tp, tc, tco, tcommon] = await Promise.all([
    getTranslations("home"),
    getTranslations("nav"),
    getTranslations("footer"),
    getTranslations("product"),
    getTranslations("cart"),
    getTranslations("checkout"),
    getTranslations("common"),
  ]);
  const totals = computeTotals(
    fixtureCart,
    { id: "r", store_id: "s", name: { en: "Standard" }, rate: 4990, free_over: 200000, cost: 3500, countries: null, min_days: 2, max_days: 5, is_active: true, sort_order: 0 },
    { tax_rate_bp: 2000, prices_include_tax: true },
  );
  const configured = input.heroSlides ?? [];
  const heroSlides = (configured.length ? configured : [{ imageUrl: null, link: null }]).map((s, i) => ({
    title: s.title ?? (i === 0 ? t("heroTitle") : ""),
    subtitle: s.subtitle ?? (i === 0 ? t("heroSubtitle") : ""),
    ctaLabel: t("shopNow"),
    ctaHref: s.link ?? "/shop",
    imageUrl: s.imageUrl ?? (i === 0 ? fixtureHeroImage : null),
  }));
  const heroLabels = { previous: t("previousSlide"), next: t("nextSlide"), slideOf: t.raw("slideOf") as string, secondary: tn("brands") };
  const gridProducts = fixtureProducts.slice(0, gridSize);
  const each = <T,>(f: (v: VariantKey) => T) => Object.fromEntries(VARIANT_KEYS.map((v) => [v, f(v)])) as Record<VariantKey, T>;
  const reviewsProps = () => ({
    reviews: fixtureReviews,
    ratingAvg: 4.5,
    ratingCount: 12,
    locale,
    labels: { title: tp("reviews"), empty: tp("noReviews"), emptyTitle: tp("noReviewsTitle"), verified: tp("verifiedPurchase") },
    formSlot: (<ReviewForm storeSlug={PREVIEW_STORE_SLUG} productId="00000000-0000-4000-8000-000000000009" />) as ReactNode,
  });

  const footerProps = await buildFooterProps({
    storeName,
    logoUrl,
    tagline: heroSlides[0].subtitle,
    email: "hello@petitati.local",
    phone: fixtureContactPhone,
    categories: fixtureTopCategories,
    resolved: resolveFooter(fixtureFooterContent, locale, "en"),
    localeSlot: <LocaleSwitcher notice={tn("translationNotice")} />,
    year: 2026,
  });

  const productGrid = {} as SectionPreviews["productGrid"];
  for (const grid of VARIANT_KEYS) {
    for (const card of VARIANT_KEYS) {
      productGrid[gridCombo(grid, card)] = (
        <Suspense key={gridCombo(grid, card)}>
          {renderSection("productGrid", grid, {
            title: t("featured"),
            products: gridProducts,
            currency,
            locale,
            cardVariant: card,
            emptyLabel: "",
            viewAllHref: "/shop",
            viewAllLabel: t("viewAll"),
          })}
        </Suspense>
      );
    }
  }

  return {
    announcementBar: each((v) => renderSection("announcementBar", v, { text: announcement })),
    navbar: each((v) =>
      renderSection("navbar", v, {
        storeName,
        logoUrl,
        categories: fixtureCategories,
        labels: { home: tn("home"), shop: tn("shop"), brands: tn("brands"), search: tn("search"), menu: tn("menu"), closeMenu: tn("closeMenu"), categories: tn("categories"), call: tn("call"), viewAll: tn("viewAll") },
        contactPhone: fixtureContactPhone,
        localeSlot: <LocaleSwitcher variant="compact" notice={tn("translationNotice")} />,
        accountSlot: <AccountMenuFallback />,
        cartSlot: <CartButtonFallback />,
      }),
    ),
    hero: each((v) => renderSection("hero", v, { slides: heroSlides, labels: heroLabels, autoplay: false })),
    categoryBanner: each((v) => renderSection("categoryBanner", v, { title: t("browseCategories"), categories: fixtureTopCategories })),
    productGrid,
    productPage: each((v) =>
      renderSection("productPage", v, {
        product: fixtureProduct,
        currency,
        locale,
        breadcrumb: [{ href: "/shop", label: tn("shop") }, ...fixtureProduct.categories.map((c) => ({ href: `/c/${c.slug}`, label: c.name }))],
        labels: {
          breadcrumb: tcommon("breadcrumb"),
          description: tp("description"),
          sku: tp("sku"),
          reviews: tp("reviews"),
          inStock: tp("inStock"),
          outOfStock: tp("outOfStock"),
          previousImage: tp("previousImage"),
          nextImage: tp("nextImage"),
          imageOf: tp.raw("imageOf") as string,
        },
        purchasePanel: <AddToCartPanel product={fixtureProduct} storeSlug={PREVIEW_STORE_SLUG} currency={currency} locale={locale} />,
        reviewsSection: renderSection("reviews", v, reviewsProps()),
      }),
    ),
    cartDrawer: each((v) =>
      renderSection("cartDrawer", v, {
        cart: fixtureCart,
        totals,
        currency,
        locale,
        labels: {
          title: tc("title"),
          empty: tc("empty"), emptyTitle: tc("emptyTitle"),
          subtotal: tc("subtotal"),
          discount: tc("discount"),
          shipping: tc("shipping"),
          tax: tc("tax"),
          total: tc("total"),
          checkout: tc("checkout"),
          continueShopping: tc("continueShopping"),
          freeShipping: tc("freeShipping"),
          shippingNote: tc("freeShippingOver", { amount: formatMoney(200000, currency, locale) }),
        },
        lineControls: Object.fromEntries(
          fixtureCart.lines.map((l) => [l.id, <CartLineControls key={l.id} storeSlug={PREVIEW_STORE_SLUG} itemId={l.id} quantity={l.quantity} maxQty={l.maxQty} />]),
        ),
        couponSlot: <CouponForm storeSlug={PREVIEW_STORE_SLUG} appliedCode={null} />,
        checkoutHref: "/checkout",
        shopHref: "/shop",
      }),
    ),
    checkout: each((v) =>
      renderSection("checkout", v, {
        title: tco("title"),
        form: (
          <CheckoutForm
            storeSlug={PREVIEW_STORE_SLUG}
            locale={locale}
            currency={currency}
            email={null}
            addresses={[]}
            shippingOptions={[
              { id: "00000000-0000-4000-8000-000000000010", name: "Standard", rate: 4990, freeOver: 200000, isFree: false },
              { id: "00000000-0000-4000-8000-000000000011", name: "Express", rate: 9990, freeOver: null, isFree: false },
            ]}
            defaultCountry="TR"
          />
        ),
        summary: (
          <p className="text-sm text-muted-foreground">
            {tc("subtotal")}: {formatMoney(fixtureCart.subtotal, currency, locale)}
          </p>
        ),
      }),
    ),
    reviews: each((v) => renderSection("reviews", v, reviewsProps())),
    newsletter: each((v) => renderSection("newsletter", v, { title: tf("newsletter"), subtitle: tf("newsletterSubtitle"), formSlot: <NewsletterForm storeSlug={PREVIEW_STORE_SLUG} /> })),
    footer: each((v) => renderSection("footer", v, footerProps)),
  };
}
