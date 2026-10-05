// prototype/evals/diagnosis.eval.ts
// Masked pre-RCA diagnosis on the five assets, at the first diagnosable week and at the first ALARM week.
// Gold labels were committed before this script first ran (src/data/diagnosis_gold.json). Report as "x of n (internal)".
import { readFileSync, writeFileSync } from "node:fs";
import { requireKey, saveRun, snap } from "./lib.js";
import { runDiagnosis } from "../server/ai/diagnosisAgent.js";
import { evidenceGuard } from "../server/ai/evidenceGuard.js";
import { firstDiagnosableWeek } from "../src/domain/diagnosis.js";
import { toGuardSentences, type RecordedDiagnosis } from "../src/domain/diagnosisBrief.js";

requireKey();
const gold = JSON.parse(readFileSync("src/data/diagnosis_gold.json", "utf8")).cases as Record<string, { mode: string }>;
const runs: Record<string, unknown>[] = [];
const recorded: Record<string, RecordedDiagnosis> = {};

for (const eq of snap.equipment) {
  const first = firstDiagnosableWeek(eq);
  if (first === null) continue;
  const alarm = eq.history.findIndex((h) => h.status === "ALARM");
  for (const week of [...new Set([first, Math.max(first, alarm)])]) {
    const out = await runDiagnosis({ snap, tag: eq.tag, week });
    const guard = await evidenceGuard({ sentences: toGuardSentences(out.brief), abstentions: out.brief.abstentions, follow_ups: [] }, out.ledger);
    const order = out.brief.hypotheses.map((h) => h.mode_id);
    const g = gold[eq.tag].mode;
    const counts = guard.results.reduce((m, r) => ({ ...m, [r.status]: (m[r.status] ?? 0) + 1 }), {} as Record<string, number>);
    runs.push({
      tag: eq.tag, week: week + 1, date: eq.history[week].date, status: eq.history[week].status,
      matcher_leading: out.differential.leading, agent_order: order,
      agent_top1: order[0] === g, agent_top3: order.slice(0, 3).includes(g), check_separates_gold: out.brief.next_check.separates.includes(g),
      guard: counts, invalid_mode_ids: out.invalidModeIds, leakage: out.hidden.filter((s) => out.prompt.includes(s)), usage: out.usage, model: out.model,
    });
    recorded[`${eq.tag}|${week}`] = { brief: out.brief, guard: guard.results, model: out.model, run_at: new Date().toISOString(), week };
    console.log(`${eq.tag} w${week + 1}: agent ${order.join(" > ")} | gold ${g} | guard ${JSON.stringify(counts)}`);
  }
}
const n = runs.length;
const k = (f: string) => runs.filter((r) => r[f] === true).length;
const summary = { n, agent_top1: k("agent_top1"), agent_top3: k("agent_top3"), check_separates_gold: k("check_separates_gold"),
  leakage_runs: runs.filter((r) => (r.leakage as string[]).length).length };
const dir = saveRun("diagnosis_masked", { summary, runs, note: "Internal. Masked pre-RCA context; gold pre-registered; library written after reading the RCAs." });
writeFileSync("src/data/diagnosis_runs.json", JSON.stringify(recorded, null, 1));
console.log(`\nTop-1 ${summary.agent_top1} of ${n}, top-3 ${summary.agent_top3} of ${n}, check separates gold ${summary.check_separates_gold} of ${n} (internal). Saved ${dir}`);
if (summary.leakage_runs) { console.error("LEAKAGE: target text reached the prompt. Results are invalid."); process.exit(1); }
