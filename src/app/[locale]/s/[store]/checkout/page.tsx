import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { storeContext, type StoreContext } from "@/lib/tenant/context";
import { getCart } from "@/lib/cart/cart";
import { getShippingRates } from "@/lib/catalog/queries";
import { renderSection } from "@/lib/theme/registry";
import { getSessionUser } from "@/lib/auth/session";
import { getMyAddresses } from "@/lib/account/queries";
import { pickJson } from "@/lib/catalog/types";
import { CheckoutProvider, CheckoutSummary } from "@/components/storefront/checkout/checkout-client";
import { CheckoutFormConnected } from "@/components/storefront/checkout/checkout-form-connected";
import { CheckoutSkeleton } from "@/components/storefront/shared/skeletons";
import type { Metadata } from "next";
import { NOINDEX } from "@/lib/seo/urls";

/** One shopper's page: named in the tab, kept out of search. */
export async function generateMetadata({ params }: PageProps<"/[locale]/s/[store]/checkout">): Promise<Metadata> {
  await storeContext(params);
  const t = await getTranslations("checkout");
  return { title: t("title"), robots: NOINDEX };
}

export default async function CheckoutPage({ params }: PageProps<"/[locale]/s/[store]/checkout">) {
  const ctx = await storeContext(params);
  return (
    <Suspense fallback={<CheckoutSkeleton />}>
      <CheckoutContent ctx={ctx} />
    </Suspense>
  );
}

async function CheckoutContent({ ctx }: { ctx: StoreContext }) {
  const { store, locale, fallback } = ctx;
  const [t, cart, rates, user] = await Promise.all([getTranslations("checkout"), getCart(store, locale), getShippingRates(store.id), getSessionUser()]);
  if (cart.lines.length === 0) redirect(`/${locale}/cart`);
  if (user && !user.profile.phone) redirect(`/${locale}/complete-profile?next=${encodeURIComponent(`/${locale}/checkout`)}`);
  const addresses = user ? await getMyAddresses(store.id) : [];

  const shippingOptions = rates.map((r) => ({
    id: r.id,
    name: pickJson(r.name, locale, fallback),
    rate: r.rate,
    freeOver: r.free_over,
    isFree: r.rate === 0 || (r.free_over !== null && cart.subtotal >= r.free_over) || cart.coupon?.type === "free_shipping",
  }));
  const storeBits = { tax_rate_bp: store.tax_rate_bp, prices_include_tax: store.prices_include_tax };

  return (
    <CheckoutProvider initialRateId={rates[0]?.id ?? null}>
      {renderSection("checkout", store.theme.sections.checkout, {
        title: t("title"),
        form: (
          <CheckoutFormConnected
            storeSlug={store.slug}
            locale={locale}
            currency={store.currency}
            email={user?.email ?? null}
            phone={user?.profile.phone ?? null}
            addresses={addresses}
            shippingOptions={shippingOptions}
            defaultCountry={(store.settings.default_country as string | undefined) ?? "TR"}
          />
        ),
        summary: <CheckoutSummary lines={cart.lines} subtotal={cart.subtotal} coupon={cart.coupon} rates={rates} store={storeBits} currency={store.currency} locale={locale} />,
      })}
    </CheckoutProvider>
  );
}
