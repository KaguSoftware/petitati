import { ShoppingBag } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/storefront/shared/empty-state";
import { PageShell } from "@/components/storefront/shared/page-shell";
import { Price } from "@/components/storefront/shared/price";
import { ProductImage } from "@/components/storefront/shared/product-image";
import { formatMoney } from "@/lib/money";
import type { CartViewProps } from "../types";

export function CartViewMinimal({ cart, totals, currency, locale, labels, lineControls, couponSlot, checkoutHref, shopHref }: CartViewProps) {
  const money = (n: number) => formatMoney(n, currency, locale);
  return (
    <PageShell title={labels.title}>
      {cart.lines.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title={labels.emptyTitle}
          description={labels.empty}
          action={
            <Link href={shopHref} className={buttonVariants({ size: "xl" })}>
              {labels.continueShopping}
            </Link>
          }
        />
      ) : (
        <div className="grid gap-10 @desktop:grid-cols-[minmax(0,1fr)_360px]">
          <ul className="divide-y">
            {cart.lines.map((l) => (
              <li key={l.id} className="flex items-center gap-4 py-5">
                <Link href={`/p/${l.productSlug}`}>
                  <ProductImage src={l.imageUrl} alt={l.name} className="size-24 rounded-lg" sizes="96px" />
                </Link>
                <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5">
                  <div className="flex items-start justify-between gap-3">
                    <Link href={`/p/${l.productSlug}`} className="bidi-auto font-medium hover:underline">
                      {l.name}
                    </Link>
                    <Price amount={l.lineTotal} currency={currency} locale={locale} className="shrink-0" />
                  </div>
                  {l.variantLabel && <p className="text-sm text-muted-foreground">{l.variantLabel}</p>}
                  <div className="mt-1">{lineControls[l.id]}</div>
                </div>
              </li>
            ))}
          </ul>
          <aside className="flex h-fit flex-col gap-4 rounded-2xl bg-card p-5 shadow-sm ring-1 ring-foreground/5 @desktop:sticky @desktop:top-24">
            {couponSlot}
            <dl className="flex flex-col gap-2 text-sm">
              <Row label={labels.subtotal} value={money(totals.subtotal)} />
              {totals.discount > 0 && <Row label={labels.discount} value={`−${money(totals.discount)}`} />}
              <Row label={labels.shipping} value={totals.shipping === 0 ? labels.freeShipping : money(totals.shipping)} />
              {labels.shippingNote && <p className="text-xs text-muted-foreground">{labels.shippingNote}</p>}
              {totals.tax > 0 && <Row label={labels.tax} value={money(totals.tax)} muted />}
              <div className="my-1 border-t" />
              <Row label={labels.total} value={money(totals.total)} strong />
            </dl>
            <Link href={checkoutHref} className={buttonVariants({ size: "xl" })}>
              {labels.checkout}
            </Link>
            <Link href={shopHref} className="text-center text-sm text-muted-foreground underline-offset-4 hover:underline">
              {labels.continueShopping}
            </Link>
          </aside>
        </div>
      )}
    </PageShell>
  );
}

function Row({ label, value, strong, muted }: { label: string; value: string; strong?: boolean; muted?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 ${strong ? "text-base font-semibold" : ""} ${muted ? "text-muted-foreground" : ""}`}>
      <dt>{label}</dt>
      <dd className="text-end tabular-nums">{value}</dd>
    </div>
  );
}
