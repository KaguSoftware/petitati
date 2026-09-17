import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { ProductImage } from "@/components/storefront/shared/product-image";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { CartViewProps } from "../types";

const textLink = "text-xs uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground";

/** Receipt: one narrow column, mono figures with dotted leaders, totals at the foot. */
export function CartViewEditorial({ cart, totals, currency, locale, labels, lineControls, couponSlot, checkoutHref, shopHref }: CartViewProps) {
  const money = (n: number) => formatMoney(n, currency, locale);
  return (
    <main className="mx-auto max-w-2xl px-gutter py-12 @tablet:py-16">
      <h1 className="mb-8 border-b border-foreground/15 pb-4 text-center font-heading text-4xl font-medium tracking-tight @tablet:text-5xl">{labels.title}</h1>
      {cart.lines.length === 0 ? (
        <div className="flex flex-col items-center gap-5 py-20 text-center">
          <p className="font-heading text-lg italic text-muted-foreground">{labels.empty}</p>
          <Link href={shopHref} className={cn(textLink, "border-b border-foreground pb-1 text-foreground hover:border-primary hover:text-primary")}>
            {labels.continueShopping}
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          <ul className="divide-y divide-dashed divide-foreground/20">
            {cart.lines.map((l) => (
              <li key={l.id} className="flex gap-4 py-5">
                <Link href={`/p/${l.productSlug}`} className="shrink-0">
                  <ProductImage src={l.imageUrl} alt={l.name} className="aspect-[4/5] w-16 rounded-none grayscale transition hover:grayscale-0" sizes="64px" />
                </Link>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex items-baseline gap-2">
                    <Link href={`/p/${l.productSlug}`} className="font-heading text-lg font-medium leading-snug transition-colors hover:text-primary">
                      {l.name}
                    </Link>
                    <span aria-hidden className="mb-1 flex-1 border-b border-dotted border-foreground/30" />
                    <span className="text-sm tabular-nums">{money(l.lineTotal)}</span>
                  </div>
                  {l.variantLabel && <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">{l.variantLabel}</p>}
                  <div className="pt-2">{lineControls[l.id]}</div>
                </div>
              </li>
            ))}
          </ul>
          <div className="border-y border-foreground/15 py-5">{couponSlot}</div>
          <dl className="flex flex-col gap-2 text-sm">
            <Row label={labels.subtotal} value={money(totals.subtotal)} />
            {totals.discount > 0 && <Row label={labels.discount} value={`−${money(totals.discount)}`} />}
            <Row label={labels.shipping} value={totals.shipping === 0 ? labels.freeShipping : money(totals.shipping)} />
            {labels.shippingNote && <p className="text-xs text-muted-foreground">{labels.shippingNote}</p>}
            {totals.tax > 0 && <Row label={labels.tax} value={money(totals.tax)} muted />}
            <Row label={labels.total} value={money(totals.total)} strong />
          </dl>
          <div className="flex flex-col items-center gap-4">
            <Link href={checkoutHref} className={buttonVariants({ size: "xl", className: "w-full text-sm uppercase tracking-[0.15em]" })}>
              {labels.checkout}
            </Link>
            <Link href={shopHref} className={textLink}>
              {labels.continueShopping}
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}

function Row({ label, value, strong, muted }: { label: string; value: string; strong?: boolean; muted?: boolean }) {
  return (
    <div className={cn("flex items-baseline gap-2", muted && "text-muted-foreground", strong && "mt-2 border-t border-foreground pt-3 text-base")}>
      <dt className={cn("text-xs uppercase tracking-[0.15em]", strong ? "text-foreground" : "text-muted-foreground")}>{label}</dt>
      <span aria-hidden className="mb-1 flex-1 border-b border-dotted border-foreground/30" />
      <dd className={cn("text-end tabular-nums", strong && "font-heading text-2xl font-medium")}>{value}</dd>
    </div>
  );
}
