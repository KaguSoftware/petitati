import { Link } from "@/i18n/navigation";
import { Price } from "@/components/storefront/shared/price";
import { ProductImage } from "@/components/storefront/shared/product-image";
import { RatingStars } from "@/components/storefront/shared/rating-stars";
import { cn } from "@/lib/utils";
import type { ProductCardProps } from "../types";

/**
 * Classic shop card as a white tile: the square photo flush to the tile's top, a hairline, then
 * brand, name, rating and price in the body. Badges sit on the photo's start corner, the wishlist
 * heart on the end corner (outside the link, so it stays a separate control). The whole tile
 * lifts a touch on hover.
 */
export function ProductCardMinimal({ product, currency, locale, labels, wishlistSlot }: ProductCardProps) {
  const onSale = product.compareAtPrice !== null && product.compareAtPrice > product.price;
  const savings = onSale ? Math.round((1 - product.price / (product.compareAtPrice as number)) * 100) : 0;
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-foreground/5 transition-[box-shadow,transform] duration-300 hover:shadow-md motion-safe:hover:-translate-y-0.5">
      <Link href={`/p/${product.slug}`} className="flex flex-1 flex-col outline-none focus-visible:ring-4 focus-visible:ring-ring/50 focus-visible:ring-inset">
        <div className="relative overflow-hidden border-b border-foreground/5">
          <ProductImage
            src={product.imageUrl}
            alt={product.imageAlt}
            className={cn(
              "aspect-square transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none",
              !product.inStock && "opacity-70 grayscale",
            )}
            sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
          />
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
        <div className="flex flex-1 flex-col gap-1 p-3 @tablet:p-4">
          {product.brand && <p className="truncate text-micro font-medium tracking-wide text-muted-foreground uppercase">{product.brand}</p>}
          <h3 className="bidi-auto line-clamp-2 text-label leading-snug font-medium text-balance">{product.name}</h3>
          {product.ratingCount > 0 && <RatingStars value={product.ratingAvg} count={product.ratingCount} size={13} />}
          <div className="mt-auto pt-2">
            <Price amount={product.price} compareAt={product.compareAtPrice} from={product.priceVaries ? labels.from : undefined} currency={currency} locale={locale} className="text-base" />
          </div>
        </div>
      </Link>
      {wishlistSlot && <div className="absolute end-2.5 top-2.5 @tablet:end-3 @tablet:top-3">{wishlistSlot}</div>}
    </article>
  );
}
