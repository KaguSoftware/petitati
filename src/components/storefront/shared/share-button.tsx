"use client";

import { Check, Share2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { copyText, useCopied } from "@/components/shared/copy-button";
import { cn } from "@/lib/utils";

/**
 * Opens the phone's own share sheet (WhatsApp, Instagram, Messages…) with the page's link. Where
 * the Web Share API is missing (most desktop browsers) it copies the link instead and says so.
 */
export function ShareButton({ title, className }: { title: string; className?: string }) {
  const t = useTranslations("common");
  const { copied, flash } = useCopied();

  async function share() {
    const url = window.location.href.split("#")[0];
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title, url });
      } catch {
        // Cancelled by the shopper: nothing to do.
      }
      return;
    }
    if (await copyText(url)) flash();
  }

  return (
    <button
      type="button"
      onClick={share}
      aria-label={t("share")}
      title={t("share")}
      className={cn(
        "grid size-11 place-items-center rounded-full bg-card/90 text-foreground shadow-md ring-1 ring-foreground/10 transition-colors hover:bg-card active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none print:hidden",
        className,
      )}
    >
      {copied ? <Check aria-hidden className="size-5 text-primary" /> : <Share2 aria-hidden className="size-5" />}
      <span aria-live="polite" className="sr-only">
        {copied ? t("linkCopied") : ""}
      </span>
    </button>
  );
}
