"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { buttonVariants } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * Reads `#access_token=…&refresh_token=…` (Supabase implicit flow, used by admin invite mails),
 * stores the session in the auth cookies, then continues through the profile check. A hard
 * navigation so the server sees the fresh cookies.
 */
export function FinishSignIn({ locale }: { locale: string }) {
  const t = useTranslations("auth");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const rawNext = new URLSearchParams(window.location.search).get("next") ?? `/${locale}`;
    const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : `/${locale}`;
    const access_token = hash.get("access_token");
    const refresh_token = hash.get("refresh_token");
    // No tokens → the same "expired" state as a rejected session (set from the promise, not the effect body).
    const session = access_token && refresh_token ? createSupabaseBrowserClient().auth.setSession({ access_token, refresh_token }) : Promise.resolve({ error: "missing" });
    session
      .then(({ error }: { error: unknown }) => {
        if (error) return setFailed(true);
        window.location.replace(`/${locale}/complete-profile?next=${encodeURIComponent(next)}`);
      });
  }, [locale]);

  if (!failed) return <p className="text-center text-sm text-muted-foreground">{t("finishingSignInHint")}</p>;
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <p className="text-sm text-muted-foreground">{t("linkExpired")}</p>
      <a href={`/${locale}/sign-in`} className={buttonVariants({ size: "xl" })}>
        {t("signIn")}
      </a>
    </div>
  );
}
