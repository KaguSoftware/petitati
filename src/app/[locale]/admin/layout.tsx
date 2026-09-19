import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { AdminFrame } from "@/components/admin/admin-frame";
import { AdminShellSkeleton } from "@/components/admin/admin-shell-skeleton";
import { clientMessages, ALL_NAMESPACES } from "@/i18n/namespaces";
import { MessagesProvider } from "@/components/intl-provider";

/** Session-gated segment: navigations into /admin may block on cookies (per the Next docs). */
export const instant = false;

/**
 * Admin root. The frame (session, accessible stores, active store, role) reads cookies, so it
 * streams inside Suspense while the shell skeleton prerenders as the static shell.
 */
export default async function AdminLayout({ children, params }: LayoutProps<"/[locale]/admin">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const messages = await clientMessages(locale, ALL_NAMESPACES);
  return (
    <MessagesProvider locale={locale} messages={messages}>
      <Suspense fallback={<AdminShellSkeleton />}>
        <AdminFrame locale={locale}>{children}</AdminFrame>
      </Suspense>
    </MessagesProvider>
  );
}
