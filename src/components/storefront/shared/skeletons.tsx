import { PageShell } from "./page-shell";

/**
 * Loading shapes for the storefront's highest-intent pages.
 *
 * Cart, checkout, the order receipt and /deliver all used to share one fallback — a literal `…`
 * in muted grey — while /shop and /account already had real skeletons. These reuse the same idea
 * as `ResultsSkeleton`: block out the layout so the page does not jump when the data lands.
 *
 * All are `aria-hidden`: they are a picture of a page, not content. The surrounding Suspense
 * boundary is what tells assistive tech something is loading.
 */

const pulse = "animate-pulse rounded bg-muted";

function Line({ className = "w-full" }: { className?: string }) {
  return <div className={`h-4 ${pulse} ${className}`} />;
}

function Block({ className = "" }: { className?: string }) {
  return <div className={`${pulse} ${className}`} />;
}

/** Heading + a stack of lines. The generic fallback for any content page. */
export function PageSkeleton({ width = "wide", lines = 4 }: { width?: "wide" | "narrow"; lines?: number }) {
  return (
    <PageShell width={width}>
      <div aria-hidden className="flex flex-col gap-6">
        <Block className="h-9 w-56 rounded-lg" />
        <div className="flex flex-col gap-3">
          {Array.from({ length: lines }, (_, i) => (
            <Line key={i} className={i === lines - 1 ? "w-2/3" : "w-full"} />
          ))}
        </div>
      </div>
    </PageShell>
  );
}

/** Line items beside a totals card — the cart's two-column shape. */
export function CartSkeleton() {
  return (
    <PageShell>
      <div aria-hidden className="flex flex-col gap-6 @desktop:gap-8">
        <Block className="h-9 w-40 rounded-lg" />
        <div className="grid gap-8 @desktop:grid-cols-[1fr_20rem] @desktop:items-start">
          <div className="flex flex-col gap-4">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="flex items-center gap-4 border-b pb-4">
                <Block className="size-20 shrink-0 rounded-xl" />
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <Line className="w-2/3" />
                  <Line className="h-3 w-1/4" />
                </div>
                <Block className="h-11 w-28 shrink-0 rounded-lg" />
              </div>
            ))}
          </div>
          <Block className="h-64 rounded-2xl" />
        </div>
      </div>
    </PageShell>
  );
}

/** Form column beside the order summary. Summary first on phones, matching the real page. */
export function CheckoutSkeleton() {
  return (
    <PageShell>
      <div aria-hidden className="flex flex-col gap-6 @desktop:gap-8">
        <Block className="h-9 w-48 rounded-lg" />
        <div className="grid gap-8 @desktop:grid-cols-[1fr_20rem] @desktop:items-start">
          <div className="order-2 flex flex-col gap-7 @desktop:order-1">
            {Array.from({ length: 3 }, (_, section) => (
              <div key={section} className="flex flex-col gap-3">
                <Line className="w-32" />
                {Array.from({ length: 2 }, (_, i) => (
                  <Block key={i} className="h-11 rounded-lg" />
                ))}
              </div>
            ))}
            <Block className="h-12 rounded-lg" />
          </div>
          <Block className="order-1 h-56 rounded-2xl @desktop:order-2" />
        </div>
      </div>
    </PageShell>
  );
}

/** Narrow receipt: status strip, line items, totals. */
export function OrderSkeleton() {
  return (
    <PageShell width="narrow">
      <div aria-hidden className="flex flex-col gap-6">
        <Block className="h-9 w-64 rounded-lg" />
        <Block className="h-20 rounded-2xl" />
        <div className="flex flex-col gap-4">
          {Array.from({ length: 2 }, (_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Block className="size-16 shrink-0 rounded-lg" />
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <Line className="w-1/2" />
                <Line className="h-3 w-1/4" />
              </div>
            </div>
          ))}
        </div>
        <Block className="h-40 rounded-2xl" />
      </div>
    </PageShell>
  );
}

/** The listing's shape — sidebar (desktop), toolbar row and a 2/3/4-up grid — so the page does not jump when the results land. */
export function ResultsSkeleton() {
  return (
    <div className="grid gap-6 @desktop:grid-cols-[14rem_minmax(0,1fr)] @desktop:gap-8 @wide:grid-cols-[16rem_minmax(0,1fr)] @wide:gap-10" aria-hidden>
      <div className="hidden flex-col gap-3 @desktop:flex">
        <Line className="h-4 w-1/2" />
        {Array.from({ length: 6 }, (_, i) => (
          <Line key={i} className="h-3" />
        ))}
      </div>
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <Line className="h-4 w-24" />
          <Block className="h-10 w-40 rounded-lg" />
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-7 @tablet:grid-cols-3 @tablet:gap-x-5 @desktop:grid-cols-4 @desktop:gap-x-6">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="flex flex-col gap-3">
              <Block className="aspect-square rounded-xl" />
              <Line className="w-3/4" />
              <Line className="w-1/3" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Gallery beside the buy panel — the product page's two-column shape. */
export function ProductSkeleton() {
  return (
    <PageShell>
      <div aria-hidden className="flex flex-col gap-6">
        <Line className="h-3 w-32" />
        <div className="grid gap-8 @tablet:grid-cols-2 @tablet:gap-10 @desktop:grid-cols-[1.1fr_1fr] @desktop:gap-14">
          <div className="flex flex-col gap-3">
            <Block className="aspect-square rounded-2xl" />
            <div className="flex gap-3">
              {Array.from({ length: 3 }, (_, i) => (
                <Block key={i} className="size-20 rounded-lg" />
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2.5">
              <Line className="h-3 w-20" />
              <Block className="h-9 w-3/4 rounded-lg" />
              <Line className="w-2/3" />
            </div>
            <Block className="h-44 rounded-2xl" />
          </div>
        </div>
      </div>
    </PageShell>
  );
}
