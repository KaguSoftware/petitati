import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LogoUploader } from "@/components/admin/design/logo-uploader";
import { ThemeEditor } from "@/components/admin/design/theme-editor";
import { DesignCollapseAll } from "@/components/admin/design/design-sections";
import { PageHeader } from "@/components/admin/shared/page-header";
import { TableSkeleton } from "@/components/admin/shared/table-skeleton";
import { requireAdminPage } from "@/lib/admin/context";
import { resolveHero } from "@/lib/theme/hero";
import { buildSectionPreviews } from "@/lib/theme/preview";

export default async function DesignPage({ params }: PageProps<"/[locale]/admin/design">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  return (
    <>
      <PageHeader title={t("nav.design")} description={t("design.description")} actions={<DesignCollapseAll labels={{ expand: t("design.expandAll"), collapse: t("design.collapseAll") }} />} />
      <Suspense fallback={<TableSkeleton />}>
        <Content locale={locale} />
      </Suspense>
    </>
  );
}

async function Content({ locale }: { locale: string }) {
  const ctx = await requireAdminPage(locale, "store.design");
  const { store } = ctx;
  // Every section variant with sample data, drawn once here; the editor swaps them in and out client-side.
  const previews = await buildSectionPreviews({
    locale: ctx.locale,
    storeName: store.name,
    logoUrl: store.logo_url,
    currency: store.currency,
    announcement: store.theme.announcement[ctx.locale] ?? "",
    heroSlides: resolveHero(store.hero, ctx.locale, store.default_locale),
  });
  // Dev-only harness (the route 404s in production); decided on the server so the client never checks NODE_ENV.
  const previewHref = process.env.NODE_ENV !== "production" ? `/${ctx.locale}/preview/${store.theme.sections.hero}` : null;
  return (
    <div className="flex flex-col gap-6">
      <LogoUploader storeId={store.id} logoUrl={store.logo_url} faviconUrl={store.favicon_url} />
      <ThemeEditor
        storeId={store.id}
        storeName={store.name}
        currency={store.currency}
        locale={ctx.locale}
        theme={store.theme}
        hero={store.hero}
        enabledLocales={store.enabled_locales}
        previews={previews}
        previewHref={previewHref}
      />
    </div>
  );
}
