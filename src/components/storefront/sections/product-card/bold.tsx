import { Link } from "@/i18n/navigation";
import { Price } from "@/components/storefront/shared/price";
import { ProductImage } from "@/components/storefront/shared/product-image";
import { RatingStars } from "@/components/storefront/shared/rating-stars";
import { cn } from "@/lib/utils";
import type { ProductCardProps } from "../types";

const squareBadge = "px-2 py-1 text-micro font-extrabold tracking-widest uppercase";

export function ProductCardBold({ product, currency, locale, labels, wishlistSlot }: ProductCardProps) {
  return (
    <article className="group relative flex h-full flex-col border-2 border-foreground bg-background">
      {/* The photo repeats the title link below: one tab stop per card, and screen readers hear the name once. */}
      <Link tabIndex={-1} aria-hidden href={`/p/${product.slug}`} className="relative block overflow-hidden border-b-2 border-foreground">
        <ProductImage
          src={product.imageUrl}
          alt={product.imageAlt}
          className="aspect-square transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none"
        />
        {product.isNew && <span className={cn("absolute start-3 top-3 flex min-h-10 items-center bg-accent text-accent-foreground", squareBadge)}>{labels.new}</span>}
        {!product.inStock && (
          <span className={cn("absolute inset-x-0 bottom-0 bg-inverse text-center text-inverse-foreground", squareBadge)}>{labels.outOfStock}</span>
        )}
      </Link>
      {wishlistSlot && <div className="absolute end-3 top-3">{wishlistSlot}</div>}
      <div className="flex flex-1 flex-col gap-2 p-3">
        <p className="min-h-[1lh] truncate text-micro font-bold tracking-widest text-muted-foreground uppercase">{product.brand}</p>
        <Link
          href={`/p/${product.slug}`}
          className="line-clamp-2 text-sm leading-tight font-extrabold tracking-tight uppercase decoration-2 underline-offset-4 hover:underline"
        >
          {product.name}
        </Link>
        <div className="min-h-5">{product.ratingCount > 0 && <RatingStars value={product.ratingAvg} count={product.ratingCount} />}</div>
        <Price
          amount={product.price}
          compareAt={product.compareAtPrice}
          from={product.priceVaries ? labels.from : undefined}
          currency={currency}
          locale={locale}
          className="mt-auto self-start bg-inverse px-2 py-1 text-sm text-inverse-foreground [&_s]:text-inverse-foreground/60 [&_span]:text-inverse-foreground"
        />
      </div>
    </article>
  );
}
