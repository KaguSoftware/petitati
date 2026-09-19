import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthCard } from "@/components/storefront/auth/auth-card";
import { SignInForm } from "@/components/storefront/auth/auth-forms";
import type { Metadata } from "next";
import { storeContext } from "@/lib/tenant/context";
import { NOINDEX } from "@/lib/seo/urls";

type Props = PageProps<"/[locale]/s/[store]/sign-in">;

/** One shopper's page: named in the tab, kept out of search. */
export async function generateMetadata({ params }: PageProps<"/[locale]/s/[store]/sign-in">): Promise<Metadata> {
  await storeContext(params);
  const t = await getTranslations("auth");
  return { title: t("signIn"), robots: NOINDEX };
}

export default async function SignInPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("auth");
  return (
    <AuthCard title={t("signIn")}>
      {/* searchParams is runtime data: read it inside Suspense so the shell still prerenders. */}
      <Suspense>
        <Form locale={locale} searchParams={searchParams} />
      </Suspense>
    </AuthCard>
  );
}

async function Form({ locale, searchParams }: { locale: string; searchParams: Props["searchParams"] }) {
  const { next } = await searchParams;
  return <SignInForm locale={locale} next={typeof next === "string" ? next : undefined} />;
}
