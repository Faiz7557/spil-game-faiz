// prototype/server/routes/diagnosis/run.ts
import { z } from "zod";
import { requireUser } from "../../../server/auth.js";
import { HttpError, json, route } from "../../../server/http.js";
import { runDiagnosis } from "../../../server/ai/diagnosisAgent.js";
import { evidenceGuard } from "../../../server/ai/evidenceGuard.js";
import { addUsage, assertBudget, logAiRun } from "../../../server/ai/runLog.js";
import { loadPublishedSnapshot } from "../../../server/repo/snapshot.js";
import { diagnose, firstDiagnosableWeek } from "../../../src/domain/diagnosis.js";
import { toGuardSentences } from "../../../src/domain/diagnosisBrief.js";

const Body = z.object({ tag: z.string().max(20), week: z.number().int().min(0).max(60).optional() });

/** Pre-RCA differential for one asset at one week. Uses only data up to that week; the RCA deck is never sent. */
export const POST = route(async (req) => {
  const user = await requireUser(req, "ai.run");
  const b = Body.parse(await req.json());
  const snap = await loadPublishedSnapshot();
  const eq = snap.equipment.find((e) => e.tag === b.tag);
  if (!eq) throw new HttpError(404, "No condition record for that asset.");
  const week = b.week ?? firstDiagnosableWeek(eq);
  if (week === null) throw new HttpError(422, "The condition record never shows enough symptoms to rank causes.");
  const trip = eq.history.findIndex((h) => h.status === "TRIP");
  if (trip >= 0 && week >= trip) throw new HttpError(422, "Pick a week before the trip: the pre-RCA diagnosis only uses data up to the selected week.");
  // Reject before reserving budget: an out-of-range or symptom-free week would fail or spend a call on nothing.
  const pre = week < eq.history.length ? diagnose(eq, week) : null;
  if (!pre || pre.abstain) throw new HttpError(422, pre?.abstain ?? "That week is outside the condition record.");
  const reservation = await assertBudget(user, "diagnosis", b.tag);
  const started = Date.now();
  const out = await runDiagnosis({ snap, tag: b.tag, week });
  const guard = await evidenceGuard({ sentences: toGuardSentences(out.brief), abstentions: out.brief.abstentions, follow_ups: [] }, out.ledger);
  const usage = guard.usage ? addUsage(out.usage, guard.usage) : out.usage;
  const counts = guard.results.reduce((m, r) => ({ ...m, [r.status]: (m[r.status] ?? 0) + 1 }), {} as Record<string, number>);
  await logAiRun({ reservation, model: out.model, feature: "diagnosis", ref: `${b.tag}:w${week + 1}`, userId: user.id, usage, startedAt: started,
    stopReason: "end_turn", validation: { guard: counts, invalid_mode_ids: out.invalidModeIds } });
  return json({ week, differential: out.differential, brief: out.brief, guard: guard.results, excerpts: Object.fromEntries(out.ledger.entries()), model: out.model });
});
