import { z } from "zod";
import { requireUser } from "../../../server/auth.js";
import { db } from "../../../server/db.js";
import { HttpError, json, route } from "../../../server/http.js";
import { appendEvent } from "../../../server/repo/actions.js";

const Body = z.object({ draftId: z.string().uuid(), decision: z.enum(["accepted", "rejected"]), reason: z.string().trim().min(3).max(1000) });

/** The RCA lead accepts a draft as a starting point or rejects it. It never changes the register status. */
export const POST = route(async (req) => {
  const user = await requireUser(req, "action.write");
  const b = Body.parse(await req.json());
  const { data: d } = await db().from("rca_drafts").select("id, status, incident_id, is_demo, created_by").eq("id", b.draftId).maybeSingle();
  // A sandbox draft exists only for the guest who made it.
  if (!d || (d.is_demo && d.created_by !== user.id)) throw new HttpError(404, "Draft not found.");
  if (d.status !== "draft") throw new HttpError(409, `Draft already ${d.status}.`);
  // Guests decide their own sandbox drafts; on a team draft their decision is logged but changes nothing.
  const applies = !user.isDemo || d.is_demo;
  if (applies) await db().from("rca_drafts").update({ status: b.decision, reviewed_by: user.id }).eq("id", d.id);
  await appendEvent({ actor: user.id, type: user.isDemo ? "rca_draft_demo" : "rca_draft", subject: d.id, from: "draft", to: b.decision,
    decision: `RCA starter ${b.decision} for ${d.incident_id}`, reason: b.reason });
  return json({ ok: true, applied: applies });
});
