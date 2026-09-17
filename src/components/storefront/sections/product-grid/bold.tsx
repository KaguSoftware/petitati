import { Link } from "@/i18n/navigation";
import { renderSection } from "@/lib/theme/registry";
import { getTranslations } from "next-intl/server";
import type { ProductGridProps } from "../types";

/** Dense catalogue: tight gaps, four across on desktop, under a heavy title band. */
export async function ProductGridBold({ title, products, currency, locale, cardVariant, emptyLabel, emptyAction, wishlistSlots, viewAllHref, viewAllLabel, bare }: ProductGridProps) {
  const t = await getTranslations("product");
  const labels = { new: t("new"), outOfStock: t("outOfStock"), from: t("priceFrom") };
  if (products.length === 0 && !emptyLabel) return null;
  const body =
    products.length === 0 ? (
      <div className="flex flex-col items-center gap-4 border-4 border-foreground py-16 text-center">
        <p className="font-heading text-lg font-bold tracking-wide uppercase">{emptyLabel}</p>
        {emptyAction}
      </div>
    ) : (
      <ul className="grid grid-cols-2 gap-2 @tablet:grid-cols-3 @desktop:grid-cols-4 @desktop:gap-3">
        {products.map((p) => (
          <li key={p.id}>{renderSection("productCard", cardVariant, { product: p, currency, locale, labels, wishlistSlot: wishlistSlots?.[p.id] })}</li>
        ))}
      </ul>
    );
  if (bare) return body;
  return (
    <section className="py-10 @tablet:py-14">
      {(title || viewAllHref) && (
        <div className="bg-inverse text-inverse-foreground">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-gutter py-4 @tablet:py-5">
            {title && <h2 className="text-2xl font-extrabold tracking-tight uppercase @tablet:text-4xl">{title}</h2>}
            {viewAllHref && (
              <Link href={viewAllHref} className="ms-auto shrink-0 border-2 border-inverse-foreground px-3 py-1.5 text-xs font-bold tracking-widest whitespace-nowrap uppercase transition-colors hover:bg-background hover:text-foreground">
                {viewAllLabel}
              </Link>
            )}
          </div>
        </div>
      )}
      <div className="mx-auto max-w-7xl px-gutter pt-4">{body}</div>
    </section>
  );
}
