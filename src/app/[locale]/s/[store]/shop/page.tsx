import { Suspense } from "react";
import type { Metadata } from "next";
import { pageAlternates } from "@/lib/seo/urls";
import { getTranslations } from "next-intl/server";
import { storeContext } from "@/lib/tenant/context";
import { PageShell } from "@/components/storefront/shared/page-shell";
import { ResultsSkeleton } from "@/components/storefront/shared/skeletons";
import { ProductResults } from "@/components/storefront/listing/product-results";

export async function generateMetadata({ params }: PageProps<"/[locale]/s/[store]/shop">): Promise<Metadata> {
  const { store, locale } = await storeContext(params);
  const t = await getTranslations("shop");
  // Filters, sort and page live in the query string; the canonical is the bare listing.
  return { title: t("title"), alternates: pageAlternates(store, locale, "/shop") };
}

/** The whole catalog; the top-level categories sit in the filter sidebar with counts. */
export default async function ShopPage({ params, searchParams }: PageProps<"/[locale]/s/[store]/shop">) {
  const ctx = await storeContext(params);
  const t = await getTranslations("shop");
  return (
    <PageShell title={t("title")}>
      <Suspense fallback={<ResultsSkeleton />}>
        <ProductResults ctx={ctx} searchParams={searchParams} basePath="/shop" />
      </Suspense>
    </PageShell>
  );
}
