import { Link } from "@/i18n/navigation";
import { Price } from "@/components/storefront/shared/price";
import { ProductImage } from "@/components/storefront/shared/product-image";
import { RatingStars } from "@/components/storefront/shared/rating-stars";
import { cn } from "@/lib/utils";
import type { ProductCardProps } from "../types";

export function ProductCardEditorial({ product, currency, locale, labels, wishlistSlot }: ProductCardProps) {
  const eyebrow = product.isNew ? labels.new : !product.inStock ? labels.outOfStock : null;
  return (
    <article className="group relative flex h-full flex-col gap-3">
      <Link href={`/p/${product.slug}`} className="block">
        <ProductImage
          src={product.imageUrl}
          alt={product.imageAlt}
          className={cn("aspect-[4/5] rounded-none transition-opacity group-hover:opacity-90", !product.inStock && "opacity-60")}
        />
      </Link>
      {wishlistSlot && <div className="absolute end-3 top-3">{wishlistSlot}</div>}
      <div className="flex flex-col gap-1">
        <p className="flex min-h-[1lh] items-baseline gap-2 truncate text-micro uppercase tracking-[0.2em] text-muted-foreground">
          {eyebrow && <span className={product.inStock ? "text-primary" : "font-medium text-foreground"}>{eyebrow}</span>}
          {eyebrow && product.brand && <span aria-hidden>·</span>}
          {product.brand && <span className="truncate">{product.brand}</span>}
        </p>
        <Link href={`/p/${product.slug}`} className="line-clamp-2 bidi-auto font-serif text-base font-medium leading-snug transition-colors hover:text-primary @tablet:text-lg">
          {product.name}
        </Link>
        <div className="min-h-5">{product.ratingCount > 0 && <RatingStars value={product.ratingAvg} count={product.ratingCount} className="opacity-70" />}</div>
        <Price
          amount={product.price}
          compareAt={product.compareAtPrice}
          from={product.priceVaries ? labels.from : undefined}
          currency={currency}
          locale={locale}
          className="text-xs uppercase tracking-[0.15em] text-muted-foreground [&>span]:font-normal"
        />
      </div>
    </article>
  );
}
