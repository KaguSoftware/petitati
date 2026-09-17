import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { Price } from "@/components/storefront/shared/price";
import { ProductImage } from "@/components/storefront/shared/product-image";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { CartViewProps } from "../types";

const bigButton = "h-14 rounded-none px-8 text-base font-extrabold tracking-wide uppercase";

/** Full-width rows, then a dark totals band across the bottom with the checkout button inside. */
export function CartViewBold({ cart, totals, currency, locale, labels, lineControls, couponSlot, checkoutHref, shopHref }: CartViewProps) {
  const money = (n: number) => formatMoney(n, currency, locale);
  return (
    <main className="py-10 @tablet:py-14">
      <div className="mx-auto max-w-6xl px-gutter">
        <h1 className="mb-8 text-4xl font-extrabold tracking-tight uppercase @tablet:text-6xl">{labels.title}</h1>
        {cart.lines.length === 0 && (
          <div className="flex flex-col items-center gap-6 border-4 border-foreground px-4 py-20 text-center">
            <p className="font-heading text-xl font-bold tracking-wide uppercase">{labels.empty}</p>
            <Link href={shopHref} className={cn(buttonVariants({ variant: "outline", size: "xl" }), bigButton, "border-2 border-foreground")}>
              {labels.continueShopping}
            </Link>
          </div>
        )}
        {cart.lines.length > 0 && (
          <ul className="divide-y-2 divide-foreground border-y-4 border-foreground">
            {cart.lines.map((l) => (
              <li key={l.id} className="grid grid-cols-[auto_1fr] items-center gap-4 py-5 @tablet:grid-cols-[auto_1fr_auto_auto] @tablet:gap-6">
                <Link href={`/p/${l.productSlug}`} className="shrink-0 border-2 border-foreground">
                  <ProductImage src={l.imageUrl} alt={l.name} className="size-20 @tablet:size-24" sizes="96px" />
                </Link>
                <div className="flex min-w-0 flex-col gap-1">
                  <Link href={`/p/${l.productSlug}`} className="text-base leading-tight font-extrabold tracking-tight uppercase decoration-2 underline-offset-4 hover:underline @tablet:text-lg">
                    {l.name}
                  </Link>
                  {l.variantLabel && <p className="text-sm font-medium text-muted-foreground">{l.variantLabel}</p>}
                </div>
                <div className="col-span-2 flex items-center justify-between gap-4 @tablet:col-span-1 @tablet:contents">
                  <div>{lineControls[l.id]}</div>
                  <Price amount={l.lineTotal} currency={currency} locale={locale} className="text-lg font-extrabold @tablet:min-w-28 @tablet:justify-end" />
                </div>
              </li>
            ))}
          </ul>
        )}
        {cart.lines.length > 0 && <div className="mt-6 max-w-md border-2 border-foreground p-4">{couponSlot}</div>}
      </div>
      {cart.lines.length > 0 && (
        <div className="mt-10 bg-inverse text-inverse-foreground">
          <div className="mx-auto flex max-w-6xl flex-col gap-8 px-gutter py-10 @tablet:flex-row @tablet:items-end @tablet:justify-between @tablet:gap-12">
            <dl className="grid w-full gap-x-8 gap-y-2 text-sm font-medium @tablet:max-w-md">
              <Row label={labels.subtotal} value={money(totals.subtotal)} />
              {totals.discount > 0 && <Row label={labels.discount} value={`−${money(totals.discount)}`} />}
              <Row label={labels.shipping} value={totals.shipping === 0 ? labels.freeShipping : money(totals.shipping)} />
              {labels.shippingNote && <p className="text-xs text-inverse-foreground/70">{labels.shippingNote}</p>}
              {totals.tax > 0 && <Row label={labels.tax} value={money(totals.tax)} muted />}
              <div className="my-2 border-t-2 border-inverse-foreground/30" />
              <Row label={labels.total} value={money(totals.total)} strong />
            </dl>
            <div className="flex flex-col gap-3">
              <Link href={checkoutHref} className={cn(buttonVariants({ size: "xl" }), bigButton, "bg-accent text-accent-foreground hover:bg-accent/90")}>
                {labels.checkout}
              </Link>
              <Link href={shopHref} className="text-center text-xs font-bold tracking-widest uppercase underline decoration-2 underline-offset-4 hover:decoration-4">
                {labels.continueShopping}
              </Link>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function Row({ label, value, strong, muted }: { label: string; value: string; strong?: boolean; muted?: boolean }) {
  return (
    <div className={cn("flex justify-between gap-4", strong && "items-baseline text-base font-extrabold uppercase", muted && "text-inverse-foreground/70")}>
      <dt>{label}</dt>
      <dd className={cn("text-end tabular-nums", strong && "font-heading text-4xl tracking-tight")}>{value}</dd>
    </div>
  );
}
