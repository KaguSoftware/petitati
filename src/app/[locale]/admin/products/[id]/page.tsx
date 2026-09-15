import { ExternalLink } from "lucide-react";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ProductForm } from "@/components/admin/products/product-form";
import { ProductImages } from "@/components/admin/products/product-images";
import { VariantsEditor } from "@/components/admin/products/variants-editor";
import { CrumbLabel } from "@/components/admin/shared/crumb-label";
import { PageHeader } from "@/components/admin/shared/page-header";
import { StatusBadge } from "@/components/admin/shared/status-badge";
import { TableSkeleton } from "@/components/admin/shared/table-skeleton";
import { buttonVariants } from "@/components/ui/button";
import { listBrandOptions } from "@/lib/admin/brands/queries";
import { requireAdminPage } from "@/lib/admin/context";
import { getProductForEdit, listCategoryOptions } from "@/lib/admin/products/queries";
import { variantLabels } from "@/lib/admin/products/variant-labels";
import { can } from "@/lib/auth/permissions";
import { pickTranslation } from "@/lib/catalog/types";

type Props = PageProps<"/[locale]/admin/products/[id]">;

/** `[id]` has no static params, so the params read itself is runtime data: keep it under Suspense. */
export default function ProductPage({ params }: Props) {
  return (
    <Suspense fallback={<TableSkeleton rows={4} />}>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({ params }: { params: Props["params"] }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const ctx = await requireAdminPage(locale, "products.read");
  const fallback = ctx.store.default_locale;
  const [data, categories, brands, t] = await Promise.all([
    getProductForEdit(ctx.store.id, id),
    listCategoryOptions(ctx.store.id, ctx.locale, fallback),
    listBrandOptions(ctx.store.id),
    getTranslations("admin"),
  ]);
  if (!data) notFound();
  const canWrite = can(ctx.role, "products.write");
  const name = pickTranslation(data.translations, ctx.locale, fallback)?.name ?? data.product.slug;
  const variantOptions = variantLabels(data, ctx.locale, fallback, t("products.variant.defaultLabel"));

  return (
    <>
      <CrumbLabel segment={data.product.id} label={name} />
      <PageHeader
        back={{ href: "/admin/products", label: t("nav.products") }}
        title={
          <span className="flex flex-wrap items-center gap-3">
            <span className="truncate">{name}</span>
            <StatusBadge kind="product" value={data.product.status} className="text-sm" />
          </span>
        }
        description={<span dir="ltr">/{data.product.slug}</span>}
        actions={
          data.product.status === "active" ? (
            <a href={`/${ctx.locale}/p/${data.product.slug}`} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "outline" })}>
              <ExternalLink data-icon="inline-start" />
              {t("products.actions.viewStorefront")}
            </a>
          ) : null
        }
      />
      <fieldset disabled={!canWrite} className="contents">
        <ProductForm storeId={ctx.store.id} locale={ctx.locale} defaultLocale={fallback} enabledLocales={ctx.store.enabled_locales} product={data} categories={categories} brands={brands} />
      </fieldset>
      {canWrite && (
        <>
          <VariantsEditor
            storeId={ctx.store.id}
            productId={data.product.id}
            currency={ctx.store.currency}
            locale={ctx.locale}
            defaultLocale={fallback}
            enabledLocales={ctx.store.enabled_locales}
            lowStockThreshold={ctx.store.low_stock_threshold}
            options={data.options}
            variants={data.variants}
          />
          <ProductImages
            storeId={ctx.store.id}
            productId={data.product.id}
            locale={ctx.locale}
            defaultLocale={fallback}
            enabledLocales={ctx.store.enabled_locales}
            images={data.images}
            variantOptions={variantOptions}
          />
        </>
      )}
    </>
  );
}
