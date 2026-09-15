import { Link } from "@/i18n/navigation";
import { ProductGallery } from "@/components/storefront/shared/product-gallery";
import { RatingStars } from "@/components/storefront/shared/rating-stars";
import { cn } from "@/lib/utils";
import { Breadcrumb } from "@/components/storefront/shared/breadcrumb";
import type { ProductPageProps } from "../types";

export function ProductPagePlayful({ product, breadcrumb, labels, purchasePanel, reviewsSection, wishlistSlot }: ProductPageProps) {
  return (
    <main className="mx-auto max-w-7xl px-gutter py-8">
      <Breadcrumb items={breadcrumb} label={labels.breadcrumb} className="mb-6" />
      <div className="grid gap-10 @tablet:grid-cols-2">
        <ProductGallery
          images={product.images}
          fallbackAlt={product.name}
          labels={{ previous: labels.previousImage, next: labels.nextImage, imageOf: labels.imageOf }}
          stageClassName="aspect-square rounded-3xl shadow-lg shadow-primary/10 ring-1 ring-foreground/5"
          sizes="(min-width: 768px) 50vw, 100vw"
          thumbs="grid"
          thumbClassName="rounded-2xl ring-1 ring-foreground/5"
          className="gap-4"
          overlay={wishlistSlot && <div className="absolute end-4 top-4 z-10">{wishlistSlot}</div>}
        />
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {product.brand && (
                <p className="rounded-full bg-accent/20 px-3 py-1 text-xs font-semibold text-accent-foreground">
                  {product.brandSlug ? (
                    <Link href={`/b/${product.brandSlug}`} className="hover:underline">
                      {product.brand}
                    </Link>
                  ) : (
                    product.brand
                  )}
                </p>
              )}
              <p
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-semibold",
                  product.inStock ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
                )}
              >
                {product.inStock ? labels.inStock : labels.outOfStock}
              </p>
            </div>
            <h1 className="bidi-auto text-3xl font-bold tracking-tight @tablet:text-4xl">{product.name}</h1>
            {product.ratingCount > 0 && <RatingStars value={product.ratingAvg} count={product.ratingCount} size={16} />}
            {product.shortDescription && <p className="bidi-auto text-lg text-muted-foreground">{product.shortDescription}</p>}
          </div>
          <div className="rounded-3xl bg-muted p-6 ring-1 ring-foreground/5">{purchasePanel}</div>
          {product.description && (
            <section className="rounded-3xl bg-background p-6 ring-1 ring-foreground/5">
              <h2 className="mb-2 text-lg font-bold">{labels.description}</h2>
              <div className="bidi-auto rich-text max-w-none text-muted-foreground whitespace-pre-line">{product.description}</div>
            </section>
          )}
        </div>
      </div>
      <section className="mt-14 rounded-3xl bg-muted/40 p-6 ring-1 ring-foreground/5 @tablet:p-8">{reviewsSection}</section>
    </main>
  );
}
