import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { ProductImage } from "@/components/storefront/shared/product-image";
import { cn } from "@/lib/utils";
import type { CategoryBannerProps } from "../types";

/** Stacked full-width strips: photo on one half, a colour block with a giant name on the other, alternating sides. */
export function CategoryBannerBold({ title, categories }: CategoryBannerProps) {
  if (categories.length === 0) return null;
  return (
    <section className="mx-auto max-w-7xl px-gutter py-12 @tablet:py-16">
      <h2 className="mb-6 text-3xl font-extrabold tracking-tight uppercase @tablet:text-5xl">{title}</h2>
      <ul className="flex flex-col gap-2">
        {categories.map((c, i) => {
          const flip = i % 2 === 1;
          return (
            <li key={c.id}>
              <Link
                href={`/c/${c.slug}`}
                className={cn(
                  "group grid overflow-hidden outline-none focus-visible:ring-4 focus-visible:ring-ring/50 @tablet:grid-cols-2",
                  flip ? "bg-primary text-primary-foreground" : "bg-inverse text-inverse-foreground",
                )}
              >
                <ProductImage
                  src={c.imageUrl}
                  alt=""
                  className={cn("aspect-[2/1] @tablet:aspect-[3/1.6] @desktop:aspect-[3/1.2]", flip && "@tablet:order-2")}
                  sizes="(min-width: 768px) 50vw, 100vw"
                />
                <div className="flex items-center gap-4 px-5 py-6 @tablet:px-10">
                  <span className="font-heading text-3xl leading-none font-extrabold tracking-tight uppercase @tablet:text-5xl @desktop:text-6xl">{c.name}</span>
                  <ArrowRight aria-hidden className="size-8 shrink-0 transition-transform group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1 @tablet:size-10" />
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
