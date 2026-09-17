import { BadgeCheck, Check, ClipboardList, House, Package, Truck, X, type LucideIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { Tracking, TrackStepKey } from "@/lib/account/tracking";
import { dateTimeFormat } from "@/lib/number";
import { cn } from "@/lib/utils";

const ICONS: Record<TrackStepKey, LucideIcon> = {
  placed: ClipboardList,
  confirmed: BadgeCheck,
  shipped: Package,
  outForDelivery: Truck,
  delivered: House,
};

/**
 * Where the parcel is right now, as a stepper: a vertical list on phones, one row from tablet up.
 * Reached steps are filled, the step the parcel sits at is ringed, the rest wait in grey. A
 * cancelled or refunded order ends in a red stop after the last step it reached.
 */
export async function OrderTracker({ tracking, locale, className }: { tracking: Tracking; locale: string; className?: string }) {
  const [t, tf] = await Promise.all([getTranslations("order.track"), getTranslations("courier.failureReason")]);
  const when = dateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });
  const day = dateTimeFormat(locale, { dateStyle: "medium" });
  const fmt = (at: string | null) => (at ? when.format(new Date(at)) : null);

  const rows = [
    ...tracking.steps.map((s) => ({ key: s.key as string, label: t(s.key), at: fmt(s.at), state: s.state, icon: ICONS[s.key], stop: false })),
    ...(tracking.stopped ? [{ key: "stop", label: t(tracking.stopped.kind), at: fmt(tracking.stopped.at), state: "current" as const, icon: X, stop: true }] : []),
  ];
  const headline = tracking.stopped ? t(`now.${tracking.stopped.kind}`) : t(`now.${tracking.current}`);

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <p className="text-sm font-medium">{headline}</p>
      <ol className="flex flex-col @tablet:flex-row">
        {rows.map((r, i) => {
          const next = rows[i + 1];
          const lineOn = next && next.state !== "upcoming" && !next.stop;
          const Icon = r.state === "done" ? Check : r.icon;
          return (
            <li key={r.key} className="relative flex gap-3 pb-5 last:pb-0 @tablet:flex-1 @tablet:flex-col @tablet:items-center @tablet:gap-2 @tablet:pb-0 @tablet:text-center">
              {next && (
                <span
                  aria-hidden
                  className={cn(
                    "absolute start-[0.9375rem] top-9 bottom-1 w-0.5 rounded-full @tablet:start-[calc(50%+1.5rem)] @tablet:end-[calc(-50%+1.5rem)] @tablet:top-[0.9375rem] @tablet:bottom-auto @tablet:h-0.5 @tablet:w-auto",
                    lineOn ? "bg-primary" : "bg-border",
                  )}
                />
              )}
              <span
                className={cn(
                  "relative grid size-8 shrink-0 place-items-center rounded-full",
                  r.stop
                    ? "bg-destructive text-white"
                    : r.state === "upcoming"
                      ? "border-2 border-border bg-background text-muted-foreground"
                      : "bg-primary text-primary-foreground",
                  r.state === "current" && (r.stop ? "ring-4 ring-destructive/20" : "ring-4 ring-primary/25"),
                )}
              >
                <Icon aria-hidden className="size-4" />
              </span>
              <span className="flex min-w-0 flex-col pt-1 @tablet:pt-0">
                <span className={cn("text-sm", r.state === "upcoming" ? "text-muted-foreground" : "font-medium", r.stop && "text-destructive")}>
                  {r.label}
                  {r.state === "current" && !r.stop && <span className="sr-only"> · {t("now.label")}</span>}
                </span>
                {r.at && <span className="text-xs text-muted-foreground tabular-nums">{r.at}</span>}
              </span>
            </li>
          );
        })}
      </ol>
      {tracking.failed && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {t("failed", { reason: tf(tracking.failed.reason) })}
          {tracking.failed.retryOn && ` ${t("retryOn", { date: day.format(new Date(tracking.failed.retryOn)) })}`}
        </p>
      )}
    </div>
  );
}
