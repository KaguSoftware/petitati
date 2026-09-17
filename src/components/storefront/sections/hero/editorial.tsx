import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { HeroCarousel } from "@/components/storefront/shared/hero-carousel";
import type { HeroProps, HeroSlideProps } from "../types";

const nn = (n: number) => String(n).padStart(2, "0");

/** Magazine opener: a very large headline first, then one wide photograph underneath; the folio counts the slides. */
export function HeroEditorial({ slides, labels, autoplay }: HeroProps) {
  return (
    <section className="mx-auto flex max-w-7xl flex-col px-gutter py-12 @tablet:py-20">
      <HeroCarousel
        slides={slides.map((s, i) => (
          <Slide key={i} {...s} index={i} total={slides.length} />
        ))}
        labels={labels}
        autoplay={autoplay}
        tone="page"
        controls="bar-below"
        barClassName="justify-end"
      />
    </section>
  );
}

function Slide({ title, subtitle, ctaLabel, ctaHref, imageUrl, index, total }: HeroSlideProps & { index: number; total: number }) {
  const Heading = index === 0 ? "h1" : "p";
  return (
    <div className="flex flex-col gap-8 @tablet:gap-12">
      <div className="grid gap-6 @tablet:grid-cols-12 @tablet:items-end">
        <div className="flex flex-col gap-5 @tablet:col-span-8">
          <span aria-hidden className="text-xs tracking-[0.2em] text-muted-foreground">
            {nn(index + 1)}
          </span>
          {title && <Heading className="bidi-auto font-heading text-5xl leading-[0.95] font-medium tracking-tight text-balance @tablet:text-7xl @desktop:text-8xl">{title}</Heading>}
        </div>
        <div className="flex flex-col gap-5 @tablet:col-span-4 @tablet:pb-2">
          {subtitle && <p className="bidi-auto max-w-prose font-heading text-lg italic text-muted-foreground @tablet:text-xl">{subtitle}</p>}
          <Link
            href={ctaHref}
            className="group inline-flex items-center gap-2 self-start border-b border-foreground pb-1 text-xs uppercase tracking-[0.2em] transition-colors hover:border-primary hover:text-primary focus-visible:text-primary focus-ring"
          >
            {ctaLabel}
            <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" />
          </Link>
        </div>
      </div>
      <figure className="flex flex-col gap-3">
        <div className="relative aspect-[4/3] overflow-hidden bg-muted @tablet:aspect-[21/9]">
          {imageUrl && <Image src={imageUrl} alt="" fill sizes="(min-width: 1280px) 1280px, 100vw" className="object-cover" priority={index === 0} />}
        </div>
        <figcaption aria-hidden className="flex items-center justify-between border-t border-foreground/15 pt-2 text-micro tracking-[0.2em] text-muted-foreground">
          <span dir="ltr">
            {nn(index + 1)} / {nn(total)}
          </span>
          <span>—</span>
        </figcaption>
      </figure>
    </div>
  );
}
