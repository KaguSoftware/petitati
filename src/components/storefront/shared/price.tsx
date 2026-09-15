import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

export function Price({
  amount,
  compareAt,
  currency,
  locale,
  from,
  className,
}: {
  amount: number;
  compareAt?: number | null;
  currency: string;
  locale: string;
  /** label shown before a starting price when variants sell at different prices, e.g. "From" */
  from?: string;
  className?: string;
}) {
  const onSale = compareAt !== null && compareAt !== undefined && compareAt > amount;
  return (
    <span className={cn("inline-flex flex-wrap items-baseline gap-x-2", className)}>
      {from && <span className="text-[0.7em] font-normal text-muted-foreground">{from}</span>}
      <span className={cn("font-semibold tabular-nums", onSale && "text-primary")}>
        {formatMoney(amount, currency, locale)}
      </span>
      {onSale && (
        <s className="text-sm text-muted-foreground tabular-nums">{formatMoney(compareAt, currency, locale)}</s>
      )}
    </span>
  );
}
