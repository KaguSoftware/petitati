"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

/** Put `text` on the clipboard; falls back to a hidden textarea where the async API is missing (http, old WebViews). */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  }
}

/** Icon flips to a tick and a polite live region says "Copied" for two seconds. */
export function useCopied(ms = 2000) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const flash = () => {
    setCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), ms);
  };
  return { copied, flash };
}

interface Props {
  value: string;
  /** What is being copied, for screen readers and the tooltip: "Copy order number". */
  label: string;
  className?: string;
}

/**
 * One-tap copy for identifiers people retype elsewhere: order numbers, delivery codes, courier
 * links. Used by the storefront and the admin, so its strings live in `common`.
 */
export function CopyButton({ value, label, className }: Props) {
  const t = useTranslations("common");
  const { copied, flash } = useCopied();

  return (
    <button
      type="button"
      onClick={async () => {
        if (await copyText(value)) flash();
      }}
      aria-label={label}
      title={label}
      className={cn(
        "relative inline-grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none print:hidden",
        copied && "text-primary hover:text-primary",
        className,
      )}
    >
      {copied ? <Check aria-hidden className="size-4" /> : <Copy aria-hidden className="size-4" />}
      <span aria-live="polite" className="sr-only">
        {copied ? t("copied") : ""}
      </span>
    </button>
  );
}
