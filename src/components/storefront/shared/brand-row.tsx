import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { BrandData } from "@/lib/catalog/types";
import { BrandMark } from "./brand-mark";

interface Props {
  title: string;
  viewAllLabel: string;
  brands: BrandData[];
}

/**
 * "Shop by brand" band on the home page: a scroll rail of brand chips on phones, one row of up
 * to eight on desktop. Shared chrome rather than a themed section, so it needs no variants.
 */
export function BrandRow({ title, viewAllLabel, brands }: Props) {
  if (brands.length < 3) return null;
  const items = brands.slice(0, 8);
  return (
    <section className="bg-muted/60">
      <div className="mx-auto max-w-7xl px-gutter py-10 @desktop:py-14">
        <div className="mb-5 flex items-end justify-between gap-4">
          <h2 className="text-2xl font-semibold tracking-tight @tablet:text-3xl">{title}</h2>
          <Link href="/brands" className="group inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary transition-colors hover:text-foreground">
            {viewAllLabel}
            <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" />
          </Link>
        </div>
        <ul className="bleed-gutter flex snap-x gap-3 overflow-x-auto pb-2 contain-inline-size [scrollbar-width:none] @desktop:grid @desktop:grid-cols-8 @desktop:gap-4 @desktop:overflow-visible @desktop:pb-0 @desktop:contain-none">
          {items.map((b) => (
            <li key={b.id} className="w-28 shrink-0 snap-start @desktop:w-auto">
              <Link
                href={`/b/${b.slug}`}
                className="flex h-full flex-col items-center gap-3 rounded-xl bg-card p-4 text-center shadow-sm ring-1 ring-foreground/5 transition hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none motion-reduce:transition-none"
              >
                <BrandMark name={b.name} logoUrl={b.logoUrl} size={56} className="rounded-lg" />
                <span className="bidi-auto line-clamp-2 text-sm font-medium leading-snug">{b.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
