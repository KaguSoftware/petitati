import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env } from "@/lib/env";
import { DB_TIMEOUT_MS, withTimeout } from "@/lib/http/timeout-fetch";

/**
 * Cookie-bound Supabase client for Server Components, Server Actions and Route Handlers.
 * Runs as the signed-in user (or anon) so RLS applies. Reads cookies → dynamic; keep it out of
 * "use cache" scopes.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient(env.supabaseUrl(), env.supabaseAnonKey(), {
    // Bounds PostgREST *and* the auth token refresh that runs on the proxy hot path.
    global: { fetch: withTimeout(DB_TIMEOUT_MS) },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component: cookies are read-only there. The proxy refreshes
          // sessions, so this is safe to ignore.
        }
      },
    },
  });
}
