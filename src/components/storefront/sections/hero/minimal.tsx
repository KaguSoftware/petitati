import Image from "next/image";
import { PawPrint } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { HeroCarousel } from "@/components/storefront/shared/hero-carousel";
import { cn } from "@/lib/utils";
import type { HeroProps, HeroSlideProps } from "../types";

/** Full-bleed photo with the copy laid over a bottom scrim; a brand gradient stands in when there is no photo. Starts below the (always solid) navbar. */
export function HeroMinimal({ slides, labels, autoplay }: HeroProps) {
  return (
    <section className="relative isolate overflow-hidden bg-inverse text-white">
      <HeroCarousel
        slides={slides.map((s, i) => (
          <Slide key={i} {...s} first={i === 0} secondaryLabel={labels.secondary} secondaryHref="/brands" />
        ))}
        labels={labels}
        autoplay={autoplay}
        tone="photo"
        controls="bar"
        barClassName="justify-end px-gutter bottom-5 @tablet:bottom-7 @desktop:bottom-9"
      />
    </section>
  );
}

function Slide({ title, subtitle, ctaLabel, ctaHref, imageUrl, first, secondaryLabel, secondaryHref }: HeroSlideProps & { first: boolean; secondaryLabel?: string; secondaryHref: string }) {
  const Heading = first ? "h1" : "p";
  return (
    <div className="relative aspect-[5/6] max-h-[42rem] w-full @tablet:aspect-[16/9] @tablet:min-h-[28rem] @desktop:aspect-[21/9]">
      {imageUrl ? (
        <Image src={imageUrl} alt="" fill sizes="100vw" priority={first} className="object-cover" />
      ) : (
        <div aria-hidden className="absolute inset-0 bg-[linear-gradient(135deg,var(--color-primary),var(--color-accent))]">
          <PawPrint className="absolute -end-10 -top-10 size-64 rotate-12 opacity-15" />
          <PawPrint className="absolute start-1/3 top-1/4 size-24 -rotate-12 opacity-10" />
          <PawPrint className="absolute -bottom-8 end-1/4 size-40 rotate-45 opacity-10" />
        </div>
      )}
      <div aria-hidden className="absolute inset-0 bg-linear-to-t from-black/80 via-black/35 to-transparent" />
      <div className="absolute inset-x-0 bottom-0">
        <div className="mx-auto flex max-w-7xl flex-col items-start gap-4 px-gutter pb-14 @tablet:gap-5 @tablet:pb-16 @desktop:pb-20">
          {title && (
            <Heading className="bidi-auto max-w-2xl text-display-lg leading-[1.05] font-semibold tracking-tight text-balance [text-shadow:0_2px_12px_rgb(0_0_0/.35)] @tablet:text-6xl">
              {title}
            </Heading>
          )}
          {subtitle && <p className="bidi-auto max-w-xl text-base text-white/90 [text-shadow:0_1px_6px_rgb(0_0_0/.4)] @tablet:text-lg">{subtitle}</p>}
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <Link href={ctaHref} className={cn(buttonVariants({ size: "xl" }), "min-w-36 shadow-lg shadow-black/20")}>
              {ctaLabel}
            </Link>
            {secondaryLabel && (
              <Link
                href={secondaryHref}
                className={cn(buttonVariants({ variant: "outline", size: "xl" }), "border-white/60 bg-white/10 text-white backdrop-blur-sm hover:bg-white hover:text-black")}
              >
                {secondaryLabel}
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
