import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { storeContext, type StoreContext } from "@/lib/tenant/context";
import { PageShell } from "@/components/storefront/shared/page-shell";
import { DeliverForm } from "@/components/storefront/deliver-form";
import { PageSkeleton } from "@/components/storefront/shared/skeletons";
import type { Metadata } from "next";
import { NOINDEX } from "@/lib/seo/urls";

/** One shopper's page: named in the tab, kept out of search. */
export async function generateMetadata({ params }: PageProps<"/[locale]/s/[store]/deliver">): Promise<Metadata> {
  await storeContext(params);
  const t = await getTranslations("deliver");
  return { title: t("title"), robots: NOINDEX };
}

/**
 * Delivery confirmation for whoever hands the parcel over — reachable without an account at
 * `<store>/<locale>/deliver` (the proxy rewrites everything outside /admin, /auth, /preview into
 * the store). The delivery slip carries this address and the order number; the six digits come from
 * the customer at the door. Nothing about the order is ever rendered here.
 */
export default async function DeliverPage({ params, searchParams }: PageProps<"/[locale]/s/[store]/deliver">) {
  const ctx = await storeContext(params);
  return (
    <Suspense fallback={<PageSkeleton width="narrow" lines={3} />}>
      <DeliverContent ctx={ctx} searchParams={searchParams} />
    </Suspense>
  );
}

async function DeliverContent({ ctx, searchParams }: { ctx: StoreContext; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [t, sp] = await Promise.all([getTranslations("deliver"), searchParams]);
  const prefill = typeof sp.o === "string" ? sp.o.slice(0, 40) : "";
  return (
    <PageShell width="narrow" title={t("title")} description={t("description")}>
      <DeliverForm slug={ctx.store.slug} defaultNumber={prefill} />
    </PageShell>
  );
}
