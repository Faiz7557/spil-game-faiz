import { Resend } from "resend";
import { env } from "../env.js";

export async function sendEmail(to: string, subject: string, html: string) {
  const { RESEND_API_KEY, NOTIFY_FROM } = env();
  if (!RESEND_API_KEY || !NOTIFY_FROM) return { skipped: true };
  const { error } = await new Resend(RESEND_API_KEY).emails.send({ from: NOTIFY_FROM, to, subject, html });
  if (error) throw new Error(error.message);
  return { skipped: false };
}
