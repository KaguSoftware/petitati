import { Suspense } from "react";
import type { Metadata } from "next";
import { pageAlternates } from "@/lib/seo/urls";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { storeContext } from "@/lib/tenant/context";
import { getBrands } from "@/lib/catalog/queries";
import { BrandMark } from "@/components/storefront/shared/brand-mark";
import { Breadcrumb } from "@/components/storefront/shared/breadcrumb";
import { PageShell, pageHeading } from "@/components/storefront/shared/page-shell";
import { ResultsSkeleton } from "@/components/storefront/shared/skeletons";
import { ProductResults } from "@/components/storefront/listing/product-results";
import { cn } from "@/lib/utils";

export async function generateMetadata({ params }: PageProps<"/[locale]/s/[store]/b/[slug]">): Promise<Metadata> {
  const ctx = await storeContext(params);
  const { slug } = await params;
  const brand = (await getBrands(ctx.store.id)).find((b) => b.slug === slug);
  if (!brand) return {};
  return {
    title: brand.name,
    alternates: pageAlternates(ctx.store, ctx.locale, `/b/${brand.slug}`),
    openGraph: { siteName: ctx.store.name, images: brand.logoUrl ? [brand.logoUrl] : ctx.store.logo_url ? [ctx.store.logo_url] : undefined },
  };
}

/** Brand listing: every active product of one brand, with the filters minus the brand section. */
export default async function BrandPage({ params, searchParams }: PageProps<"/[locale]/s/[store]/b/[slug]">) {
  const ctx = await storeContext(params);
  const { slug } = await params;
  const [brands, tn, tb, tc] = await Promise.all([getBrands(ctx.store.id), getTranslations("nav"), getTranslations("brands"), getTranslations("common")]);
  const brand = brands.find((b) => b.slug === slug);
  if (!brand) notFound();

  return (
    <PageShell>
      <div className="flex flex-col gap-4">
        <Breadcrumb label={tc("breadcrumb")} items={[{ href: "/shop", label: tn("shop") }, { href: "/brands", label: tb("title") }, { label: brand.name }]} />
        <div className="flex items-center gap-4 @tablet:gap-5">
          <BrandMark name={brand.name} logoUrl={brand.logoUrl} size={72} />
          <h1 className={cn("bidi-auto font-semibold tracking-tight", pageHeading.page)}>{brand.name}</h1>
        </div>
      </div>
      <Suspense fallback={<ResultsSkeleton />}>
        <ProductResults ctx={ctx} searchParams={searchParams} basePath={`/b/${slug}`} scope={{ brandSlug: slug }} />
      </Suspense>
    </PageShell>
  );
}
