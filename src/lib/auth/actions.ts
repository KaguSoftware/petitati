"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { normalizePhone, phoneFields } from "@/lib/phone/normalize";
import { getSessionUser } from "./session";

export interface AuthState {
  /** "invalid" (generic), an `auth.errors.*` key, or a raw provider message. */
  error?: string;
  /** `auth.*` message key. */
  message?: string;
  fieldErrors?: Record<string, string>;
}

const credentials = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  next: z.string().optional(),
  locale: z.string().min(2).max(2),
});

/** Only allow same-site relative redirects; never bounce back into the completion screen. */
function safeNext(next: string | undefined, locale: string): string {
  if (next && next.startsWith("/") && !next.startsWith("//") && !/^\/[a-z]{2}\/complete-profile/.test(next)) return next;
  return `/${locale}`;
}

function completeProfilePath(locale: string, next: string) {
  return `/${locale}/complete-profile?next=${encodeURIComponent(next)}`;
}

/** Is `phone` already attached to another profile? Read-only existence check, generic error. */
async function phoneTaken(e164: string, excludeUserId?: string): Promise<boolean> {
  const db = createSupabaseAdminClient();
  let q = db.from("profiles").select("id").eq("phone", e164).limit(1);
  if (excludeUserId) q = q.neq("id", excludeUserId);
  const { data } = await q.maybeSingle<{ id: string }>();
  return !!data;
}

/** Supabase auth error → a key under `auth.errors.*`; unknown causes fall back to a generic one. */
function authErrorKey(code: string | undefined, message: string): string {
  const hay = `${code ?? ""} ${message}`.toLowerCase();
  if (hay.includes("invalid_credentials") || hay.includes("invalid login")) return "credentials";
  if (hay.includes("email_not_confirmed") || hay.includes("email not confirmed")) return "emailNotConfirmed";
  return "invalid";
}

export async function signInAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = credentials.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "invalid" };
  const { email, password, next, locale } = parsed.data;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  // Never hand a raw Supabase string to the UI: it is English, and a Farsi shopper with a wrong
  // password was being shown "Invalid login credentials". Map to keys under `auth.errors.*`.
  if (error) return { error: authErrorKey(error.code, error.message) };

  const target = safeNext(next, locale);
  const { data: profile } = await supabase.from("profiles").select("phone").eq("id", data.user.id).maybeSingle<{ phone: string | null }>();
  if (!profile?.phone) redirect(completeProfilePath(locale, target));
  redirect(target);
}

export async function signUpAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = credentials
    .extend({ full_name: z.string().trim().min(1).max(120), ...phoneFields })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { error: "invalid", fieldErrors };
  }
  const { email, password, full_name, next, locale, phone, phone_country } = parsed.data;

  const normalized = normalizePhone(phone, phone_country);
  if (!normalized) return { error: "phoneInvalid", fieldErrors: { phone: "phoneInvalid" } };
  if (await phoneTaken(normalized.e164)) return { error: "phoneTaken", fieldErrors: { phone: "phoneTaken" } };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // The DB trigger copies phone/phone_country into profiles, even before the first session.
      data: { full_name, phone: normalized.e164, phone_country: normalized.country },
      emailRedirectTo: `${env.appUrl()}/auth/callback?next=${encodeURIComponent(safeNext(next, locale))}`,
    },
  });
  if (error) return { error: error.message };
  if (data.session) redirect(safeNext(next, locale));
  return { message: "checkEmail" };
}

/** One-time screen for users without a phone (Google sign-ins, legacy accounts). */
export async function completeProfileAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = z
    .object({
      locale: z.string().min(2).max(2),
      next: z.string().optional(),
      full_name: z.string().trim().max(120).optional(),
      password: z.string().optional(),
      ...phoneFields,
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "invalid" };
  const { locale, next, full_name, phone, phone_country, password } = parsed.data;

  const user = await getSessionUser();
  if (!user) return { error: "auth" };

  const normalized = normalizePhone(phone, phone_country);
  if (!normalized) return { error: "phoneInvalid", fieldErrors: { phone: "phoneInvalid" } };
  if (await phoneTaken(normalized.e164, user.id)) return { error: "phoneTaken", fieldErrors: { phone: "phoneTaken" } };

  // Cookie client: RLS self-update policy, no service role needed.
  const supabase = await createSupabaseServerClient();
  // Invited staff arrive without a password: they choose one here (the invite mail signed them in once).
  if (await needsPassword()) {
    if (!password || password.length < 8) return { error: "passwordShort", fieldErrors: { password: "passwordShort" } };
    const { error: pwErr } = await supabase.auth.updateUser({ password, data: { password_set: true } });
    if (pwErr) return { error: pwErr.message };
  }
  const patch: Record<string, string> = { phone: normalized.e164, phone_country: normalized.country };
  if (full_name && !user.profile.full_name) patch.full_name = full_name;
  const { error } = await supabase.from("profiles").update(patch).eq("id", user.id);
  if (error) return { error: error.code === "23505" ? "phoneTaken" : "invalid" };

  revalidatePath("/", "layout");
  redirect(safeNext(next, locale));
}

/** An invited account (staff invite mail) that has not chosen a password yet. */
async function needsPassword(): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getClaims();
  const meta = (data?.claims?.user_metadata ?? {}) as { invited_to_store?: string; password_set?: boolean };
  return !!meta.invited_to_store && !meta.password_set;
}

export async function signOutAction(locale: string) {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect(`/${locale}`);
}

export async function requestPasswordResetAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = z
    .object({ email: z.string().email(), locale: z.string() })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "invalid" };
  const supabase = await createSupabaseServerClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${env.appUrl()}/auth/callback?next=${encodeURIComponent(`/${parsed.data.locale}/account/password`)}`,
  });
  // Always report success so the form cannot be used to probe which emails exist.
  return { message: "checkEmail" };
}

export async function signInWithGoogleAction(locale: string, next?: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${env.appUrl()}/auth/callback?next=${encodeURIComponent(safeNext(next, locale))}`,
    },
  });
  if (error || !data.url) redirect(`/${locale}/sign-in?error=oauth`);
  redirect(data.url);
}
