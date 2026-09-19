import { Link } from "@/i18n/navigation";
import { PageShell } from "@/components/storefront/shared/page-shell";
import { ProductGallery } from "@/components/storefront/shared/product-gallery";
import { RatingStars } from "@/components/storefront/shared/rating-stars";
import { Breadcrumb } from "@/components/storefront/shared/breadcrumb";
import { trustIcon } from "@/components/storefront/shared/trust-strip";
import type { ProductPageProps } from "../types";

/**
 * Gallery + buy box: a square photo with a thumbnail strip beside a sticky column (brand, name,
 * rating, the purchase tile, the store's promises, category chips). The description gets the full
 * width underneath so long copy never fights the buy box, then related products, then reviews.
 */
export function ProductPageMinimal({ product, breadcrumb, labels, purchasePanel, reviewsSection, wishlistSlot, promises, relatedSlot }: ProductPageProps) {
  return (
    <PageShell className="@desktop:py-10">
      <Breadcrumb items={breadcrumb} label={labels.breadcrumb} />
      <div className="grid gap-8 @tablet:grid-cols-2 @tablet:gap-10 @desktop:grid-cols-[1.1fr_1fr] @desktop:gap-14">
        <ProductGallery
          images={product.images}
          fallbackAlt={product.name}
          labels={{ previous: labels.previousImage, next: labels.nextImage, imageOf: labels.imageOf, zoom: labels.zoomImage, close: labels.closeImage }}
          stageClassName="aspect-square rounded-2xl ring-1 ring-foreground/5"
          sizes="(min-width: 768px) 50vw, 100vw"
          thumbs="row"
          thumbClassName="rounded-xl ring-1 ring-foreground/5"
          overlay={wishlistSlot && <div className="absolute end-3 top-3 z-10">{wishlistSlot}</div>}
        />
        <div className="flex flex-col gap-5 self-start @desktop:sticky @desktop:top-24">
          <div className="flex flex-col gap-2">
            {product.brand && (
              <p className="text-sm font-medium text-primary">
                {product.brandSlug ? (
                  <Link href={`/b/${product.brandSlug}`} className="hover:underline">
                    {product.brand}
                  </Link>
                ) : (
                  product.brand
                )}
              </p>
            )}
            <h1 className="bidi-auto text-title font-semibold tracking-tight text-balance @tablet:text-display">{product.name}</h1>
            {product.ratingCount > 0 && (
              <a href="#reviews" className="inline-flex w-fit items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground focus-ring">
                <RatingStars value={product.ratingAvg} size={16} />
                {labels.reviewCount && <span className="underline-offset-4 hover:underline">{labels.reviewCount}</span>}
              </a>
            )}
            {product.shortDescription && <p className="bidi-auto text-muted-foreground">{product.shortDescription}</p>}
          </div>
          <div className="rounded-2xl bg-card p-5 shadow-sm ring-1 ring-foreground/5 @tablet:p-6">{purchasePanel}</div>
          {promises && promises.length > 0 && (
            <ul className="flex flex-col gap-2 px-1">
              {promises.map((p, i) => {
                const Icon = trustIcon(p.icon);
                return (
                  <li key={i} className="flex items-center gap-2.5 text-sm">
                    <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                      <Icon className="size-4" />
                    </span>
                    <span className="bidi-auto">{p.title}</span>
                  </li>
                );
              })}
            </ul>
          )}
          {product.categories.length > 0 && (
            <ul className="flex flex-wrap gap-2 px-1">
              {product.categories.map((c) => (
                <li key={c.slug}>
                  <Link href={`/c/${c.slug}`} className="inline-flex h-8 items-center rounded-full bg-muted px-3 text-caption font-medium transition-colors hover:bg-primary hover:text-primary-foreground focus-ring">
                    <span className="bidi-auto">{c.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      {product.description && (
        <section className="flex flex-col gap-3 rounded-2xl bg-card p-5 shadow-sm ring-1 ring-foreground/5 @tablet:p-6">
          <h2 className="text-lg font-semibold">{labels.description}</h2>
          <div className="bidi-auto rich-text max-w-3xl text-muted-foreground whitespace-pre-line">{product.description}</div>
        </section>
      )}
      {relatedSlot}
      <section id="reviews" className="scroll-mt-24 border-t pt-8 @desktop:pt-10">
        {reviewsSection}
      </section>
    </PageShell>
  );
}
