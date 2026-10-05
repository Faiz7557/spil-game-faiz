import { z } from "zod";
import { requireUser } from "../../../server/auth.js";
import { db } from "../../../server/db.js";
import { HttpError, json, route } from "../../../server/http.js";
import { appendEvent, loadAction } from "../../../server/repo/actions.js";

const Body = z.object({ actionId: z.string().uuid(), evidenceId: z.string().uuid(), reason: z.string().min(3).max(500) });

export const POST = route(async (req) => {
  const user = await requireUser(req, "action.write");
  const b = Body.parse(await req.json());
  const { action } = await loadAction(b.actionId, user);
  if (!["execution_reported", "evidence_submitted"].includes(action.state)) throw new HttpError(409, "Evidence is locked once the action is sent for verification.");
  const item = action.evidence.find((e) => e.id === b.evidenceId);
  if (!item) throw new HttpError(404, "Evidence not found on this action.");
  // The file stays in Storage (the review log references it); only the link to the action is removed.
  await db().from("action_evidence").delete().eq("id", item.id);
  await appendEvent({ actor: user.id, type: "action", subject: action.id, from: action.state, to: action.state, decision: "Evidence removed", reason: `${item.label}: ${b.reason}`, refs: [item.id] });
  return json({ ok: true });
});
