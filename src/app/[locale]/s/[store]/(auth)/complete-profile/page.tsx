import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthCard } from "@/components/storefront/auth/auth-card";
import { CompleteProfileForm } from "@/components/storefront/auth/complete-profile-form";
import { getSessionUser } from "@/lib/auth/session";
import { defaultCountryForLocale } from "@/lib/phone/countries";
import type { Metadata } from "next";
import { storeContext } from "@/lib/tenant/context";
import { NOINDEX } from "@/lib/seo/urls";

type Props = PageProps<"/[locale]/s/[store]/complete-profile">;

/** One shopper's page: named in the tab, kept out of search. */
export async function generateMetadata({ params }: PageProps<"/[locale]/s/[store]/complete-profile">): Promise<Metadata> {
  await storeContext(params);
  const t = await getTranslations("auth");
  return { title: t("completeProfileTitle"), robots: NOINDEX };
}

/** One-time step after first sign-in: collect the mandatory phone number. */
export default async function CompleteProfilePage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("auth");
  return (
    <AuthCard title={t("completeProfileTitle")}>
      <Suspense>
        <Form locale={locale} searchParams={searchParams} />
      </Suspense>
    </AuthCard>
  );
}

async function Form({ locale, searchParams }: { locale: string; searchParams: Props["searchParams"] }) {
  const { next } = await searchParams;
  const nextPath = typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : `/${locale}`;
  // Only requireUser here, never requireCompleteProfile (that would loop).
  const user = await getSessionUser();
  if (!user) redirect(`/${locale}/sign-in?next=${encodeURIComponent(`/${locale}/complete-profile?next=${encodeURIComponent(nextPath)}`)}`);
  if (user.profile.phone) redirect(nextPath);
  return <CompleteProfileForm locale={locale} next={nextPath} defaultCountry={defaultCountryForLocale(locale)} askName={!user.profile.full_name} />;
}
