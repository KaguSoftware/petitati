import type { DeliveryFailure, DeliveryState, OrderRow } from "@/lib/db/types";

/** The five stops a cash-on-delivery parcel passes, in order. */
export const TRACK_STEPS = ["placed", "confirmed", "shipped", "outForDelivery", "delivered"] as const;
export type TrackStepKey = (typeof TRACK_STEPS)[number];

export interface TrackingAttempt {
  state: DeliveryState;
  dispatchedAt: string | null;
  completedAt: string | null;
  scheduledFor: string | null;
  failureReason: DeliveryFailure | null;
}

/** Everything besides the order row that the tracker reads, loaded in one batch per page. */
export interface TrackingData {
  /** Delivery attempts, oldest first. */
  attempts: TrackingAttempt[];
  /** When staff first moved the order past "awaiting payment" (paid or processing). */
  confirmedAt: string | null;
}

export type TrackOrder = Pick<OrderRow, "status" | "placed_at" | "paid_at" | "shipped_at" | "delivered_at" | "cancelled_at">;

export interface TrackStep {
  key: TrackStepKey;
  state: "done" | "current" | "upcoming";
  at: string | null;
}

export interface Tracking {
  steps: TrackStep[];
  /** The step the parcel is at right now (the last one reached). */
  current: TrackStepKey;
  /** Set when the order will not move any further. */
  stopped: { kind: "cancelled" | "refunded"; at: string | null } | null;
  /** The latest courier run failed and the parcel is waiting for another try. */
  failed: { reason: DeliveryFailure; retryOn: string | null } | null;
}

const OUT = new Set<DeliveryState>(["out_for_delivery", "delivered"]);

/** Where the parcel is, worked out from the order's status and timestamps plus its delivery attempts. */
export function trackOrder(order: TrackOrder, { attempts, confirmedAt }: TrackingData): Tracking {
  const lastOut = [...attempts].reverse().find((a) => OUT.has(a.state));
  const latest = attempts.at(-1);
  const stopped = order.status === "cancelled" || order.status === "refunded";

  let reached: number;
  if (order.status === "delivered" || (order.status === "refunded" && order.delivered_at)) reached = 4;
  else if (latest?.state === "out_for_delivery") reached = 3;
  else if (order.status === "shipped" || (stopped && order.shipped_at)) reached = 2;
  else if (order.status === "paid" || order.status === "processing" || (stopped && (confirmedAt || order.paid_at))) reached = 1;
  else reached = 0;

  const at: Record<TrackStepKey, string | null> = {
    placed: order.placed_at,
    confirmed: confirmedAt ?? order.paid_at,
    shipped: order.shipped_at,
    outForDelivery: lastOut?.dispatchedAt ?? null,
    delivered: order.delivered_at,
  };

  const steps: TrackStep[] = TRACK_STEPS.map((key, i) => ({
    key,
    state: i < reached ? "done" : i === reached && !stopped ? "current" : i === reached ? "done" : "upcoming",
    at: i <= reached ? at[key] : null,
  }));

  // A failed run keeps the order where it was until the courier heads out again; a booked
  // follow-up attempt says when that will be.
  let failedIdx = -1;
  attempts.forEach((a, i) => {
    if (a.state === "failed") failedIdx = i;
  });
  const after = attempts.slice(failedIdx + 1);
  const waiting = failedIdx >= 0 && after.every((a) => a.state === "pending" || a.state === "assigned");

  return {
    steps: stopped ? steps.slice(0, reached + 1) : steps,
    current: TRACK_STEPS[reached],
    stopped: stopped ? { kind: order.status as "cancelled" | "refunded", at: order.cancelled_at } : null,
    failed:
      !stopped && reached < 4 && waiting
        ? { reason: attempts[failedIdx].failureReason ?? "other", retryOn: after.find((a) => a.scheduledFor)?.scheduledFor ?? null }
        : null,
  };
}

/** Orders still on their way, the ones the account page tracks up top. */
export function isActiveOrder(status: OrderRow["status"]): boolean {
  return status === "pending_payment" || status === "paid" || status === "processing" || status === "shipped";
}
