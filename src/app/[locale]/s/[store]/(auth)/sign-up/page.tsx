import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthCard } from "@/components/storefront/auth/auth-card";
import { SignUpForm } from "@/components/storefront/auth/auth-forms";
import type { Metadata } from "next";
import { storeContext } from "@/lib/tenant/context";
import { NOINDEX } from "@/lib/seo/urls";

type Props = PageProps<"/[locale]/s/[store]/sign-up">;

/** One shopper's page: named in the tab, kept out of search. */
export async function generateMetadata({ params }: PageProps<"/[locale]/s/[store]/sign-up">): Promise<Metadata> {
  await storeContext(params);
  const t = await getTranslations("auth");
  return { title: t("signUp"), robots: NOINDEX };
}

export default async function SignUpPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("auth");
  return (
    <AuthCard title={t("signUp")}>
      {/* searchParams is runtime data: read it inside Suspense so the shell still prerenders. */}
      <Suspense>
        <Form locale={locale} searchParams={searchParams} />
      </Suspense>
    </AuthCard>
  );
}

async function Form({ locale, searchParams }: { locale: string; searchParams: Props["searchParams"] }) {
  const { next } = await searchParams;
  return <SignUpForm locale={locale} next={typeof next === "string" ? next : undefined} />;
}
