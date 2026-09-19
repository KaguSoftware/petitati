import type { Metadata, Viewport } from "next";
import { storeOrigin } from "@/lib/seo/urls";
import { NAVBAR_VARS, themeToCssVars } from "@/lib/theme/types";
import { fontStack } from "@/lib/theme/fonts";
import { storeContext } from "@/lib/tenant/context";
import { StoreProvider } from "@/components/storefront/store-provider";
import { StoreChrome } from "@/components/storefront/store-chrome";
import { StoreFontVars } from "@/components/storefront/store-font-vars";
import { cn } from "@/lib/utils";
import { clientMessages, STOREFRONT_NAMESPACES } from "@/i18n/namespaces";
import { MessagesProvider } from "@/components/intl-provider";

/**
 * Storefront root. Resolves the tenant from the (rewritten) path, injects the store's colour
 * scheme as CSS variables so every shadcn token inside is re-skinned, exposes store basics to
 * client components via context, and wraps pages in the store's chosen chrome.
 */
/**
 * Every storefront tab reads "<page> · <store name>" (the root layout carries no brand, so a
 * second tenant never shows the first one's). Tab icon = the store's favicon when it has one
 * (admin → Design → Branding), otherwise the app icon. Link previews fall back to the store logo.
 */
export async function generateMetadata({ params }: LayoutProps<"/[locale]/s/[store]">): Promise<Metadata> {
  const { store } = await storeContext(params);
  return {
    metadataBase: new URL(storeOrigin(store.slug)),
    title: { default: store.name, template: `%s · ${store.name}` },
    description: store.tagline ?? undefined,
    applicationName: store.name,
    icons: store.favicon_url ? { icon: store.favicon_url } : undefined,
    openGraph: { siteName: store.name, type: "website", images: store.logo_url ? [store.logo_url] : undefined },
    twitter: { card: "summary_large_image" },
  };
}

/**
 * `viewportFit: cover` makes the safe-area insets real (the bottom dock). Static on purpose: under
 * Cache Components a viewport that read the store (params) would force every storefront page to
 * render at request time. The store's browser-bar colour is emitted as <meta> by the layout below.
 */
export const viewport: Viewport = { viewportFit: "cover" };

export default async function StoreLayout({ children, params }: LayoutProps<"/[locale]/s/[store]">) {
  const ctx = await storeContext(params);
  const { store, locale } = ctx;
  // Shop strings only. The staff edit drawer adds `admin` for itself, for staff only.
  const messages = await clientMessages(locale, STOREFRONT_NAMESPACES);

  // `@container` lives on an outer box: a container query never matches the element that declares
  // it, so the navbar's `@tablet:` variables must sit on a descendant of the container.
  return (
    <div className="@container">
      <div
        data-storefront
        data-store-theme
        className={cn("flex min-h-dvh flex-col bg-background font-sans text-foreground *:w-full", NAVBAR_VARS[store.theme.sections.navbar])}
        style={themeToCssVars(store.theme, locale) as React.CSSProperties}
      >
        {/* Phone browser bar in the store's page colour (React hoists these into <head>). The dark value
            approximates the derived dark ground (globals.css, `.dark [data-store-theme]`). */}
        <meta name="theme-color" media="(prefers-color-scheme: light)" content={store.theme.colors.background} />
        <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#15191c" />
        {/* Portals (sheets, dialogs, menus, toasts) render outside this div: mirror the fonts onto <html>. */}
        <StoreFontVars body={fontStack(store.theme.fonts.body, locale)} heading={fontStack(store.theme.fonts.heading, locale)} />
        <StoreProvider
        value={{
          id: store.id,
          slug: store.slug,
          name: store.name,
          currency: store.currency,
          locale,
          enabledLocales: store.enabled_locales,
          logoUrl: store.logo_url,
        }}
      >
          <MessagesProvider locale={locale} messages={messages}>
            <StoreChrome ctx={ctx}>{children}</StoreChrome>
          </MessagesProvider>
        </StoreProvider>
      </div>
    </div>
  );
}
