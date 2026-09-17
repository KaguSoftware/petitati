import { ChevronDown } from "lucide-react";
import type { CheckoutLayoutProps } from "../types";

/** One narrow column: the summary folds open above the form, like a printed order slip. */
export function CheckoutEditorial({ title, form, summary }: CheckoutLayoutProps) {
  return (
    <main className="mx-auto max-w-2xl px-gutter py-12 @tablet:py-16">
      <h1 className="mb-8 border-b border-foreground/15 pb-4 font-heading text-4xl font-medium tracking-tight @tablet:text-5xl">{title}</h1>
      <details className="group mb-10 border-y border-foreground/15" open>
        <summary className="flex cursor-pointer list-none items-center justify-between py-3 text-xs uppercase tracking-[0.2em] text-muted-foreground [&::-webkit-details-marker]:hidden">
          <span aria-hidden className="tabular-nums">01</span>
          <ChevronDown aria-hidden className="size-4 transition-transform group-open:rotate-180" />
        </summary>
        <div className="pb-6">{summary}</div>
      </details>
      <div>{form}</div>
    </main>
  );
}
