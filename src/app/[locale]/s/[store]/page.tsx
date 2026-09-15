import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { storeContext } from "@/lib/tenant/context";
import { getBestSellers, getBrands, getCategories, getProducts } from "@/lib/catalog/queries";
import { featuredBrands } from "@/lib/catalog/brands";
import { renderSection } from "@/lib/theme/registry";
import { resolveHero } from "@/lib/theme/hero";
import { ProductGridWithWishlist } from "@/components/storefront/product-grid-with-wishlist";
import { BrandRow } from "@/components/storefront/shared/brand-row";
import { NewsletterForm } from "@/components/storefront/shared/newsletter-form";

/** One or two cards in a "Best sellers" band read as a broken page; below this the band stays hidden. */
const MIN_BEST_SELLERS = 4;

export default async function StoreHome({ params }: PageProps<"/[locale]/s/[store]">) {
  const ctx = await storeContext(params);
  const { store, locale, fallback } = ctx;
  const [t, tf, tn, categories, brands, bestSellers, featuredRaw, newest] = await Promise.all([
    getTranslations("home"),
    getTranslations("footer"),
    getTranslations("nav"),
    getCategories(store.id, locale, fallback),
    getBrands(store.id),
    getBestSellers(store.id, locale, fallback, 8).then((items) => (items.length >= MIN_BEST_SELLERS ? items : [])),
    getProducts(store.id, locale, fallback, { featuredOnly: true, pageSize: 16 }),
    getProducts(store.id, locale, fallback, { sort: "newest", pageSize: 24 }),
  ]);
  // No product appears in two bands: Best sellers wins, then Featured, then New arrivals.
  const shown = new Set(bestSellers.map((p) => p.id));
  const featured = { items: featuredRaw.items.filter((p) => !shown.has(p.id)).slice(0, 8) };
  for (const p of featured.items) shown.add(p.id);
  const arrivals = newest.items.filter((p) => !shown.has(p.id)).slice(0, 8);

  // No slides configured yet: one default slide. No uploaded photo on the first slide: borrow the
  // first featured photo (the full-bleed hero falls back to a gradient when null).
  const configured = resolveHero(store.hero, locale, fallback);
  const borrowed = featured.items[0]?.imageUrl ?? newest.items[0]?.imageUrl ?? null;
  const slides = (configured.length ? configured : [{ imageUrl: null, link: null }]).map((s, i) => ({
    title: s.title ?? (i === 0 ? t("heroTitle") : ""),
    subtitle: s.subtitle ?? (i === 0 ? (store.tagline ?? t("heroSubtitle")) : ""),
    ctaLabel: t("shopNow"),
    ctaHref: s.link ?? "/shop",
    imageUrl: s.imageUrl ?? (i === 0 ? borrowed : null),
  }));

  return (
    <main>
      {renderSection("hero", store.theme.sections.hero, {
        slides,
        labels: { previous: t("previousSlide"), next: t("nextSlide"), slideOf: t.raw("slideOf") as string, secondary: tn("brands") },
      })}
      {renderSection("categoryBanner", store.theme.sections.categoryBanner, {
        title: t("browseCategories"),
        categories: categories.filter((c) => !c.parentId),
      })}
      <Suspense>
        <ProductGridWithWishlist ctx={ctx} title={t("bestSellers")} products={bestSellers} emptyLabel="" />
      </Suspense>
      <Suspense>
        <ProductGridWithWishlist ctx={ctx} title={t("featured")} products={featured.items} emptyLabel="" viewAllHref="/shop" viewAllLabel={t("viewAll")} />
      </Suspense>
      <BrandRow title={t("shopByBrand")} viewAllLabel={t("viewAll")} brands={featuredBrands(brands)} />
      <Suspense>
        <ProductGridWithWishlist ctx={ctx} title={t("newArrivals")} products={arrivals} emptyLabel="" viewAllHref="/shop?sort=newest" viewAllLabel={t("viewAll")} />
      </Suspense>
      {renderSection("newsletter", store.theme.sections.newsletter, {
        title: tf("newsletter"),
        subtitle: tf("newsletterSubtitle"),
        formSlot: <NewsletterForm storeSlug={store.slug} />,
      })}
    </main>
  );
}
