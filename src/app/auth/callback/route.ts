import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { defaultLocale, isLocale } from "@/i18n/config";

const OTP_TYPES: EmailOtpType[] = ["signup", "invite", "magiclink", "recovery", "email_change", "email"];

/**
 * OAuth / magic-link / password-reset / invite landing. Three shapes arrive here:
 *   ?code=…                PKCE (OAuth, links requested from this app) → exchange for a session
 *   ?token_hash=…&type=…   email templates that link straight to the app → verify the OTP
 *   neither                Supabase's implicit flow (admin invites): the session is in the URL
 *                          #fragment, which never reaches the server. Browsers keep the fragment
 *                          across a redirect, so hand off to a page that reads it client-side.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const rawNext = url.searchParams.get("next") ?? "/";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";
  const firstSegment = next.split("/")[1] ?? "";
  const locale = isLocale(firstSegment) ? firstSegment : defaultLocale;

  if (!code && !tokenHash) {
    return NextResponse.redirect(new URL(`/${locale}/finish-sign-in?next=${encodeURIComponent(next)}`, url.origin));
  }

  const supabase = await createSupabaseServerClient();
  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : type && OTP_TYPES.includes(type)
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash!, type })
      : { error: new Error("bad otp type") };
  if (!error) {
    // No phone yet (Google sign-ins, invited staff): the one-time completion screen first.
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from("profiles").select("phone").eq("id", user.id).maybeSingle<{ phone: string | null }>();
      if (!profile?.phone && !next.includes("/complete-profile")) {
        return NextResponse.redirect(new URL(`/${locale}/complete-profile?next=${encodeURIComponent(next)}`, url.origin));
      }
    }
    return NextResponse.redirect(new URL(next, url.origin));
  }
  return NextResponse.redirect(new URL(`/${locale}/sign-in?error=oauth`, url.origin));
}
