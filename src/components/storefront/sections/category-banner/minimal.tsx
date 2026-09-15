import { Link } from "@/i18n/navigation";
import { ProductImage } from "@/components/storefront/shared/product-image";
import { cn } from "@/lib/utils";
import type { CategoryBannerProps } from "../types";

/**
 * Compact tiles: a scroll rail of square photos with the name below on phones; from tablet up, ONE
 * row that never wraps (owner's rule) — every top-level category gets an equal column. Past eight
 * tiles a column would drop under ~80 px, so the rail stays at every width instead.
 */
export function CategoryBannerMinimal({ title, categories }: CategoryBannerProps) {
  if (categories.length === 0) return null;
  const oneRow = categories.length <= 8;
  return (
    <section className="mx-auto max-w-7xl px-gutter py-10 @desktop:py-14">
      <h2 className="bidi-auto mb-5 text-2xl font-semibold tracking-tight @tablet:text-3xl @desktop:mb-8">{title}</h2>
      <ul
        className={cn(
          "bleed-gutter flex snap-x gap-3 overflow-x-auto pb-2 contain-inline-size [scrollbar-width:none]",
          oneRow && "@tablet:grid @tablet:grid-flow-col @tablet:auto-cols-fr @tablet:gap-4 @tablet:overflow-visible @tablet:pb-0 @tablet:contain-none @desktop:gap-5",
        )}
      >
        {categories.map((c) => (
          <li key={c.id} className={cn("w-32 shrink-0 snap-start", oneRow && "@tablet:w-auto @tablet:min-w-0")}>
            <Link href={`/c/${c.slug}`} className="group flex flex-col gap-2.5 rounded-xl outline-none focus-visible:ring-4 focus-visible:ring-ring/50">
              <ProductImage
                src={c.imageUrl}
                alt=""
                className="aspect-square rounded-xl bg-card transition-transform duration-500 group-hover:scale-[1.04] motion-reduce:transition-none"
                sizes="(min-width: 1024px) 14vw, (min-width: 768px) 13vw, 128px"
              />
              <span className="bidi-auto line-clamp-2 text-center text-sm leading-snug font-medium transition-colors group-hover:text-primary @desktop:text-base">
                {c.name}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
