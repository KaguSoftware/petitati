import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BrandDialog } from "@/components/admin/products/brand-dialog";
import { BrandList } from "@/components/admin/products/brand-list";
import { PageHeader } from "@/components/admin/shared/page-header";
import { TableSkeleton } from "@/components/admin/shared/table-skeleton";
import { Button } from "@/components/ui/button";
import { listBrandsAdmin } from "@/lib/admin/brands/queries";
import { requireAdminPage } from "@/lib/admin/context";
import { can } from "@/lib/auth/permissions";

type Props = PageProps<"/[locale]/admin/products/brands">;

export default async function BrandsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  return (
    <Suspense
      fallback={
        <>
          <PageHeader back={{ href: "/admin/products", label: t("nav.products") }} title={t("brands.title")} />
          <TableSkeleton />
        </>
      }
    >
      <Content locale={locale} />
    </Suspense>
  );
}

async function Content({ locale }: { locale: string }) {
  const ctx = await requireAdminPage(locale, "products.read");
  const [rows, t] = await Promise.all([listBrandsAdmin(ctx.store.id), getTranslations("admin")]);
  const canWrite = can(ctx.role, "products.write");
  return (
    <>
      <PageHeader
        back={{ href: "/admin/products", label: t("nav.products") }}
        title={t("brands.title")}
        description={t("brands.hint")}
        actions={canWrite ? <BrandDialog storeId={ctx.store.id} trigger={<Button type="button">{t("brands.new")}</Button>} /> : null}
      />
      <BrandList rows={rows} storeId={ctx.store.id} canWrite={canWrite} />
    </>
  );
}
