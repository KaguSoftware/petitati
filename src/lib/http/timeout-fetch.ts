/**
 * Outbound calls with a deadline.
 *
 * Nothing in this app used to bound a third-party call: a hung Resend or PostgREST request held a
 * serverless invocation open until the platform killed it, and the shopper watched a spinner the
 * whole time. Every server-side Supabase client is built with `withTimeout(...)` so a stuck request
 * fails fast and loudly instead of hanging.
 *
 * The caller's own signal is preserved — Supabase passes one for `.abortSignal()` and for auth
 * token refresh, and dropping it would silently break both.
 */
export const DB_TIMEOUT_MS = 15_000;
export const EMAIL_TIMEOUT_MS = 15_000;

export function withTimeout(ms: number): typeof fetch {
  return (input, init) => {
    const deadline = AbortSignal.timeout(ms);
    const signal = init?.signal ? AbortSignal.any([init.signal, deadline]) : deadline;
    return fetch(input, { ...init, signal });
  };
}

/** Rejects if `promise` has not settled within `ms`. For SDKs that accept no signal of their own. */
export async function deadline<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
