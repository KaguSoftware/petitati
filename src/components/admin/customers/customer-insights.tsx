import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { CustomerInsights } from "@/lib/admin/customers/types";
import { ORDER_STATUSES } from "@/lib/admin/orders/transitions";
import { formatMoney } from "@/lib/money";
import { dateTimeFormat, numberFormat } from "@/lib/number";
import { cn } from "@/lib/utils";
import { StatusBadge } from "../shared/status-badge";

interface Props {
  insights: CustomerInsights;
  currency: string;
  locale: string;
}

function Card({ title, aside, children, className }: { title: React.ReactNode; aside?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("flex min-w-0 flex-col gap-3 rounded-xl border bg-card p-4", className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="text-sm font-medium text-muted-foreground">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

function Row({ label, value }: { label: React.ReactNode; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-end font-medium tabular-nums">{value}</dd>
    </div>
  );
}

/** Round an amount up to a clean axis maximum (1-2-5 steps). */
function niceMax(max: number): number {
  if (max <= 0) return 1;
  const pow = 10 ** Math.floor(Math.log10(max));
  for (const step of [1, 2, 2.5, 5, 10]) if (max <= step * pow) return step * pow;
  return 10 * pow;
}

/** The customer tracker: where their orders stand, what they spend month by month, and what they buy. */
export async function CustomerInsightsCards({ insights: s, currency, locale }: Props) {
  const t = await getTranslations("admin.customers.insights");
  const money = (n: number) => formatMoney(n, currency, locale);
  const num = numberFormat(locale);
  const pct = numberFormat(locale, { style: "percent", maximumFractionDigits: 0 });
  const monthFmt = dateTimeFormat(locale, { month: "short" });
  const monthYear = dateTimeFormat(locale, { month: "long", year: "numeric" });
  const top = niceMax(Math.max(0, ...s.monthly.map((m) => m.total)));
  const yearTotal = s.monthly.reduce((a, m) => a + m.total, 0);
  const yearOrders = s.monthly.reduce((a, m) => a + m.orders, 0);
  const statuses = ORDER_STATUSES.filter((st) => (s.by_status[st] ?? 0) > 0);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Card title={t("statusTitle")}>
        {statuses.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noOrders")}</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {statuses.map((st) => (
              <li key={st} className="flex items-center gap-1.5">
                <StatusBadge kind="order" value={st} />
                <span className="text-sm font-medium tabular-nums">{num.format(s.by_status[st] ?? 0)}</span>
              </li>
            ))}
          </ul>
        )}
        <dl className="mt-auto flex flex-col gap-1.5 border-t pt-3">
          <Row label={t("onTheWay")} value={`${num.format(s.active)} · ${money(s.open_value)}`} />
          <Row label={t("largestOrder")} value={money(s.largest_order)} />
          <Row label={t("refunded")} value={money(s.refunded_total)} />
          <Row label={t("cancelRate")} value={s.orders_total > 0 ? pct.format(s.cancelled / s.orders_total) : "—"} />
        </dl>
      </Card>

      <Card
        title={t("monthlyTitle")}
        aside={
          yearTotal > 0 && (
            <p className="text-sm tabular-nums">
              <span className="font-semibold">{money(yearTotal)}</span>
              <span className="text-muted-foreground"> · {t("ordersCount", { count: yearOrders })}</span>
            </p>
          )
        }
      >
        {yearTotal === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{t("noSpendYear")}</p>
        ) : (
          <figure className="flex flex-col gap-1.5" aria-label={t("monthlyTitle")}>
            <div className="relative h-32">
              {[0, 50, 100].map((p) => (
                <span key={p} aria-hidden className={cn("absolute inset-x-0 border-t", p === 100 ? "border-foreground/25" : "border-border")} style={{ top: `${p}%` }} />
              ))}
              <ol className="absolute inset-0 flex items-end gap-1" dir="ltr">
                {s.monthly.map((m) => {
                  const label = `${monthYear.format(new Date(m.month))}: ${money(m.total)} · ${t("ordersCount", { count: m.orders })}`;
                  return (
                    <li key={m.month} className="group relative flex h-full flex-1 items-end">
                      <span className="sr-only">{label}</span>
                      <span
                        aria-hidden
                        title={label}
                        className={cn("block w-full rounded-t-[4px] transition-colors", m.total > 0 ? "bg-chart-1 group-hover:bg-primary" : "bg-chart-2")}
                        style={{ height: m.total > 0 ? `max(${(m.total / top) * 100}%, 3px)` : "2px" }}
                      />
                    </li>
                  );
                })}
              </ol>
            </div>
            <ol className="flex gap-1 text-[10px] text-muted-foreground" aria-hidden dir="ltr">
              {s.monthly.map((m, i) => (
                <li key={m.month} className={cn("flex-1 truncate text-center", i % 2 === 1 && "max-sm:invisible")}>
                  {monthFmt.format(new Date(m.month))}
                </li>
              ))}
            </ol>
          </figure>
        )}
      </Card>

      <Card title={t("productsTitle")} aside={s.distinct_products > 0 && <span className="text-sm text-muted-foreground">{t("distinctProducts", { count: s.distinct_products })}</span>}>
        {s.top_products.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noProducts")}</p>
        ) : (
          <ol className="flex flex-col divide-y">
            {s.top_products.map((p, i) => (
              <li key={`${p.product_id ?? p.product_name}-${i}`} className="flex items-baseline gap-3 py-1.5 text-sm first:pt-0">
                {p.product_id ? (
                  <Link href={`/admin/products/${p.product_id}`} className="min-w-0 flex-1 truncate font-medium hover:underline">
                    {p.product_name}
                  </Link>
                ) : (
                  <span className="min-w-0 flex-1 truncate font-medium">{p.product_name}</span>
                )}
                <span className="shrink-0 text-muted-foreground tabular-nums">× {num.format(p.units)}</span>
                <span className="w-24 shrink-0 text-end tabular-nums">{money(p.revenue)}</span>
              </li>
            ))}
          </ol>
        )}
        <dl className="mt-auto flex flex-col gap-1.5 border-t pt-3">
          <Row label={t("discounts")} value={money(s.discount_total)} />
          <Row
            label={t("coupons")}
            value={
              s.coupons.length > 0 ? (
                <span className="font-normal" dir="ltr">
                  {s.coupons.join(", ")}
                </span>
              ) : (
                "—"
              )
            }
          />
          <Row label={t("topCity")} value={s.top_city ? `${s.top_city.city} · ${t("ordersCount", { count: s.top_city.orders })}` : "—"} />
        </dl>
      </Card>
    </div>
  );
}
