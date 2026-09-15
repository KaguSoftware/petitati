import { ArrowRight, SearchX } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { renderSection } from "@/lib/theme/registry";
import { getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/storefront/shared/empty-state";
import type { ProductGridProps } from "../types";

/** Classic shop grid: two cards across on phones, three on tablets, four on desktop. */
export async function ProductGridMinimal({ title, products, currency, locale, cardVariant, emptyLabel, emptyAction, wishlistSlots, viewAllHref, viewAllLabel, bare }: ProductGridProps) {
  const t = await getTranslations("product");
  const labels = { new: t("new"), outOfStock: t("outOfStock"), from: t("priceFrom") };
  if (products.length === 0 && !emptyLabel) return null;
  const body =
    products.length === 0 ? (
      <EmptyState icon={SearchX} title={emptyLabel} action={emptyAction} />
    ) : (
      <ul className="grid grid-cols-2 gap-3 @tablet:grid-cols-3 @tablet:gap-4 @desktop:grid-cols-4 @desktop:gap-5">
        {products.map((p) => (
          <li key={p.id} className="min-w-0">
            {renderSection("productCard", cardVariant, { product: p, currency, locale, labels, wishlistSlot: wishlistSlots?.[p.id] })}
          </li>
        ))}
      </ul>
    );
  if (bare) return body;
  return (
    <section className="mx-auto max-w-7xl px-gutter py-10 @desktop:py-14">
      {(title || viewAllHref) && (
        <div className="mb-6 flex items-end justify-between gap-4 @desktop:mb-8">
          {title && <h2 className="bidi-auto text-2xl font-semibold tracking-tight @tablet:text-3xl">{title}</h2>}
          {viewAllHref && (
            <Link href={viewAllHref} className="group inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary transition-colors hover:text-foreground">
              {viewAllLabel}
              <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" />
            </Link>
          )}
        </div>
      )}
      {body}
    </section>
  );
}
