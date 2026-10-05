import { z } from "zod";
import { requireUser } from "../../../server/auth.js";
import { db } from "../../../server/db.js";
import { HttpError, json, route } from "../../../server/http.js";
import { readEvidence, type EvidenceMime } from "../../../server/ai/evidenceCheck.js";
import { assertBudget, logAiRun } from "../../../server/ai/runLog.js";
import { appendEvent, loadAction } from "../../../server/repo/actions.js";

const Body = z.object({ actionId: z.string().uuid(), path: z.string().max(400), label: z.string().max(200) });
const MIME: EvidenceMime[] = ["application/pdf", "image/png", "image/jpeg", "image/webp"];

export const POST = route(async (req) => {
  const user = await requireUser(req, "action.write");
  const b = Body.parse(await req.json());
  if (!b.path.startsWith(`${b.actionId}/`) || b.path.includes("..")) throw new HttpError(400, "File does not belong to this action.");
  const { action } = await loadAction(b.actionId, user);
  if (!["execution_reported", "evidence_submitted"].includes(action.state)) throw new HttpError(409, "Evidence can be added after execution is reported.");
  const reservation = await assertBudget(user, "evidence_reader", action.id);
  const { data: blob, error } = await db().storage.from("evidence").download(b.path);
  if (error || !blob) throw new HttpError(404, "Uploaded file not found.");
  const contentType = blob.type.split(";")[0] as EvidenceMime;
  if (!MIME.includes(contentType)) throw new HttpError(415, "Only PDF, PNG, JPEG or WebP files can be read.");
  const started = Date.now();
  const out = await readEvidence({ bytes: Buffer.from(await blob.arrayBuffer()), contentType }, { caseTag: action.caseTag, actionTitle: action.title, rule: action.rule });
  const runId = await logAiRun({ reservation, feature: "evidence_reader", ref: action.id, userId: user.id, usage: out.usage, startedAt: started, stopReason: "end_turn", validation: { warnings: out.interpreted.warnings.length, document_type: out.check.document_type } });
  const { data: ev, error: e2 } = await db().from("action_evidence").insert({
    action_id: action.id, kind: out.interpreted.suggestedKind, label: b.label || out.check.summary.slice(0, 120),
    dated: out.interpreted.suggestedDate && /^\d{4}-\d{2}-\d{2}$/.test(out.interpreted.suggestedDate) ? out.interpreted.suggestedDate : null,
    storage_path: b.path, ai_check: { ...out.check, warnings: out.interpreted.warnings, ai_run_id: runId }, added_by: user.id,
  }).select("id").single();
  if (e2) throw e2;
  await appendEvent({ actor: user.id, type: "action", subject: action.id, from: action.state, to: action.state, decision: "Evidence added (AI-classified)", reason: out.check.summary, refs: [ev.id] });
  return json({ evidenceId: ev.id, ...out.interpreted, summary: out.check.summary });
});
