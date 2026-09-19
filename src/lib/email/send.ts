import "server-only";

import { after } from "next/server";
import { Resend } from "resend";
import { env } from "@/lib/env";
import { EMAIL_TIMEOUT_MS, deadline } from "@/lib/http/timeout-fetch";

export interface SendEmailInput {
  to: string;
  from?: string | null;
  subject: string;
  react: React.ReactElement;
}

/**
 * Sends through Resend when configured; otherwise logs so local dev never blocks on email.
 * Never throws — a dropped notification must not fail the mutation that triggered it.
 *
 * Bounded by `deadline` because the Resend SDK accepts no AbortSignal of its own: without it a
 * hung mail API kept the serverless invocation alive until the platform killed it.
 */
export async function sendEmail(input: SendEmailInput): Promise<void> {
  const from = input.from ?? env.emailFromFallback();
  const key = env.resendApiKey();
  if (!key) {
    console.info(`[email:dev] to=${input.to} from=${from} subject="${input.subject}"`);
    return;
  }
  try {
    const resend = new Resend(key);
    const { error } = await deadline(
      resend.emails.send({ from, to: input.to, subject: input.subject, react: input.react }),
      EMAIL_TIMEOUT_MS,
      "resend.emails.send",
    );
    if (error) console.error("[email] send failed", error);
  } catch (error) {
    console.error("[email] send failed", error);
  }
}

/**
 * The same send, scheduled to run AFTER the response is flushed.
 *
 * This is what every notification should use. Awaiting Resend inline put an email round trip on
 * the checkout critical path — the shopper watched a spinner while a mail server thought about it —
 * and on every order status change in the admin. `after` still runs when the action redirects or
 * throws, so nothing is lost by deferring it.
 */
export function queueEmail(input: SendEmailInput): void {
  after(() => sendEmail(input));
}
