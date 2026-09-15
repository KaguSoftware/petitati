import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { storeContext, type StoreContext } from "@/lib/tenant/context";
import { getApprovedReviews, getCategories, getProductBySlug, getProducts } from "@/lib/catalog/queries";
import { categoryChain } from "@/lib/catalog/tree";
import { renderSection } from "@/lib/theme/registry";
import { resolveFooter } from "@/lib/theme/footer";
import { getSessionUser } from "@/lib/auth/session";
import { getMyWishlistIds } from "@/lib/account/queries";
import { resolveTrustItems } from "@/components/storefront/footer-props";
import { ProductGridWithWishlist } from "@/components/storefront/product-grid-with-wishlist";
import { ProductEditSlot } from "@/components/storefront/admin/product-edit-slot";
import { AddToCartPanel } from "@/components/storefront/shared/add-to-cart-panel";
import { ReviewForm } from "@/components/storefront/shared/review-form";
import { VariantSelectionProvider } from "@/components/storefront/shared/variant-selection";
import { GuestWishlistButton, WishlistButton } from "@/components/storefront/shared/wishlist-button";

/** Fewer related products than this read as a broken band; the section then stays hidden. */
const MIN_RELATED = 4;
const MAX_RELATED = 8;
/** Promises under the buy box: the first three of the store's trust strip. */
const MAX_PROMISES = 3;

export async function generateMetadata({ params }: PageProps<"/[locale]/s/[store]/p/[slug]">): Promise<Metadata> {
  const ctx = await storeContext(params);
  const { slug } = await params;
  const product = await getProductBySlug(ctx.store.id, slug, ctx.locale, ctx.fallback);
  if (!product) return {};
  return {
    title: product.seoTitle ?? product.name,
    description: product.seoDescription ?? product.shortDescription ?? undefined,
    openGraph: product.imageUrl ? { images: [product.imageUrl] } : undefined,
  };
}

export default async function ProductPage({ params }: PageProps<"/[locale]/s/[store]/p/[slug]">) {
  const ctx = await storeContext(params);
  const { store, locale, fallback } = ctx;
  const { slug } = await params;
  const product = await getProductBySlug(store.id, slug, locale, fallback);
  if (!product) notFound();

  const [t, tc, tn, tf, rawReviews, categories] = await Promise.all([
    getTranslations("product"),
    getTranslations("common"),
    getTranslations("nav"),
    getTranslations("footer"),
    getApprovedReviews(product.id),
    getCategories(store.id, locale, fallback),
  ]);
  // A product is filed in its leaf category; the breadcrumb shows the whole chain above the
  // deepest one (Shop › Cats › Cat food › Dry food), not the flat list of assigned categories.
  const deepest = product.categories.map((c) => categoryChain(categories, c.slug)).sort((a, b) => b.length - a.length)[0] ?? [];
  const breadcrumb = [{ href: "/shop", label: tn("shop") }, ...deepest.map((c) => ({ href: `/c/${c.slug}`, label: c.name }))];
  // The catalog query reports a missing reviewer name as null rather than inventing the English
  // word "Customer", which used to render verbatim on the Persian storefront.
  const reviews = rawReviews.map((r) => ({ ...r, authorName: r.authorName ?? tc("customer") }));
  const promises = (resolveTrustItems(resolveFooter(store.footer, locale, fallback), tf) ?? []).slice(0, MAX_PROMISES).map((p) => ({ icon: p.icon, title: p.title }));
  const leaf = deepest.at(-1)?.slug;
  // The provider lets the theme's gallery follow the size/colour picked in the purchase panel.
  const page = renderSection("productPage", store.theme.sections.productPage, {
    product,
    currency: store.currency,
    locale,
    breadcrumb,
    labels: {
      breadcrumb: tc("breadcrumb"),
      description: t("description"),
      sku: t("sku"),
      reviews: t("reviews"),
      reviewCount: t("reviewCount", { count: product.ratingCount }),
      inStock: t("inStock"),
      outOfStock: t("outOfStock"),
      previousImage: t("previousImage"),
      nextImage: t("nextImage"),
      imageOf: t.raw("imageOf") as string,
    },
    promises,
    purchasePanel: <AddToCartPanel product={product} storeSlug={store.slug} currency={store.currency} locale={locale} />,
    wishlistSlot: (
      <Suspense>
        <ProductWishlist storeId={store.id} storeSlug={store.slug} productId={product.id} />
      </Suspense>
    ),
    relatedSlot: leaf ? (
      <Suspense>
        <RelatedProducts ctx={ctx} productId={product.id} categorySlug={leaf} title={t("related")} />
      </Suspense>
    ) : null,
    reviewsSection: renderSection("reviews", store.theme.sections.reviews, {
      reviews,
      ratingAvg: product.ratingAvg,
      ratingCount: product.ratingCount,
      locale,
      labels: { title: t("reviews"), empty: t("noReviews"), emptyTitle: t("noReviewsTitle"), verified: t("verifiedPurchase") },
      formSlot: (
        <Suspense>
          <ReviewFormGate storeSlug={store.slug} productId={product.id} signInLabel={t("signInToReview")} />
        </Suspense>
      ),
    }),
  });
  return (
    <VariantSelectionProvider>
      {page}
      {/* Staff see a floating "Edit product" bar; everyone else gets nothing (the slot reads the session). */}
      <Suspense>
        <ProductEditSlot store={store} locale={locale} productId={product.id} />
      </Suspense>
    </VariantSelectionProvider>
  );
}

/** Other products from the same shelf, without the one on the page. Hidden when the shelf is nearly empty. */
async function RelatedProducts({ ctx, productId, categorySlug, title }: { ctx: StoreContext; productId: string; categorySlug: string; title: string }) {
  const { items } = await getProducts(ctx.store.id, ctx.locale, ctx.fallback, { categorySlug, pageSize: MAX_RELATED + 1 });
  const related = items.filter((p) => p.id !== productId).slice(0, MAX_RELATED);
  if (related.length < MIN_RELATED) return null;
  return (
    <section className="flex flex-col gap-5">
      <h2 className="bidi-auto text-xl font-semibold tracking-tight @tablet:text-2xl">{title}</h2>
      <ProductGridWithWishlist ctx={ctx} products={related} bare emptyLabel="" />
    </section>
  );
}

async function ProductWishlist({ storeId, storeSlug, productId }: { storeId: string; storeSlug: string; productId: string }) {
  const user = await getSessionUser();
  if (!user) return <GuestWishlistButton />;
  const ids = await getMyWishlistIds(storeId);
  return <WishlistButton storeSlug={storeSlug} productId={productId} active={ids.has(productId)} />;
}

async function ReviewFormGate({ storeSlug, productId, signInLabel }: { storeSlug: string; productId: string; signInLabel: string }) {
  const user = await getSessionUser();
  if (!user) return <p className="text-sm text-muted-foreground">{signInLabel}</p>;
  return <ReviewForm storeSlug={storeSlug} productId={productId} />;
}
