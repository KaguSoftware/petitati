import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { renderSection } from "@/lib/theme/registry";
import { getTranslations } from "next-intl/server";
import { cn } from "@/lib/utils";
import type { ProductGridProps } from "../types";

/** Feature first: the opening product takes a 2×2 cell on desktop, the rest fill in around it. */
export async function ProductGridEditorial({ title, products, currency, locale, cardVariant, emptyLabel, emptyAction, wishlistSlots, viewAllHref, viewAllLabel, bare }: ProductGridProps) {
  const t = await getTranslations("product");
  const labels = { new: t("new"), outOfStock: t("outOfStock"), from: t("priceFrom") };
  if (products.length === 0 && !emptyLabel) return null;
  const body =
    products.length === 0 ? (
      <div className="flex flex-col items-center gap-4 py-12 text-center">
        <p className="font-serif text-lg italic text-muted-foreground">{emptyLabel}</p>
        {emptyAction}
      </div>
    ) : (
      <ul className="grid grid-cols-2 gap-x-6 gap-y-10 @tablet:grid-cols-3 @desktop:grid-cols-4">
        {products.map((p, i) => (
          <li key={p.id} className={cn(i === 0 && products.length >= 5 && "col-span-2 @tablet:row-span-2 [&_h3]:text-2xl", i === 0 && products.length < 5 && "col-span-2 @tablet:col-span-1")}>
            {renderSection("productCard", cardVariant, { product: p, currency, locale, labels, wishlistSlot: wishlistSlots?.[p.id] })}
          </li>
        ))}
      </ul>
    );
  if (bare) return body;
  return (
    <section className="mx-auto max-w-7xl px-gutter py-12 @tablet:py-16">
      {(title || viewAllHref) && (
        <div className="mb-10 flex items-end justify-between gap-6 border-b border-foreground/15 pb-4">
          {title && <h2 className="font-serif text-3xl font-medium tracking-tight @tablet:text-4xl">{title}</h2>}
          {viewAllHref && (
            <Link href={viewAllHref} className="inline-flex shrink-0 items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground">
              {viewAllLabel}
              <ArrowRight aria-hidden className="size-3.5 rtl:rotate-180" />
            </Link>
          )}
        </div>
      )}
      {body}
    </section>
  );
}
