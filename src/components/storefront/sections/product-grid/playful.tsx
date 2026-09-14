import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { renderSection } from "@/lib/theme/registry";
import { getTranslations } from "next-intl/server";
import type { ProductGridProps } from "../types";

/** Carousel: one row that scrolls sideways and snaps to each card. */
export async function ProductGridPlayful({ title, products, currency, locale, cardVariant, emptyLabel, emptyAction, wishlistSlots, viewAllHref, viewAllLabel, bare }: ProductGridProps) {
  const t = await getTranslations("product");
  const labels = { new: t("new"), outOfStock: t("outOfStock"), from: t("priceFrom") };
  if (products.length === 0 && !emptyLabel) return null;
  const body =
    products.length === 0 ? (
      <div className="flex flex-col items-center gap-4 rounded-3xl bg-muted py-12 text-center">
        <p className="text-muted-foreground">{emptyLabel}</p>
        {emptyAction}
      </div>
    ) : (
      <ul className="bleed-gutter flex snap-x snap-mandatory gap-4 overflow-x-auto pt-2 pb-6 contain-inline-size [scrollbar-width:thin] [mask-image:linear-gradient(to_right,black_92%,transparent)] rtl:[mask-image:linear-gradient(to_left,black_92%,transparent)]">
        {products.map((p) => (
          <li key={p.id} className="w-[82%] shrink-0 snap-start @phablet:w-[46%] @desktop:w-[31.5%]">
            {renderSection("productCard", cardVariant, { product: p, currency, locale, labels, wishlistSlot: wishlistSlots?.[p.id] })}
          </li>
        ))}
      </ul>
    );
  if (bare) return body;
  return (
    <section className="mx-auto max-w-7xl px-gutter py-10 @tablet:py-14">
      {(title || viewAllHref) && (
        <div className="mb-6 flex items-center justify-between gap-4">
          {title && (
            <h2 className="relative text-2xl font-bold tracking-tight @tablet:text-3xl">
              <span className="relative z-10">{title}</span>
              <span aria-hidden className="absolute start-0 bottom-0.5 h-3 w-1/2 rounded-full bg-accent/50" />
            </h2>
          )}
          {viewAllHref && (
            <Link href={viewAllHref} className="inline-flex items-center gap-1.5 rounded-full bg-muted px-4 py-1.5 text-sm font-semibold transition-colors hover:bg-accent/20 hover:text-accent-foreground">
              {viewAllLabel}
              <ArrowRight aria-hidden className="size-4 rtl:-scale-x-100" />
            </Link>
          )}
        </div>
      )}
      {body}
    </section>
  );
}
