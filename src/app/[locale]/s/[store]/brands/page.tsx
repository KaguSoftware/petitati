import type { Metadata } from "next";
import { pageAlternates } from "@/lib/seo/urls";
import { Tags } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { storeContext } from "@/lib/tenant/context";
import { getBrands } from "@/lib/catalog/queries";
import { featuredBrands } from "@/lib/catalog/brands";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { BrandMark } from "@/components/storefront/shared/brand-mark";
import { EmptyState } from "@/components/storefront/shared/empty-state";
import { PageShell } from "@/components/storefront/shared/page-shell";

export async function generateMetadata({ params }: PageProps<"/[locale]/s/[store]/brands">): Promise<Metadata> {
  const { store, locale } = await storeContext(params);
  const t = await getTranslations("brands");
  return { title: t("title"), alternates: pageAlternates(store, locale, "/brands") };
}

/** Brand index: a tile per brand worth showing (≥ MIN_BRAND_PRODUCTS active products), biggest first, linking to /b/<slug>. */
export default async function BrandsPage({ params }: PageProps<"/[locale]/s/[store]/brands">) {
  const ctx = await storeContext(params);
  const [t, tn, allBrands] = await Promise.all([getTranslations("brands"), getTranslations("nav"), getBrands(ctx.store.id)]);
  const brands = featuredBrands(allBrands);

  return (
    <PageShell title={t("title")}>
      {brands.length === 0 ? (
        <EmptyState
          icon={Tags}
          title={t("emptyTitle")}
          description={t("empty")}
          action={
            <Link href="/shop" className={buttonVariants({ size: "xl" })}>
              {tn("shop")}
            </Link>
          }
        />
      ) : (
        <ul className="grid grid-cols-2 gap-3 @phablet:grid-cols-3 @tablet:gap-4 @desktop:grid-cols-4">
          {brands.map((b) => (
            <li key={b.id}>
              <Link
                href={`/b/${b.slug}`}
                className="flex h-full flex-col items-center gap-3 rounded-xl bg-card p-5 text-center shadow-sm ring-1 ring-foreground/5 transition-colors hover:bg-muted focus-visible:bg-muted focus-ring"
              >
                <BrandMark name={b.name} logoUrl={b.logoUrl} size={72} />
                <span className="bidi-auto font-medium">{b.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}
