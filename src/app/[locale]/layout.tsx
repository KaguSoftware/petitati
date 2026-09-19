import type { Metadata } from "next";
import { Amiri, Cairo, DM_Sans, IBM_Plex_Sans_Arabic, Inter, Manrope, Markazi_Text, Noto_Naskh_Arabic, Noto_Sans_Arabic, Playfair_Display, Vazirmatn } from "next/font/google";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { routing } from "@/i18n/routing";
import { clientMessages, ROOT_NAMESPACES } from "@/i18n/namespaces";
import { dirFor, locales, type Locale } from "@/i18n/config";
import { Toaster } from "@/components/ui/sonner";
import { AppIntlProvider } from "@/components/intl-provider";
import { DocumentScrollbars } from "@/components/scroll/document-scrollbars";
import { ThemeProvider } from "@/components/theme-provider";
import "../globals.css";

// The default face for every locale: one family that carries Arabic and Latin with matching
// metrics, so en/tr/fa read as one site. The only preloaded font.
const ibmPlexArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ibm-plex-arabic",
});
const inter = Inter({ subsets: ["latin", "latin-ext"], variable: "--font-inter", preload: false });
const vazirmatn = Vazirmatn({ subsets: ["arabic", "latin"], variable: "--font-vazirmatn", preload: false });
// Optional theme fonts (see src/lib/theme/fonts.ts): declared here so any store may pick them, but
// not preloaded — the browser only fetches a face once a storefront actually uses it.
const manrope = Manrope({ subsets: ["latin", "latin-ext"], variable: "--font-manrope", preload: false });
const dmSans = DM_Sans({ subsets: ["latin", "latin-ext"], variable: "--font-dm-sans", preload: false });
const playfair = Playfair_Display({ subsets: ["latin", "latin-ext"], variable: "--font-playfair", preload: false });
// Arabic-script faces (Persian storefronts pick these directly; Latin fonts pair with one of them).
const notoSansArabic = Noto_Sans_Arabic({ subsets: ["arabic", "latin"], variable: "--font-noto-sans-arabic", preload: false });
const notoNaskhArabic = Noto_Naskh_Arabic({ subsets: ["arabic", "latin"], variable: "--font-noto-naskh-arabic", preload: false });
const cairo = Cairo({ subsets: ["arabic", "latin"], variable: "--font-cairo", preload: false });
const amiri = Amiri({ subsets: ["arabic", "latin"], weight: ["400", "700"], variable: "--font-amiri", preload: false });
const markazi = Markazi_Text({ subsets: ["arabic", "latin"], variable: "--font-markazi", preload: false });
const themeFontClasses = [manrope, dmSans, playfair, notoSansArabic, notoNaskhArabic, cairo, amiri, markazi].map((f) => f.variable).join(" ");

// No brand here: each route group names its own tabs (the storefront uses the store's name, see
// s/[store]/layout.tsx), so a second tenant never inherits this platform's name.
export const metadata: Metadata = {
  title: "Petitati",
};

const toastBottom = (base: string) => `calc(${base} + var(--dock-h, 0px) + var(--fab-h, 0px) + env(safe-area-inset-bottom, 0px))`;

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const dir = dirFor(locale as Locale);
  // One family for every locale. This used to fork — Inter for en/tr, Vazirmatn for fa — which is
  // why the two read as different sites; the fork existed because Vazirmatn's Latin sits high in
  // controls. IBM Plex Sans Arabic has centred Latin metrics, so neither problem remains.
  const fontFamily = "var(--font-ibm-plex-arabic)";
  // Passed explicitly so the provider never touches request-scoped APIs (keeps the shell static).
  // Only the root set: each route group re-provides its own with `MessagesProvider`, so the public
  // storefront no longer serializes the admin catalogue into every page. See i18n/namespaces.ts.
  const messages = await clientMessages(locale, ROOT_NAMESPACES);

  return (
    <html
      lang={locale}
      dir={dir}
      suppressHydrationWarning
      className={`${ibmPlexArabic.variable} ${inter.variable} ${vazirmatn.variable} ${themeFontClasses} h-full antialiased`}
      style={{ ["--font-sans" as string]: fontFamily }}
      data-overlayscrollbars-initialize=""
    >
      <body className="flex min-h-full flex-col bg-background text-foreground" data-overlayscrollbars-initialize="">
        <DocumentScrollbars />
        <ThemeProvider>
          <AppIntlProvider locale={locale} dir={dir} messages={messages}>
            <Suspense fallback={null}>{children}</Suspense>
            {/* Toasts rise above the storefront's bottom dock (sticky buy bar, WhatsApp bubble): see storefront/shared/dock.ts. */}
            <Toaster position={dir === "rtl" ? "bottom-left" : "bottom-right"} offset={{ bottom: toastBottom("24px") }} mobileOffset={{ bottom: toastBottom("16px") }} />
          </AppIntlProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
