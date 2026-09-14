"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight, ImageOff } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ofLabel, useCarousel } from "./use-carousel";
import { useVariantImages, useVariantSelection } from "./variant-selection";

interface Props {
  images: { url: string; alt: string; variantId?: string | null }[];
  /** Alt text when a photo has none / for the empty placeholder. */
  fallbackAlt: string;
  labels: { previous: string; next: string; imageOf: string };
  /** Classes of the stage box: aspect ratio, radius, frame. */
  stageClassName?: string;
  sizes?: string;
  /** Thumbnails: a scroll rail under the stage, a column beside it (tablet up), or a 4-up grid under it. */
  thumbs: "row" | "side" | "grid";
  /** Shape of one thumbnail (radius, frame). */
  thumbClassName?: string;
  /** Ring drawn on the active thumbnail. */
  activeThumbClassName?: string;
  /** Node laid over the stage (e.g. the wishlist button, positioned by the caller). */
  overlay?: ReactNode;
  className?: string;
}

const LIST: Record<Props["thumbs"], { list: string; item: string }> = {
  row: { list: "flex gap-3 overflow-x-auto pb-1 contain-inline-size", item: "w-20 shrink-0 @tablet:w-24" },
  side: { list: "flex gap-3 overflow-x-auto contain-inline-size @tablet:w-28 @tablet:flex-col @tablet:overflow-visible @tablet:contain-none", item: "w-24 shrink-0 @tablet:w-full" },
  grid: { list: "grid grid-cols-4 gap-3", item: "" },
};

/**
 * Product photo gallery: a stage that cross-fades between photos, thumbnails that select one,
 * swipe on touch, arrow keys and hover arrows on the stage, and an "n / total" counter.
 */
export function ProductGallery({ images: allImages, fallbackAlt, labels, stageClassName, sizes = "(min-width: 768px) 55vw, 100vw", thumbs, thumbClassName, activeThumbClassName, overlay, className }: Props) {
  // Choosing a size or colour in the purchase panel narrows the photos to that variant's.
  const images = useVariantImages(allImages);
  const count = images.length;
  const { active, go, next, prev, rootProps } = useCarousel({ count });
  const selectedVariant = useVariantSelection()?.variantId;
  useEffect(() => go(0), [selectedVariant, go]);
  const many = count > 1;
  const listRef = useRef<HTMLUListElement>(null);

  // Keep the active thumbnail in view when the rail scrolls (never scrolls the page: the rail is the only overflow).
  useEffect(() => {
    const list = listRef.current;
    const item = list?.children[active] as HTMLElement | undefined;
    if (!list || !item) return;
    if (list.scrollWidth > list.clientWidth + 1 || list.scrollHeight > list.clientHeight + 1) item.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [active]);

  const arrow = (dir: "prev" | "next") => (
    <button
      type="button"
      onClick={dir === "prev" ? prev : next}
      aria-label={dir === "prev" ? labels.previous : labels.next}
      className={cn(
        "absolute top-1/2 z-10 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-background/90 text-foreground shadow-md ring-1 ring-foreground/10 transition-opacity hover:bg-background focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "@desktop:opacity-0 @desktop:group-hover:opacity-100 @desktop:group-focus-within:opacity-100",
        dir === "prev" ? "start-3" : "end-3",
      )}
    >
      {dir === "prev" ? <ChevronLeft aria-hidden className="size-5 rtl:rotate-180" /> : <ChevronRight aria-hidden className="size-5 rtl:rotate-180" />}
    </button>
  );

  return (
    <div className={cn(thumbs === "side" ? "grid gap-3 @tablet:grid-cols-[1fr_auto]" : "flex flex-col gap-3", className)}>
      <div
        {...rootProps}
        role={many ? "region" : undefined}
        aria-roledescription={many ? "carousel" : undefined}
        tabIndex={many ? 0 : undefined}
        className={cn("group relative overflow-hidden bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset", stageClassName)}
      >
        {count === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground" role="img" aria-label={fallbackAlt}>
            <ImageOff className="size-8" />
          </div>
        ) : (
          images.map((img, i) => (
            <div
              key={img.url}
              role={many ? "group" : undefined}
              aria-roledescription={many ? "slide" : undefined}
              aria-label={many ? ofLabel(labels.imageOf, i + 1, count) : undefined}
              aria-hidden={many && i !== active ? true : undefined}
              className={cn("absolute inset-0 transition-opacity duration-300 ease-out motion-reduce:transition-none", i === active ? "opacity-100" : "opacity-0")}
            >
              <Image src={img.url} alt={img.alt || fallbackAlt} fill sizes={sizes} priority={i === 0} draggable={false} className="object-cover select-none" />
            </div>
          ))
        )}
        {many && (
          <>
            {arrow("prev")}
            {arrow("next")}
            <span aria-hidden className="absolute bottom-3 end-3 z-10 rounded-full bg-black/45 px-2 py-0.5 text-micro font-medium tabular-nums text-white backdrop-blur-sm">
              <bdi dir="ltr">
                {active + 1} / {count}
              </bdi>
            </span>
          </>
        )}
        {overlay}
      </div>
      {many && (
        <ul ref={listRef} className={LIST[thumbs].list}>
          {images.map((img, i) => (
            <li key={img.url} className={LIST[thumbs].item}>
              <button
                type="button"
                onClick={() => go(i)}
                aria-label={ofLabel(labels.imageOf, i + 1, count)}
                aria-current={i === active ? "true" : undefined}
                className={cn(
                  "relative block aspect-square w-full overflow-hidden bg-muted transition-[opacity,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  thumbClassName,
                  i === active ? (activeThumbClassName ?? "ring-2 ring-primary ring-offset-2 ring-offset-background") : "opacity-70 hover:opacity-100",
                )}
              >
                <Image src={img.url} alt="" fill sizes="112px" draggable={false} className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
