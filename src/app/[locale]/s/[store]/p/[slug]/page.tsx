import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { storeContext } from "@/lib/tenant/context";
import { getApprovedReviews, getCategories, getProductBySlug } from "@/lib/catalog/queries";
import { categoryChain } from "@/lib/catalog/tree";
import { renderSection } from "@/lib/theme/registry";
import { getSessionUser } from "@/lib/auth/session";
import { getMyWishlistIds } from "@/lib/account/queries";
import { AddToCartPanel } from "@/components/storefront/shared/add-to-cart-panel";
import { ReviewForm } from "@/components/storefront/shared/review-form";
import { VariantSelectionProvider } from "@/components/storefront/shared/variant-selection";
import { GuestWishlistButton, WishlistButton } from "@/components/storefront/shared/wishlist-button";

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

  const [t, tc, tn, rawReviews, categories] = await Promise.all([
    getTranslations("product"),
    getTranslations("common"),
    getTranslations("nav"),
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
      inStock: t("inStock"),
      outOfStock: t("outOfStock"),
      previousImage: t("previousImage"),
      nextImage: t("nextImage"),
      imageOf: t.raw("imageOf") as string,
    },
    purchasePanel: <AddToCartPanel product={product} storeSlug={store.slug} currency={store.currency} locale={locale} />,
    wishlistSlot: (
      <Suspense>
        <ProductWishlist storeId={store.id} storeSlug={store.slug} productId={product.id} />
      </Suspense>
    ),
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
  return <VariantSelectionProvider>{page}</VariantSelectionProvider>;
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
