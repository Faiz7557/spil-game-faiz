import { z } from "zod";
import { guard, STATE_LABEL, STATES } from "../../../src/domain/actionTransitions.js";
import { can, requireUser } from "../../../server/auth.js";
import { db } from "../../../server/db.js";
import { HttpError, json, route } from "../../../server/http.js";
import { allowedPatch, appendEvent, loadAction, toRow } from "../../../server/repo/actions.js";

const Body = z.object({
  actionId: z.string().uuid(),
  to: z.enum(STATES),
  reason: z.string().max(2000).default(""),
  patch: z.object({
    owner: z.string().max(120), due: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal("")), scope: z.string().max(2000),
    dependency: z.string().max(500), rationale: z.string().max(4000), executionNote: z.string().max(2000),
    reviewer: z.string().max(120), effectivenessResult: z.string().max(2000),
  }).partial().default({}),
});

export const POST = route(async (req) => {
  const user = await requireUser(req, "action.write");
  const body = Body.parse(await req.json());
  const { action, createdBy } = await loadAction(body.actionId, user);
  const next = { ...action, ...allowedPatch(action.state, body.patch) };
  if (body.to === "verified") {
    if (!can(user, "action.verify")) throw new HttpError(403, "Only a reviewer or manager can verify.");
    if (!user.isDemo) {
      next.reviewer = user.displayName; // real reviewers sign with their own identity
      // Labels are free text, so independence is checked on account IDs: the verifier must not have created the
      // action, moved it through execution, or attached its evidence.
      const [{ data: acted }, { data: added }] = await Promise.all([
        db().from("review_events").select("id").eq("subject_type", "action").eq("subject_id", action.id).eq("actor_id", user.id)
          .in("to_state", ["in_progress", "execution_reported", "evidence_submitted", "ready_for_verification"]).limit(1),
        db().from("action_evidence").select("id").eq("action_id", action.id).eq("added_by", user.id).limit(1),
      ]);
      if (createdBy === user.id || acted?.length || added?.length)
        throw new HttpError(403, "You created, executed or evidenced this action, so another reviewer must verify it.");
    }
  }
  if (body.to === "rework" && !body.reason.trim()) throw new HttpError(400, "Rework needs a reason.");
  const g = guard(next, body.to);
  if (!g.ok) return json({ ok: false, unmet: g.unmet }, 422);
  // Optimistic concurrency: only move the row if nobody else moved it since we read it.
  const { data: moved, error } = await db().from("actions").update({ ...toRow(next), state: body.to })
    .eq("id", action.id).eq("state", action.state).select("id");
  if (error) throw error;
  if (!moved?.length) throw new HttpError(409, "Someone else changed this action. Reload and try again.");
  await appendEvent({ actor: user.id, type: "action", subject: action.id, from: action.state, to: body.to,
    decision: STATE_LABEL[body.to], reason: body.reason, refs: next.evidence.map((e) => e.id) });
  return json({ ok: true });
});
