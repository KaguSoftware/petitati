import { Link } from "@/i18n/navigation";
import { Price } from "@/components/storefront/shared/price";
import { ProductImage } from "@/components/storefront/shared/product-image";
import { RatingStars } from "@/components/storefront/shared/rating-stars";
import type { ProductCardProps } from "../types";

/**
 * Classic shop card: a square photo on the theme's muted tile, then brand, name and price below
 * in the page's own ink. Badges sit on the photo's start corner, the wishlist heart on the end
 * corner (outside the link, so it stays a separate control).
 */
export function ProductCardMinimal({ product, currency, locale, labels, wishlistSlot }: ProductCardProps) {
  const onSale = product.compareAtPrice !== null && product.compareAtPrice > product.price;
  const savings = onSale ? Math.round((1 - product.price / (product.compareAtPrice as number)) * 100) : 0;
  return (
    <article className="group relative flex h-full flex-col">
      <Link href={`/p/${product.slug}`} className="flex flex-1 flex-col gap-3 rounded-xl outline-none focus-visible:ring-4 focus-visible:ring-ring/50">
        <div className="relative overflow-hidden rounded-xl bg-muted">
          <ProductImage
            src={product.imageUrl}
            alt={product.imageAlt}
            className="aspect-square transition-transform duration-500 group-hover:scale-[1.04] motion-reduce:transition-none"
            sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
          />
          {!product.inStock && <div aria-hidden className="absolute inset-0 bg-background/45" />}
          <div className="absolute start-2.5 top-2.5 flex flex-col items-start gap-1.5 @tablet:start-3 @tablet:top-3">
            {product.isNew && product.inStock && (
              <span className="rounded-full bg-accent px-2.5 py-1 text-micro leading-none font-semibold text-accent-foreground">{labels.new}</span>
            )}
            {onSale && savings >= 5 && product.inStock && (
              <span className="rounded-full bg-primary px-2.5 py-1 text-micro leading-none font-semibold text-primary-foreground tabular-nums" dir="ltr">
                {`-${savings}%`}
              </span>
            )}
            {!product.inStock && (
              <span className="rounded-full bg-inverse/80 px-2.5 py-1 text-micro leading-none font-medium text-inverse-foreground">{labels.outOfStock}</span>
            )}
          </div>
        </div>
        <div className="flex flex-1 flex-col gap-1 px-0.5">
          {product.brand && <p className="truncate text-xs text-muted-foreground">{product.brand}</p>}
          <h3 className="bidi-auto line-clamp-2 text-label leading-snug font-medium text-balance">{product.name}</h3>
          <div className="mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-1 pt-1">
            <Price amount={product.price} compareAt={product.compareAtPrice} from={product.priceVaries ? labels.from : undefined} currency={currency} locale={locale} className="text-base" />
            {product.ratingCount > 0 && <RatingStars value={product.ratingAvg} count={product.ratingCount} size={13} />}
          </div>
        </div>
      </Link>
      {wishlistSlot && <div className="absolute end-2.5 top-2.5 @tablet:end-3 @tablet:top-3">{wishlistSlot}</div>}
    </article>
  );
}
