"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ofLabel } from "./use-carousel";

interface Props {
  items: { key: string; node: ReactNode }[];
  labels: { previous: string; next: string; slideOf: string };
}

const GAP_PX = 16;

/**
 * A product row that moves a page at a time: one centred card on phones, two from phablet, three on
 * desktop, with a round arrow on each side. The track is still a native scroll-snap strip, so a
 * thumb swipe works without any JS; the arrows just scroll it by one page.
 */
export function ProductCarousel({ items, labels }: Props) {
  const trackRef = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ atStart: true, atEnd: items.length <= 1, page: 0 });

  const measure = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    // RTL scrollLeft runs 0 → negative, so compare magnitudes.
    const pos = Math.abs(el.scrollLeft);
    const max = el.scrollWidth - el.clientWidth;
    setEdges({ atStart: pos <= 2, atEnd: pos >= max - 2, page: Math.round(pos / (el.clientWidth + GAP_PX)) });
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    measure();
    el.addEventListener("scroll", measure, { passive: true });
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", measure);
      ro.disconnect();
    };
  }, [measure]);

  const step = (forward: boolean) => {
    const el = trackRef.current;
    if (!el) return;
    const rtl = getComputedStyle(el).direction === "rtl";
    const distance = el.clientWidth + GAP_PX;
    el.scrollBy({ left: (forward !== rtl ? 1 : -1) * distance, behavior: "smooth" });
  };

  const goTo = (i: number) => {
    const el = trackRef.current;
    if (!el) return;
    const rtl = getComputedStyle(el).direction === "rtl";
    el.scrollTo({ left: (rtl ? -1 : 1) * i * (el.clientWidth + GAP_PX), behavior: "smooth" });
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const rtl = getComputedStyle(e.currentTarget).direction === "rtl";
    step((e.key === "ArrowRight") !== rtl);
  };

  const arrow = (dir: "prev" | "next") => {
    const disabled = dir === "prev" ? edges.atStart : edges.atEnd;
    return (
      <button
        type="button"
        onClick={() => step(dir === "next")}
        disabled={disabled}
        aria-label={dir === "prev" ? labels.previous : labels.next}
        className="grid size-10 shrink-0 place-items-center rounded-full border bg-card text-foreground shadow-sm transition-[background-color,opacity] hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-35"
      >
        {dir === "prev" ? <ChevronLeft aria-hidden className="size-5 rtl:rotate-180" /> : <ChevronRight aria-hidden className="size-5 rtl:rotate-180" />}
      </button>
    );
  };

  return (
    <div role="region" aria-roledescription="carousel" onKeyDown={onKeyDown} className="flex flex-col gap-3">
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 @tablet:gap-3">
        {arrow("prev")}
        <ul
          ref={trackRef}
          className="flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {items.map((item, i) => (
            <li
              key={item.key}
              aria-roledescription="slide"
              aria-label={ofLabel(labels.slideOf, i + 1, items.length)}
              className="w-full shrink-0 snap-start @phablet:w-[calc((100%-1rem)/2)] @desktop:w-[calc((100%-2rem)/3)]"
            >
              {item.node}
            </li>
          ))}
        </ul>
        {arrow("next")}
      </div>
      {items.length > 1 && (
        <div className="flex justify-center gap-1.5 @phablet:hidden" aria-hidden>
          {items.map((item, i) => (
            <button
              key={item.key}
              type="button"
              tabIndex={-1}
              onClick={() => goTo(i)}
              className={cn("h-2 rounded-full transition-all", i === edges.page ? "w-5 bg-primary" : "w-2 bg-foreground/20")}
            />
          ))}
        </div>
      )}
    </div>
  );
}
