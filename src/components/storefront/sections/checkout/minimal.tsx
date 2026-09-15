import { PageShell } from "@/components/storefront/shared/page-shell";
import type { CheckoutLayoutProps } from "../types";

export function CheckoutMinimal({ title, form, summary }: CheckoutLayoutProps) {
  return (
    <PageShell title={title}>
      <div className="grid gap-8 @desktop:grid-cols-[minmax(0,1fr)_380px] @desktop:gap-10">
        <div className="min-w-0">{form}</div>
        {/* On phones the summary comes first, so the total is seen before the form. */}
        <aside className="order-first h-fit rounded-2xl bg-card p-5 shadow-sm ring-1 ring-foreground/5 @desktop:order-none @desktop:sticky @desktop:top-24">{summary}</aside>
      </div>
    </PageShell>
  );
}
