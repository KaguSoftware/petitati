import type { Metadata } from "next";
import { pageAlternates } from "@/lib/seo/urls";
import { Tags } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { storeContext } from "@/lib/tenant/context";
import { getBrandPetTypes, getBrands, getCategories } from "@/lib/catalog/queries";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { BrandDirectory } from "@/components/storefront/shared/brand-directory";
import { EmptyState } from "@/components/storefront/shared/empty-state";
import { PageShell } from "@/components/storefront/shared/page-shell";

export async function generateMetadata({ params }: PageProps<"/[locale]/s/[store]/brands">): Promise<Metadata> {
  const { store, locale } = await storeContext(params);
  const t = await getTranslations("brands");
  return { title: t("title"), alternates: pageAlternates(store, locale, "/brands") };
}

/** Brand index: every active brand, in the order the admin set, each linking to /b/<slug>. */
export default async function BrandsPage({ params }: PageProps<"/[locale]/s/[store]/brands">) {
  const ctx = await storeContext(params);
  const [t, tn, brands, categories, brandPetTypes] = await Promise.all([
    getTranslations("brands"),
    getTranslations("nav"),
    getBrands(ctx.store.id),
    getCategories(ctx.store.id, ctx.locale, ctx.store.default_locale),
    getBrandPetTypes(ctx.store.id),
  ]);
  const petTypes = categories.filter((c) => !c.parentId).map((c) => ({ id: c.id, name: c.name }));

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
        <BrandDirectory brands={brands} petTypes={petTypes} brandPetTypes={brandPetTypes} />
      )}
    </PageShell>
  );
}
