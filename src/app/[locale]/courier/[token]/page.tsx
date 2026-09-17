import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { isLocale } from "@/i18n/config";
import { courierContext, getCourierStops } from "@/lib/courier/context";
import { deliveryFromSettings } from "@/lib/delivery/settings";
import { themeToCssVars } from "@/lib/theme/types";
import { fontStack } from "@/lib/theme/fonts";
import { StoreFontVars } from "@/components/storefront/store-font-vars";
import { formatMoney } from "@/lib/money";
import { StopList } from "@/components/courier/stop-list";
import { StartRunButton } from "@/components/courier/start-run-button";
import { dateTimeFormat } from "@/lib/number";

type Props = PageProps<"/[locale]/courier/[token]">;

export default function CourierPage({ params }: Props) {
  return (
    <Suspense fallback={<p className="p-6 text-muted-foreground">…</p>}>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({ params }: { params: Props["params"] }) {
  const { locale, token } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);

  const ctx = await courierContext(token);
  if (!ctx) notFound();

  const settings = deliveryFromSettings(ctx.store.settings);
  const [t, stops] = await Promise.all([getTranslations("courier"), getCourierStops(ctx, settings.attemptLimit)]);

  const open = stops.filter((s) => s.state === "assigned" || s.state === "out_for_delivery");
  const done = stops.filter((s) => s.state !== "assigned" && s.state !== "out_for_delivery");
  const toCollect = open.reduce((sum, s) => sum + s.cash_expected, 0);
  const money = (n: number) => formatMoney(n, ctx.store.currency, locale);
  const canStart = open.some((s) => s.state === "assigned");

  return (
    <main data-store-theme style={themeToCssVars(ctx.store.theme, locale) as React.CSSProperties} className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4 pb-16 font-sans">
      <StoreFontVars body={fontStack(ctx.store.theme.fonts.body, locale)} heading={fontStack(ctx.store.theme.fonts.heading, locale)} />
      <header className="flex flex-col gap-3 rounded-xl border bg-card p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm text-muted-foreground">{ctx.store.name}</p>
            <h1 className="truncate font-heading text-xl font-semibold tracking-tight">{ctx.courier.name}</h1>
          </div>
          <p className="shrink-0 text-sm text-muted-foreground tabular-nums">
            {dateTimeFormat(locale, { weekday: "short", day: "numeric", month: "short" }).format(new Date())}
          </p>
        </div>
        <dl className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-muted/60 p-2">
            <dt className="text-xs text-muted-foreground">{t("stopsLeft")}</dt>
            <dd className="text-lg font-semibold tabular-nums">{open.length}</dd>
          </div>
          <div className="rounded-lg bg-muted/60 p-2">
            <dt className="text-xs text-muted-foreground">{t("doneToday")}</dt>
            <dd className="text-lg font-semibold tabular-nums">{done.length}</dd>
          </div>
          <div className="rounded-lg bg-muted/60 p-2">
            <dt className="text-xs text-muted-foreground">{t("toCollect")}</dt>
            <dd className="text-lg font-semibold tabular-nums">{money(toCollect)}</dd>
          </div>
        </dl>
        {canStart && <StartRunButton token={token} label={t("startRun")} />}
      </header>

      <StopList token={token} open={open} done={done} locale={locale} codEnabled={settings.codEnabled} />
    </main>
  );
}
