"use client";

import type { ReactNode } from "react";
import { ProductImage } from "@/components/storefront/shared/product-image";
import { useVariantImages } from "@/components/storefront/shared/variant-selection";

interface Props {
  images: { url: string; alt: string; variantId?: string | null }[];
  name: string;
  wishlistSlot?: ReactNode;
}

/** The editorial lookbook column: every photo full size, narrowed to the chosen variant's photos. */
export function EditorialPhotos({ images: allImages, name, wishlistSlot }: Props) {
  const images = useVariantImages(allImages);
  return (
    <ul className="flex flex-col gap-4 @desktop:col-span-7">
      {images.map((img, i) => (
        <li key={img.url} className="relative">
          <ProductImage src={img.url} alt={img.alt} className="aspect-[4/5] rounded-none" sizes="(min-width: 1024px) 58vw, 100vw" priority={i === 0} />
          {i === 0 && wishlistSlot && <div className="absolute end-3 top-3">{wishlistSlot}</div>}
          <span aria-hidden className="mt-2 block text-micro tracking-[0.2em] text-muted-foreground">
            {String(i + 1).padStart(2, "0")}
          </span>
        </li>
      ))}
      {images.length === 0 && (
        <li className="relative">
          <ProductImage src={null} alt={name} className="aspect-[4/5] rounded-none" />
          {wishlistSlot && <div className="absolute end-3 top-3">{wishlistSlot}</div>}
        </li>
      )}
    </ul>
  );
}
