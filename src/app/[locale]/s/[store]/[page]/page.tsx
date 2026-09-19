import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { pageAlternates } from "@/lib/seo/urls";
import { getTranslations } from "next-intl/server";
import { storeContext } from "@/lib/tenant/context";
import { PageShell } from "@/components/storefront/shared/page-shell";

const PAGES = ["privacy", "terms", "about"] as const;

export async function generateMetadata({ params }: PageProps<"/[locale]/s/[store]/[page]">): Promise<Metadata> {
  const { store, locale } = await storeContext(params);
  const { page } = await params;
  if (!(PAGES as readonly string[]).includes(page)) return {};
  const t = await getTranslations("footer");
  return { title: t(page as (typeof PAGES)[number]), alternates: pageAlternates(store, locale, `/${page}`) };
}

/**
 * Simple content pages read from store.settings.pages.<key>.<locale> (markdown-ish plain text).
 * SCOPE(content-pages): plain text only. GROWS LATER → rich text editor in admin settings.
 */
export default async function ContentPage({ params }: PageProps<"/[locale]/s/[store]/[page]">) {
  const { store, locale, fallback } = await storeContext(params);
  const { page } = await params;
  if (!(PAGES as readonly string[]).includes(page)) notFound();
  const t = await getTranslations("footer");
  const pages = (store.settings.pages ?? {}) as Record<string, Record<string, string>>;
  const body = (pages[page]?.[locale] ?? pages[page]?.[fallback] ?? "").trim();
  // Nothing written for this page in any locale — it does not exist. The footer no longer links
  // to it either (see buildFooterProps), so this only catches direct hits and stale links.
  if (!body) notFound();
  return (
    <PageShell width="narrow" title={t(page as (typeof PAGES)[number])}>
      <div className="bidi-auto rich-text max-w-prose whitespace-pre-line text-muted-foreground">{body}</div>
    </PageShell>
  );
}
