import { z } from "zod";
import { requireUser } from "../../server/auth.js";
import { db } from "../../server/db.js";
import { HttpError, route, sse } from "../../server/http.js";
import { runCopilot } from "../../server/ai/copilot.js";
import { evidenceGuard } from "../../server/ai/evidenceGuard.js";
import { addUsage, assertBudget, logAiRun } from "../../server/ai/runLog.js";
import { loadPublishedSnapshot } from "../../server/repo/snapshot.js";

const Body = z.object({ question: z.string().trim().min(3).max(1000), caseTag: z.string().max(20).optional(), threadId: z.string().uuid().optional() });

export const POST = route(async (req) => {
  const user = await requireUser(req, "copilot");
  const b = Body.parse(await req.json());
  const reservation = await assertBudget(user, "copilot", b.caseTag);
  if (b.threadId) {
    const { data: t } = await db().from("copilot_threads").select("user_id").eq("id", b.threadId).maybeSingle();
    if (!t || t.user_id !== user.id) throw new HttpError(404, "Conversation not found.");
  }
  const snap = await loadPublishedSnapshot();
  return sse(async (send) => {
    const started = Date.now();
    const out = await runCopilot({ question: b.question, caseTag: b.caseTag, snap, onEvent: (e, d) => send(e, d) });
    send("answer", out.answer);
    send("excerpts", Object.fromEntries(out.ledger.entries()));
    const guard = await evidenceGuard(out.answer, out.ledger);
    send("guard", guard.results);
    const usage = guard.usage ? addUsage(out.usage, guard.usage) : out.usage;
    const counts = guard.results.reduce((m, r) => ({ ...m, [r.status]: (m[r.status] ?? 0) + 1 }), {} as Record<string, number>);
    const runId = await logAiRun({ reservation, feature: "copilot", ref: b.caseTag, userId: user.id, usage, startedAt: started, stopReason: "end_turn", validation: { turns: out.turns, guard: counts } });
    const threadId = b.threadId ?? (await db().from("copilot_threads").insert({ user_id: user.id, case_tag: b.caseTag ?? null }).select("id").single()).data?.id;
    if (threadId) await db().from("copilot_messages").insert([
      { thread_id: threadId, role: "user", question: b.question },
      { thread_id: threadId, role: "assistant", answer: out.answer, guard: guard.results, ai_run_id: runId },
    ]);
    send("done", { threadId, runId });
  });
});
