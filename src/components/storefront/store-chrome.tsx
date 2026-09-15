import { Suspense } from "react";
import { cacheLife } from "next/cache";
import { getTranslations } from "next-intl/server";
import { renderSection } from "@/lib/theme/registry";
import { resolveFooter } from "@/lib/theme/footer";
import { getCategories } from "@/lib/catalog/queries";
import type { StoreContext } from "@/lib/tenant/context";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { buildFooterProps } from "./footer-props";
import { AccountMenuFallback, AccountMenuSlot } from "./shared/account-button";
import { CartButton, CartButtonFallback } from "./shared/cart-button";

/** Footer copyright year. Cached so Cache Components can prerender the chrome; refreshes daily. */
async function copyrightYear(): Promise<number> {
  "use cache";
  cacheLife("days");
  return new Date().getFullYear();
}

/** Announcement bar + navbar + footer around every storefront page, using the store's variants. */
export async function StoreChrome({ ctx, children }: { ctx: StoreContext; children: React.ReactNode }) {
  const { store, locale, fallback } = ctx;
  const [t, categories, year] = await Promise.all([getTranslations("nav"), getCategories(store.id, locale, fallback), copyrightYear()]);
  const topLevel = categories.filter((c) => !c.parentId);
  const footerProps = await buildFooterProps({
    storeName: store.name,
    logoUrl: store.logo_url,
    tagline: store.tagline,
    email: store.contact_email,
    phone: store.contact_phone,
    categories: topLevel,
    resolved: resolveFooter(store.footer, locale, fallback),
    localeSlot: <LocaleSwitcher enabled={store.enabled_locales} notice={t("translationNotice")} />,
    year,
    pages: { content: (store.settings.pages ?? {}) as Record<string, Record<string, string>>, locale, fallback },
  });

  return (
    // Chrome is wrapped rather than variant-patched so `print:hidden` covers all four layouts at
    // once: a printed order receipt is the page, not the shop around it.
    <>
      <div className="contents print:hidden">
      {renderSection("announcementBar", store.theme.sections.announcementBar, {
        text: store.theme.announcement[locale] ?? store.theme.announcement[fallback] ?? "",
      })}
      {renderSection("navbar", store.theme.sections.navbar, {
        storeName: store.name,
        logoUrl: store.logo_url,
        categories,
        labels: {
          home: t("home"),
          shop: t("shop"),
          brands: t("brands"),
          search: t("search"),
          menu: t("menu"),
          closeMenu: t("closeMenu"),
          categories: t("categories"),
          call: t("call"),
          viewAll: t("viewAll"),
        },
        contactPhone: store.contact_phone,
        localeSlot: <LocaleSwitcher enabled={store.enabled_locales} variant="compact" notice={t("translationNotice")} />,
        accountSlot: (
          <Suspense fallback={<AccountMenuFallback />}>
            <AccountMenuSlot />
          </Suspense>
        ),
        cartSlot: (
          <Suspense fallback={<CartButtonFallback />}>
            <CartButton store={store} locale={locale} />
          </Suspense>
        ),
      })}
      </div>
      <div className="flex flex-1 flex-col *:w-full">{children}</div>
      <div className="contents print:hidden">{renderSection("footer", store.theme.sections.footer, footerProps)}</div>
    </>
  );
}
