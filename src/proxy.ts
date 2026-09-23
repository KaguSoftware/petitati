import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { defaultLocale, isLocale } from "@/i18n/config";
import { env } from "@/lib/env";
import { DB_TIMEOUT_MS, withTimeout } from "@/lib/http/timeout-fetch";
import { storeFromPath, tenantHintFromHost } from "@/lib/tenant/resolve";
import { lookupDefaultLocale, lookupSlugByHostname } from "@/lib/tenant/proxy-lookup";

/**
 * Request pipeline:
 *   1. resolve the tenant (custom domain → subdomain → default)
 *   2. ensure a locale prefix (redirect bare paths to the store's default locale)
 *   3. refresh the Supabase session cookie when one exists; guard /admin
 *   4. rewrite storefront paths to /<locale>/s/<slug>/... (admin paths are left alone)
 */
export const config = {
  matcher: ["/((?!api/|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.[a-z0-9]+$).*)"],
};

// Never rewritten into a store. `/courier` is here because a courier link carries its own tenant:
// the token resolves the store, so the link works on any host the shop is served from.
const SHARED_PREFIXES = ["/admin", "/auth", "/preview", "/courier"];

export async function proxy(request: NextRequest) {
  const url = request.nextUrl;
  const pathname = url.pathname;
  const segments = pathname.split("/");
  const first = segments[1] ?? "";

  // ---- 1. tenant ----
  const hint = tenantHintFromHost(request.headers.get("host"), env.rootDomain());
  let slug = env.defaultStoreSlug();
  if (hint.kind === "subdomain") slug = hint.slug;
  else if (hint.kind === "custom-domain") {
    slug = (await lookupSlugByHostname(hint.hostname)) ?? env.defaultStoreSlug();
  }

  // Email links (sign-up confirm, password reset, staff invites) land on /auth/callback, a route
  // handler outside [locale]. Prefixing it with a locale sent every one of them to a 404.
  if (first === "auth") return NextResponse.next();

  // ---- 2. locale ----
  if (!isLocale(first)) {
    const cookieLocale = request.cookies.get("NEXT_LOCALE")?.value;
    const locale =
      (cookieLocale && isLocale(cookieLocale) ? cookieLocale : null) ??
      (await lookupDefaultLocale(slug)) ??
      defaultLocale;
    const target = url.clone();
    target.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
    return NextResponse.redirect(target);
  }
  const locale = first;
  const rest = "/" + segments.slice(2).join("/");

  // ---- 3. session + admin guard ----
  const isShared = SHARED_PREFIXES.some((p) => rest === p || rest.startsWith(`${p}/`));
  // Forwarded as REQUEST headers: src/i18n/request.ts falls back to x-locale when a dynamic
  // render happens below a page that never called setRequestLocale.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-store-slug", slug);
  requestHeaders.set("x-locale", locale);
  const response = isShared ? NextResponse.next({ request: { headers: requestHeaders } }) : rewriteToStore(url, locale, slug, rest, requestHeaders);
  response.headers.set("x-store-slug", slug);
  response.headers.set("x-locale", locale);

  const hasAuthCookie = request.cookies.getAll().some((c) => c.name.startsWith("sb-"));
  const needsAuth = rest === "/admin" || rest.startsWith("/admin/") || rest.startsWith("/account") || rest.startsWith("/complete-profile");
  if (hasAuthCookie || needsAuth) {
    const user = await refreshSession(request, response);
    if (needsAuth && !user) {
      const target = url.clone();
      target.pathname = `/${locale}/sign-in`;
      target.search = `?next=${encodeURIComponent(pathname + url.search)}`;
      return NextResponse.redirect(target);
    }
  }
  return response;
}

function rewriteToStore(url: URL, locale: string, slug: string, rest: string, headers: Headers) {
  // Path mode (/en/s/<slug>/...) passes through untouched.
  if (storeFromPath(rest)) return NextResponse.next({ request: { headers } });
  const target = new URL(url);
  target.pathname = `/${locale}/s/${slug}${rest === "/" ? "" : rest}`;
  return NextResponse.rewrite(target, { request: { headers } });
}

async function refreshSession(request: NextRequest, response: NextResponse) {
  const supabase = createServerClient(env.supabaseUrl(), env.supabaseAnonKey(), {
    global: { fetch: withTimeout(DB_TIMEOUT_MS) },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });
  // getClaims() verifies the access token locally against the project's cached JWKS (ES256), so
  // the common case costs no network; an expired token is refreshed through the cookie adapter.
  const { data } = await supabase.auth.getClaims();
  return data?.claims ? { id: data.claims.sub } : null;
}
