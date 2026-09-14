/**
 * Central place for environment access. Import from here instead of touching process.env so the
 * list of variables the app relies on stays discoverable (see .env.example).
 */
function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required environment variable ${name}`);
  return v;
}

export const env = {
  supabaseUrl: () => required("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseAnonKey: () => required("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  supabaseServiceRoleKey: () => required("SUPABASE_SERVICE_ROLE_KEY"),
  /** e.g. "petitati.com" or "localhost:3000". Subdomains of this resolve to stores. */
  rootDomain: () => process.env.ROOT_DOMAIN ?? "localhost:3000",
  defaultStoreSlug: () => process.env.DEFAULT_STORE_SLUG ?? "default",
  appUrl: () => process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  resendApiKey: () => process.env.RESEND_API_KEY,
  emailFromFallback: () => process.env.EMAIL_FROM_FALLBACK ?? "noreply@example.com",
  /** Shared secret for POST /api/internal/revalidate-catalog (supplier import scripts). Unset = endpoint disabled. */
  catalogRevalidateSecret: () => process.env.CATALOG_REVALIDATE_SECRET,
};
