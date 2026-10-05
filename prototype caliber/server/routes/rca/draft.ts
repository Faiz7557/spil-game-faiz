import { z } from "zod";
import { requireUser } from "../../../server/auth.js";
import { db, publishedSnapshotId } from "../../../server/db.js";
import { HttpError, json, route } from "../../../server/http.js";
import { draftRca } from "../../../server/ai/rcaDraft.js";
import { assertBudget, logAiRun } from "../../../server/ai/runLog.js";

const Body = z.object({ incidentId: z.string().regex(/^L3-\d+$/) });

/** Stored drafts for the published snapshot. */
export const GET = route(async (req) => {
  const user = await requireUser(req, "read");
  const sid = await publishedSnapshotId();
  // Team members see team drafts; a guest sees team drafts plus their own sandbox drafts (own ones sort last and win).
  let q = db().from("rca_drafts").select("id, incident_id, draft, status, created_at, is_demo").eq("snapshot_id", sid);
  q = user.isDemo ? q.or(`is_demo.eq.false,created_by.eq.${user.id}`) : q.eq("is_demo", false);
  const { data, error } = await q.order("is_demo").order("created_at");
  if (error) throw error;
  return json(data ?? []);
});

export const POST = route(async (req) => {
  const user = await requireUser(req, "ai.run");
  const { incidentId } = Body.parse(await req.json());
  const reservation = await assertBudget(user, "rca_draft", incidentId);
  const sid = await publishedSnapshotId();
  const { data: all } = await db().from("incidents").select("*").eq("snapshot_id", sid);
  const target = all?.find((i) => i.id === incidentId);
  if (!target) throw new HttpError(404, "Record not found.");
  const started = Date.now();
  const { draft, usage } = await draftRca(target, all!);
  const runId = await logAiRun({ reservation, feature: "rca_draft", ref: incidentId, userId: user.id, usage, startedAt: started, stopReason: "end_turn", validation: { similar: draft.similar.length, checklist: draft.checklist.length } });
  const { data, error } = await db().from("rca_drafts").insert({ snapshot_id: sid, incident_id: incidentId, draft, ai_run_id: runId, is_demo: user.isDemo, created_by: user.id }).select("id").single();
  if (error) throw error;
  return json({ id: data.id, draft, status: "draft" });
});
