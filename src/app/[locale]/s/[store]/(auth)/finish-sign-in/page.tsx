import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { AuthCard } from "@/components/storefront/auth/auth-card";
import { FinishSignIn } from "@/components/storefront/auth/finish-sign-in";
import { storeContext } from "@/lib/tenant/context";
import { NOINDEX } from "@/lib/seo/urls";

export async function generateMetadata({ params }: PageProps<"/[locale]/s/[store]/finish-sign-in">): Promise<Metadata> {
  await storeContext(params);
  const t = await getTranslations("auth");
  return { title: t("finishingSignIn"), robots: NOINDEX };
}

/** Landing for email links whose session travels in the URL #fragment (staff invites). See auth/callback. */
export default async function FinishSignInPage({ params }: PageProps<"/[locale]/s/[store]/finish-sign-in">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("auth");
  return (
    <AuthCard title={t("finishingSignIn")}>
      <FinishSignIn locale={locale} />
    </AuthCard>
  );
}
