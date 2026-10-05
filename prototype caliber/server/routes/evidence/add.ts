import { z } from "zod";
import { requireUser } from "../../../server/auth.js";
import { db } from "../../../server/db.js";
import { HttpError, json, route } from "../../../server/http.js";
import { appendEvent, loadAction } from "../../../server/repo/actions.js";
import { EVIDENCE_KINDS } from "../../../server/repo/kinds.js";

// Manual evidence record (kind + date + reference, no file). Uploaded files go through upload-url + check.
const Body = z.object({
  actionId: z.string().uuid(), kind: z.enum(EVIDENCE_KINDS),
  label: z.string().min(1).max(200), dated: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const POST = route(async (req) => {
  const user = await requireUser(req, "action.write");
  const b = Body.parse(await req.json());
  const { action } = await loadAction(b.actionId, user);
  if (!["execution_reported", "evidence_submitted"].includes(action.state)) throw new HttpError(409, "Evidence can be added after execution is reported.");
  const { data, error } = await db().from("action_evidence")
    .insert({ action_id: action.id, kind: b.kind, label: b.label, dated: b.dated, added_by: user.id }).select("id").single();
  if (error) throw error;
  await appendEvent({ actor: user.id, type: "action", subject: action.id, from: action.state, to: action.state, decision: "Evidence added (manual)", reason: b.label, refs: [data.id] });
  return json({ id: data.id }, 201);
});
