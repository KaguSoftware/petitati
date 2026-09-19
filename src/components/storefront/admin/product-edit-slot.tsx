import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/config";
import { listBrandOptions } from "@/lib/admin/brands/queries";
import { getProductForEdit, listCategoryOptions } from "@/lib/admin/products/queries";
import { variantLabels } from "@/lib/admin/products/variant-labels";
import { can } from "@/lib/auth/permissions";
import { getRoleForStore } from "@/lib/auth/session";
import { pickTranslation } from "@/lib/catalog/types";
import type { Store } from "@/lib/tenant/store";
import { ProductEditDrawer } from "./product-edit-drawer";
import { clientMessages, STOREFRONT_STAFF_NAMESPACES } from "@/i18n/namespaces";
import { MessagesProvider } from "@/components/intl-provider";

/**
 * The staff-only "Edit product" bar on a storefront product page. Reads the session, so it must
 * render under Suspense; everyone without `products.write` on this store gets nothing at all.
 * The actions behind the drawer check the same permission again — this gate is only the UI.
 */
export async function ProductEditSlot({ store, locale, productId }: { store: Store; locale: Locale; productId: string }) {
  const role = await getRoleForStore(store.id);
  if (!can(role, "products.write")) return null;
  const fallback = store.default_locale;
  const [data, categories, brands, t, messages] = await Promise.all([
    getProductForEdit(store.id, productId),
    listCategoryOptions(store.id, locale, fallback),
    listBrandOptions(store.id),
    getTranslations("admin"),
    // The drawer mounts the real admin editors, which are client components calling
    // useTranslations("admin"). The storefront provider above omits that namespace on purpose,
    // so this subtree re-provides shop + admin — and only staff ever receive it.
    clientMessages(locale, STOREFRONT_STAFF_NAMESPACES),
  ]);
  if (!data) return null;
  const name = pickTranslation(data.translations, locale, fallback)?.name ?? data.product.slug;
  return (
    <MessagesProvider locale={locale} messages={messages}>
      <ProductEditDrawer
        storeId={store.id}
        productId={productId}
        productName={name}
        locale={locale}
        defaultLocale={fallback}
        enabledLocales={store.enabled_locales}
        currency={store.currency}
        lowStockThreshold={store.low_stock_threshold}
        product={data}
        categories={categories}
        brands={brands}
        variantOptions={variantLabels(data, locale, fallback, t("products.variant.defaultLabel"))}
      />
    </MessagesProvider>
  );
}
