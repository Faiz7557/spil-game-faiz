import { timingSafeEqual } from "node:crypto";
import { db } from "../../../server/db.js";
import { env } from "../../../server/env.js";
import { HttpError, json, route } from "../../../server/http.js";
import { sendEmail } from "../../../server/integrations/email.js";
import { dueNotices } from "../../../src/domain/notify.js";

const SUBJECT = { due_soon: "is due in 3 days or less", overdue: "is overdue", awaiting_review: "is waiting for verification" } as const;
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

function authorized(req: Request) {
  const secret = env().CRON_SECRET;
  if (!secret) return false; // never accept "Bearer undefined"
  const got = Buffer.from(req.headers.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${secret}`);
  return got.length === want.length && timingSafeEqual(got, want);
}

/** Daily (Vercel Cron, 06:00 WIB). Vercel sends `Authorization: Bearer $CRON_SECRET` when the variable is set. */
export const GET = route(async (req) => {
  if (!authorized(req)) throw new HttpError(401, "Unauthorized");
  const today = new Date().toISOString().slice(0, 10);
  const { data: acts } = await db().from("actions").select("id, title, state, due, created_by, case_tag").eq("is_demo", false);
  const notices = dueNotices(acts ?? [], today);
  const base = process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "";
  let sent = 0, skipped = 0;
  for (const n of notices) {
    const a = acts!.find((x) => x.id === n.id)!;
    const { data: u } = await db().auth.admin.getUserById(a.created_by);
    if (!u.user?.email) { skipped++; continue; }
    const { error } = await db().from("notifications").insert({ action_id: a.id, kind: n.kind, sent_to: u.user.email });
    if (error) { skipped++; continue; } // unique (action, kind, day): already sent today
    const r = await sendEmail(u.user.email, `[PlantPulse] ${a.case_tag}: "${a.title.slice(0, 60)}" ${SUBJECT[n.kind]}`,
      `<p>${esc(a.title)}</p><p>State: ${esc(a.state)}. Due: ${a.due ?? "not set"}.</p>${base ? `<p><a href="${base}/#/actions/${encodeURIComponent(a.case_tag)}">Open in PlantPulse</a></p>` : ""}`);
    if (r.skipped) skipped++; else sent++;
  }
  return json({ notices: notices.length, sent, skipped });
});
