import type { Metadata } from "next";
import { clientMessages, COURIER_NAMESPACES } from "@/i18n/namespaces";
import { MessagesProvider } from "@/components/intl-provider";

/**
 * The courier app's own shell. It sits outside `s/[store]` on purpose: everything under that folder
 * inherits the shop navbar and footer from its layout, and a courier standing at a doorstep wants a
 * stop list, not a storefront.
 *
 * `noindex` plus a no-referrer policy: the token lives in the path, so any outbound link (the
 * "navigate" button especially) would otherwise hand it to another site in the `Referer` header.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function CourierLayout({ children, params }: LayoutProps<"/[locale]/courier/[token]">) {
  const { locale } = await params;
  const messages = await clientMessages(locale, COURIER_NAMESPACES);
  return (
    <MessagesProvider locale={locale} messages={messages}>
      <div className="min-h-screen bg-muted/40 font-sans text-foreground">{children}</div>
    </MessagesProvider>
  );
}
