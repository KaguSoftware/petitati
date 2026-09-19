"use client";

import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button, buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

/**
 * Admin error boundary: a failing page keeps the sidebar and header (this sits inside the admin
 * layout), offers a retry and a way back to the dashboard, and shows the digest to quote.
 */
export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("admin.common");
  useEffect(() => {
    if (process.env.NODE_ENV === "development") console.error(error);
  }, [error]);
  return (
    <div role="alert" className="flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center">
      <span aria-hidden className="grid size-14 place-items-center rounded-full bg-destructive/10 text-destructive">
        <TriangleAlert className="size-6" />
      </span>
      <h1 className="text-xl font-semibold">{t("crashTitle")}</h1>
      <p className="max-w-sm text-sm text-muted-foreground">{t("crashBody")}</p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button onClick={reset}>{t("retry")}</Button>
        <Link href="/admin" className={buttonVariants({ variant: "outline" })}>
          {t("backToDashboard")}
        </Link>
      </div>
      {error.digest && (
        <p className="text-xs text-muted-foreground">
          {t("errorRef")} <code dir="ltr">{error.digest}</code>
        </p>
      )}
    </div>
  );
}
