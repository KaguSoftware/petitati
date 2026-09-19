import { LogOut } from "lucide-react";
import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { storeContext } from "@/lib/tenant/context";
import { requireCompleteProfile } from "@/lib/auth/session";
import { signOutAction } from "@/lib/auth/actions";
import { getMyAddresses, getMyOrders, getMyWishlistProducts, getOrderTracking } from "@/lib/account/queries";
import { isActiveOrder } from "@/lib/account/tracking";
import { AccountPanels } from "@/components/storefront/account/account-panels";
import { AddressesPanel, OrdersPanel, ProfilePanel, WishlistPanel } from "@/components/storefront/account/panels";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/storefront/shared/page-shell";
import type { Metadata } from "next";
import { NOINDEX } from "@/lib/seo/urls";

/** One shopper's page: named in the tab, kept out of search. */
export async function generateMetadata({ params }: LayoutProps<"/[locale]/s/[store]/account">): Promise<Metadata> {
  await storeContext(params);
  const t = await getTranslations("account");
  return { title: t("title"), robots: NOINDEX };
}

/**
 * Account shell. Loads every section's data in ONE query wave and renders all four panels; the
 * client shell switches between them with no navigation (see AccountPanels). The section routes
 * under /account/* exist only for deep links and render nothing themselves.
 */
export default async function AccountLayout({ children, params }: LayoutProps<"/[locale]/s/[store]/account">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("account");
  return (
    <PageShell title={t("title")}>
      {/* Session + data are request-bound: they render inside Suspense so the shell can prerender. */}
      <Suspense fallback={<AccountSkeleton />}>
        <AccountContent params={params}>{children}</AccountContent>
      </Suspense>
    </PageShell>
  );
}

function AccountSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 @tablet:grid-cols-[16rem_minmax(0,1fr)] @tablet:gap-10" aria-hidden>
      <div className="flex flex-col gap-4">
        <div className="hidden h-[4.25rem] animate-pulse rounded-xl bg-muted @tablet:block" />
        <div className="h-12 animate-pulse rounded-xl bg-muted @tablet:h-64" />
      </div>
      <div className="flex flex-col gap-4">
        <div className="h-8 w-40 animate-pulse rounded-md bg-muted" />
        <div className="h-40 animate-pulse rounded-xl bg-muted" />
      </div>
    </div>
  );
}

async function AccountContent({ params, children }: { params: LayoutProps<"/[locale]/s/[store]/account">["params"]; children: React.ReactNode }) {
  const ctx = await storeContext(params);
  const { store, locale, fallback } = ctx;
  const user = await requireCompleteProfile(locale, `/${locale}/account`);
  const [t, tn, [orders, tracking], addresses, wishlist] = await Promise.all([
    getTranslations("account"),
    getTranslations("nav"),
    // Tracking only for orders still on their way; chained so it doesn't hold up the other panels.
    getMyOrders(store.id).then(async (o) => [o, await getOrderTracking(store.id, o.filter((x) => isActiveOrder(x.status)).map((x) => x.id))] as const),
    getMyAddresses(store.id),
    getMyWishlistProducts(store.id, locale, fallback),
  ]);
  const name = user.profile.full_name?.trim() || null;
  const initial = (name ?? user.email ?? "•").trim().charAt(0).toUpperCase();
  const labels = { orders: t("orders"), addresses: t("addresses"), wishlist: t("wishlist"), profile: t("profile") };
  const signOut = (
    <form action={signOutAction.bind(null, locale)}>
      <Button variant="ghost" size="lg" type="submit">
        <LogOut data-icon="inline-start" />
        {tn("signOut")}
      </Button>
    </form>
  );
  const userCard = (
    <div className="hidden items-center gap-3 rounded-xl bg-muted/60 p-3 @tablet:flex">
      <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-full bg-primary text-base font-semibold text-primary-foreground">
        {initial}
      </span>
      <span className="flex min-w-0 flex-col">
        {name && <span className="truncate text-sm font-medium">{name}</span>}
        {user.email && (
          <span className="truncate text-xs text-muted-foreground" dir="ltr">
            {user.email}
          </span>
        )}
      </span>
    </div>
  );

  return (
    <>
      <AccountPanels
        labels={labels}
        userCard={userCard}
        signOut={signOut}
        panels={{
          orders: <OrdersPanel orders={orders} tracking={tracking} locale={locale} />,
          addresses: <AddressesPanel ctx={ctx} addresses={addresses} />,
          wishlist: <WishlistPanel ctx={ctx} products={wishlist} />,
          profile: <ProfilePanel user={user} locale={locale} />,
        }}
      />
      {children}
    </>
  );
}
