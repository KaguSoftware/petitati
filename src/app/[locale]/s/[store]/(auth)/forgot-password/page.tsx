import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthCard } from "@/components/storefront/auth/auth-card";
import { ForgotPasswordForm } from "@/components/storefront/auth/auth-forms";
import type { Metadata } from "next";
import { storeContext } from "@/lib/tenant/context";
import { NOINDEX } from "@/lib/seo/urls";

/** One shopper's page: named in the tab, kept out of search. */
export async function generateMetadata({ params }: PageProps<"/[locale]/s/[store]/forgot-password">): Promise<Metadata> {
  await storeContext(params);
  const t = await getTranslations("auth");
  return { title: t("forgotPassword"), robots: NOINDEX };
}

export default async function ForgotPasswordPage({
  params,
}: PageProps<"/[locale]/s/[store]/forgot-password">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("auth");
  return (
    <AuthCard title={t("resetPassword")}>
      <ForgotPasswordForm locale={locale} />
    </AuthCard>
  );
}
