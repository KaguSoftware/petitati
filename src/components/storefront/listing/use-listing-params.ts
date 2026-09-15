"use client";

import { useCallback, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { FILTER_KEYS } from "./listing-params";

/**
 * Client side of the listing URL contract (see listing-params.ts). Every write goes through
 * `router.replace` with `scroll: false`, so ticking a brand re-renders the results in place, and
 * every write drops `page`. Must render under a Suspense boundary (`useSearchParams`).
 */
export function useListingParams() {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const [pending, start] = useTransition();

  const navigate = useCallback(
    (next: URLSearchParams) => {
      const qs = next.toString();
      start(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
    },
    [pathname, router],
  );

  /** Set (string) or remove (null) keys; always back to page 1. */
  const set = useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v) next.set(k, v);
        else next.delete(k);
      }
      next.delete("page");
      navigate(next);
    },
    [params, navigate],
  );

  /** Drop every filter; the search term and the sort stay (they are not filters). */
  const clearAll = useCallback(() => {
    const next = new URLSearchParams(params.toString());
    for (const k of FILTER_KEYS) if (k !== "q") next.delete(k);
    next.delete("page");
    navigate(next);
  }, [params, navigate]);

  return { params, set, clearAll, pending };
}
