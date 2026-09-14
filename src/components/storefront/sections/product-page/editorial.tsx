import { Link } from "@/i18n/navigation";
import { RatingStars } from "@/components/storefront/shared/rating-stars";
import type { ProductPageProps } from "../types";
import { EditorialPhotos } from "./editorial-photos";

/** Lookbook: every photo full size, stacked down one column, while the text column stays in view. */
export function ProductPageEditorial({ product, labels, purchasePanel, reviewsSection, wishlistSlot }: ProductPageProps) {
  return (
    <main className="mx-auto max-w-7xl px-gutter py-10">
      <nav className="mb-6 text-xs uppercase tracking-[0.18em] text-muted-foreground">
        {product.categories.map((c, i) => (
          <span key={c.slug}>
            {i > 0 && (
              <span aria-hidden className="mx-2">
                /
              </span>
            )}
            <Link href={`/c/${c.slug}`} className="transition-colors hover:text-foreground">
              {c.name}
            </Link>
          </span>
        ))}
      </nav>
      <div className="grid gap-10 @desktop:grid-cols-12 @desktop:gap-14">
        <EditorialPhotos images={product.images} name={product.name} wishlistSlot={wishlistSlot} />
        <div className="flex flex-col gap-8 self-start @desktop:sticky @desktop:top-24 @desktop:col-span-5">
          <div className="flex flex-col gap-3">
            {product.brand && (
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                {product.brandSlug ? (
                  <Link href={`/b/${product.brandSlug}`} className="hover:underline">
                    {product.brand}
                  </Link>
                ) : (
                  product.brand
                )}
              </p>
            )}
            <h1 className="bidi-auto font-serif text-3xl font-medium tracking-tight text-balance @tablet:text-4xl">{product.name}</h1>
            {product.ratingCount > 0 && <RatingStars value={product.ratingAvg} count={product.ratingCount} size={16} className="opacity-70" />}
            {product.shortDescription && <p className="bidi-auto max-w-prose font-serif text-lg italic text-muted-foreground">{product.shortDescription}</p>}
          </div>
          <div className="border border-foreground/15 p-5 @tablet:p-6">{purchasePanel}</div>
          {product.description && (
            <section className="border-t border-foreground/15 pt-6">
              <h2 className="mb-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">{labels.description}</h2>
              <div className="bidi-auto max-w-prose text-sm leading-relaxed whitespace-pre-line text-muted-foreground">{product.description}</div>
            </section>
          )}
        </div>
      </div>
      <section className="mt-16 border-t border-foreground/15 pt-10">{reviewsSection}</section>
    </main>
  );
}
