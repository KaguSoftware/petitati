"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ofLabel, useCarousel } from "./use-carousel";

type Tone = "photo" | "brand" | "page";

interface Props {
  slides: ReactNode[];
  labels: { previous: string; next: string; slideOf: string };
  autoplay?: boolean;
  /** Colours of the arrows and dots: over a photo, on the brand colour band, or on the page background. */
  tone?: Tone;
  /**
   * `sides`: arrows mid-height at both edges (tablet up) + a dots row; `bar`: one centred row
   * (prev · dots · next) laid over the bottom; `bar-below`: the same row in normal flow after the slides.
   */
  controls?: "sides" | "bar" | "bar-below";
  className?: string;
  /** Position/alignment of the dots row (`sides`) or of the bar. */
  barClassName?: string;
}

const ARROW: Record<Tone, string> = {
  photo: "bg-black/35 text-white backdrop-blur-sm hover:bg-black/55",
  brand: "bg-primary-foreground/15 text-primary-foreground hover:bg-primary-foreground/30",
  page: "bg-background text-foreground shadow-md ring-1 ring-foreground/10 hover:bg-muted",
};
const DOT: Record<Tone, { idle: string; active: string }> = {
  photo: { idle: "bg-white/50 hover:bg-white/80", active: "bg-white" },
  brand: { idle: "bg-primary-foreground/40 hover:bg-primary-foreground/70", active: "bg-primary-foreground" },
  page: { idle: "bg-foreground/25 hover:bg-foreground/50", active: "bg-foreground" },
};

/**
 * Cross-fading slides stacked in one grid cell (so the block is as tall as its tallest slide and
 * never jumps), with swipe, arrow keys, dots and optional auto-advance. One slide renders as a
 * plain block with no controls, which is how every hero layout starts.
 */
export function HeroCarousel({ slides, labels, autoplay = true, tone = "photo", controls = "sides", className, barClassName }: Props) {
  const count = slides.length;
  const { active, go, next, prev, running, rootProps } = useCarousel({ count, autoplay });
  const many = count > 1;

  const arrow = (dir: "prev" | "next", extra?: string) => (
    <button
      type="button"
      onClick={dir === "prev" ? prev : next}
      aria-label={dir === "prev" ? labels.previous : labels.next}
      className={cn(
        "z-10 grid shrink-0 place-items-center rounded-full transition-[color,background-color,scale] active:scale-95 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
        ARROW[tone],
        extra,
      )}
    >
      {dir === "prev" ? <ChevronLeft aria-hidden className="size-5 rtl:rotate-180" /> : <ChevronRight aria-hidden className="size-5 rtl:rotate-180" />}
    </button>
  );
  const dots = (
    <div className="flex items-center gap-2" role="group">
      {slides.map((_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => go(i)}
          aria-label={ofLabel(labels.slideOf, i + 1, count)}
          aria-current={i === active ? "true" : undefined}
          // The dot stays 10 px; the pseudo-element gives a 24 px tap target around it.
          className={cn("relative h-2.5 rounded-full transition-all before:absolute before:-inset-x-1 before:-inset-y-[7px] before:content-[''] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", i === active ? cn("w-7", DOT[tone].active) : cn("w-2.5", DOT[tone].idle))}
        />
      ))}
    </div>
  );
  const bar = many && (
    <div className={cn("flex items-center justify-center gap-3", controls === "bar" ? "absolute inset-x-0 bottom-4 z-10" : "mt-5", barClassName)}>
      {arrow("prev", "size-10")}
      {dots}
      {arrow("next", "size-10")}
    </div>
  );

  return (
    <div
      {...rootProps}
      role={many ? "region" : undefined}
      aria-roledescription={many ? "carousel" : undefined}
      tabIndex={many ? 0 : undefined}
      className={cn("relative focus-visible:outline-none", many && "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring", className)}
    >
      <div className="grid" aria-live={many && !running ? "polite" : "off"}>
        {slides.map((slide, i) => (
          <div
            key={i}
            role={many ? "group" : undefined}
            aria-roledescription={many ? "slide" : undefined}
            aria-label={many ? ofLabel(labels.slideOf, i + 1, count) : undefined}
            aria-hidden={many && i !== active ? true : undefined}
            inert={many && i !== active ? true : undefined}
            className={cn("min-w-0 [grid-area:1/1] transition-opacity duration-700 ease-out motion-reduce:transition-none", i === active ? "opacity-100" : "pointer-events-none opacity-0")}
          >
            {slide}
          </div>
        ))}
      </div>
      {many && controls === "sides" && (
        <>
          {arrow("prev", "absolute start-3 top-1/2 hidden size-10 -translate-y-1/2 @tablet:grid @desktop:start-5")}
          {arrow("next", "absolute end-3 top-1/2 hidden size-10 -translate-y-1/2 @tablet:grid @desktop:end-5")}
          <div className={cn("absolute inset-x-0 bottom-4 z-10 flex justify-center", barClassName)}>{dots}</div>
        </>
      )}
      {controls !== "sides" && bar}
    </div>
  );
}
