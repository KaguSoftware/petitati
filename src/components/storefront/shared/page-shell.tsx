import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Props {
  /** Page heading; omit when the page draws its own header (banner, brand mark). */
  title?: ReactNode;
  /** Small line ABOVE the heading — a breadcrumb. */
  eyebrow?: ReactNode;
  /** Small text under the title. */
  description?: ReactNode;
  /** Right-aligned controls on the title row. */
  actions?: ReactNode;
  /** `wide` (catalog, cart, checkout, account) or `narrow` (order receipt, content pages). */
  width?: "wide" | "narrow";
  /** Heading weight of the page. `page` is the default; `sub` is for receipts and detail views. */
  size?: "page" | "sub";
  /** Render as `<main>` (default) or a plain `<div>` when the page already has a `<main>`. */
  as?: "main" | "div";
  className?: string;
  children: ReactNode;
}

/**
 * The two page-title weights. Pages with a custom header (a receipt with a subtitle, a category
 * banner, a brand logo beside the name) cannot pass `title` to the shell, so they import this
 * instead of re-declaring `text-3xl @tablet:text-4xl` by hand — which is how three different h1
 * scales ended up on the storefront.
 */
export const pageHeading = {
  page: "text-display @tablet:text-display-lg",
  sub: "text-title @tablet:text-display",
} as const;

const HEADING = pageHeading;

/**
 * The single page container for every storefront route: one outer edge (`max-w-7xl` + gutter),
 * one vertical rhythm and one heading style, so titles line up with the navbar wordmark and the
 * footer columns on every page. Sections on the home page use the same edge on their own.
 */
export function PageShell({ title, eyebrow, description, actions, width = "wide", size = "page", as: Tag = "main", className, children }: Props) {
  return (
    <Tag className={cn("mx-auto w-full max-w-7xl px-gutter py-8 @desktop:py-12", className)}>
      <div className={cn("flex flex-col gap-6 @desktop:gap-8", width === "narrow" && "mx-auto max-w-3xl")}>
        {(title || actions) && (
          <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
            <div className="flex min-w-0 flex-col gap-1.5">
              {eyebrow && <div className="mb-1">{eyebrow}</div>}
              {title && <h1 className={cn("bidi-auto font-semibold tracking-tight text-balance", HEADING[size])}>{title}</h1>}
              {description && <p className="bidi-auto max-w-xl text-muted-foreground">{description}</p>}
            </div>
            {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
          </header>
        )}
        {children}
      </div>
    </Tag>
  );
}
