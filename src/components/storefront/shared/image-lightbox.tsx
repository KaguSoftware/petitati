"use client";

import Image from "next/image";
import { useEffect, useState, type MouseEvent } from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { ChevronLeft, ChevronRight, XIcon, ZoomIn, ZoomOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { ofLabel, useCarousel } from "./use-carousel";

export interface LightboxLabels {
  previous: string;
  next: string;
  /** template with `{n}` and `{total}` placeholders */
  imageOf: string;
  zoom: string;
  close: string;
}

interface Props {
  images: { url: string; alt: string }[];
  fallbackAlt: string;
  labels: LightboxLabels;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Photo to open on; the gallery follows whatever the shopper lands on. */
  index: number;
  onIndexChange?: (index: number) => void;
}

/**
 * Full-screen photo viewer for the product gallery: swipe / arrow keys / buttons between photos
 * (same carousel hook, so RTL and swipe behave identically), and a 2× zoom that follows the
 * pointer, toggled by a tap/click on the photo or the zoom button. Base UI's Dialog gives the
 * focus trap, Esc and focus return.
 */
export function ImageLightbox({
  images,
  fallbackAlt,
  labels,
  open,
  onOpenChange,
  index,
  onIndexChange,
}: Props) {
  const count = images.length;
  const { active, go, next, prev, rootProps } = useCarousel({ count });
  // Zoom belongs to one photo: moving to another (or reopening) starts un-zoomed without an effect.
  const [zoomedOn, setZoomedOn] = useState<string | null>(null);
  const [origin, setOrigin] = useState("50% 50%");
  const many = count > 1;

  // Open on the photo the gallery shows; report back where the shopper ends up.
  useEffect(() => {
    if (open) go(index);
  }, [open, index, go]);
  useEffect(() => {
    if (open) onIndexChange?.(active);
  }, [open, active, onIndexChange]);

  const img = images[active];
  const zoomed = open && !!img && zoomedOn === img.url;
  const toggleZoom = () => setZoomedOn(zoomed || !img ? null : img.url);

  const aim = (e: MouseEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setOrigin(
      `${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`,
    );
  };

  const arrow = (dir: "prev" | "next") => (
    <button
      type="button"
      onClick={dir === "prev" ? prev : next}
      aria-label={dir === "prev" ? labels.previous : labels.next}
      className={cn(
        "absolute top-1/2 z-10 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-white ring-1 ring-white/20 backdrop-blur transition-colors hover:bg-white/25 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none active:scale-95 motion-reduce:transition-none",
        dir === "prev" ? "start-3" : "end-3",
      )}
    >
      {dir === "prev" ? (
        <ChevronLeft aria-hidden className="size-6 rtl:rotate-180" />
      ) : (
        <ChevronRight aria-hidden className="size-6 rtl:rotate-180" />
      )}
    </button>
  );
  const iconButton =
    "grid size-11 place-items-center rounded-full bg-white/15 text-white ring-1 ring-white/20 backdrop-blur transition-colors hover:bg-white/25 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white motion-reduce:transition-none";

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(o) => {
        if (!o) setZoomedOn(null);
        onOpenChange(o);
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 fixed inset-0 z-50 bg-black/90 duration-150 motion-reduce:animate-none" />
        <DialogPrimitive.Popup
          onKeyDown={zoomed ? undefined : rootProps.onKeyDown}
          className="data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 fixed inset-0 z-50 flex flex-col duration-150 outline-none motion-reduce:animate-none"
        >
          <DialogPrimitive.Title className="sr-only">{fallbackAlt}</DialogPrimitive.Title>
          <div className="flex items-center justify-between gap-3 p-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
            {many ? (
              <span
                aria-live="polite"
                className="rounded-full bg-white/15 px-3 py-1 text-sm font-medium text-white tabular-nums"
              >
                <bdi dir="ltr">
                  {active + 1} / {count}
                </bdi>
                <span className="sr-only">{ofLabel(labels.imageOf, active + 1, count)}</span>
              </span>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setOrigin("50% 50%");
                  toggleZoom();
                }}
                aria-label={labels.zoom}
                aria-pressed={zoomed}
                className={iconButton}
              >
                {zoomed ? (
                  <ZoomOut aria-hidden className="size-5" />
                ) : (
                  <ZoomIn aria-hidden className="size-5" />
                )}
              </button>
              <DialogPrimitive.Close aria-label={labels.close} className={iconButton}>
                <XIcon aria-hidden className="size-5" />
              </DialogPrimitive.Close>
            </div>
          </div>
          <div
            {...(zoomed ? { ref: rootProps.ref } : { ...rootProps, onKeyDown: undefined })}
            className="relative min-h-0 flex-1 overflow-hidden"
          >
            {img && (
              <div
                onClick={(e) => {
                  aim(e);
                  toggleZoom();
                }}
                onPointerMove={(e) => {
                  if (zoomed && (e.pointerType === "mouse" || e.buttons > 0)) aim(e);
                }}
                className={cn(
                  "absolute inset-0 touch-none select-none",
                  zoomed ? "cursor-zoom-out" : "cursor-zoom-in",
                )}
              >
                <Image
                  key={img.url}
                  src={img.url}
                  alt={img.alt || fallbackAlt}
                  fill
                  sizes="100vw"
                  draggable={false}
                  className="object-contain transition-transform duration-200 ease-out motion-reduce:transition-none"
                  style={{ transform: zoomed ? "scale(2)" : undefined, transformOrigin: origin }}
                />
              </div>
            )}
            {many && !zoomed && (
              <>
                {arrow("prev")}
                {arrow("next")}
              </>
            )}
          </div>
          {many && (
            <div className="flex justify-center-safe gap-2 overflow-x-auto p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              {images.map((im, i) => (
                <button
                  key={im.url}
                  type="button"
                  onClick={() => go(i)}
                  aria-label={ofLabel(labels.imageOf, i + 1, count)}
                  aria-current={i === active ? "true" : undefined}
                  className={cn(
                    "relative size-14 shrink-0 overflow-hidden rounded-lg transition-opacity focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none",
                    i === active ? "ring-2 ring-white" : "opacity-50 hover:opacity-90",
                  )}
                >
                  <Image src={im.url} alt="" fill sizes="56px" className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
