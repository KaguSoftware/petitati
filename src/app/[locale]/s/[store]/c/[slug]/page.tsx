import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { storeContext } from "@/lib/tenant/context";
import { getCategories } from "@/lib/catalog/queries";
import { categoryChain } from "@/lib/catalog/tree";
import { Breadcrumb } from "@/components/storefront/shared/breadcrumb";
import { PageShell } from "@/components/storefront/shared/page-shell";
import { ResultsSkeleton } from "@/components/storefront/shared/skeletons";
import { CategoryHero } from "@/components/storefront/listing/category-hero";
import { ProductResults } from "@/components/storefront/listing/product-results";

export async function generateMetadata({ params }: PageProps<"/[locale]/s/[store]/c/[slug]">): Promise<Metadata> {
  const ctx = await storeContext(params);
  const { slug } = await params;
  const category = (await getCategories(ctx.store.id, ctx.locale, ctx.fallback)).find((c) => c.slug === slug);
  return category ? { title: category.name, description: category.description ?? undefined } : {};
}

/**
 * Category listing. Categories form a tree three levels deep: the category's photo is the hero,
 * the breadcrumb over it walks the whole chain up to Shop, the children (or siblings, on a leaf)
 * sit in the filter sidebar with counts, and the listing covers the entire subtree.
 */
export default async function CategoryPage({ params, searchParams }: PageProps<"/[locale]/s/[store]/c/[slug]">) {
  const ctx = await storeContext(params);
  const { slug } = await params;
  const [categories, tn, tc] = await Promise.all([getCategories(ctx.store.id, ctx.locale, ctx.fallback), getTranslations("nav"), getTranslations("common")]);
  const chain = categoryChain(categories, slug);
  const category = chain.at(-1);
  if (!category) notFound();

  return (
    <main>
      <CategoryHero
        title={category.name}
        description={category.description}
        imageUrl={category.imageUrl}
        eyebrow={
          <Breadcrumb
            label={tc("breadcrumb")}
            items={[{ href: "/shop", label: tn("shop") }, ...chain.slice(0, -1).map((c) => ({ href: `/c/${c.slug}`, label: c.name })), { label: category.name }]}
            className="text-white/85"
          />
        }
      />
      <PageShell as="div">
        <Suspense fallback={<ResultsSkeleton />}>
          <ProductResults ctx={ctx} searchParams={searchParams} basePath={`/c/${slug}`} scope={{ categorySlug: slug }} />
        </Suspense>
      </PageShell>
    </main>
  );
}
