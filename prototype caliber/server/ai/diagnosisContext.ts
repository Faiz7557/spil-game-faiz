// prototype/server/ai/diagnosisContext.ts
import { Ledger } from "../../src/domain/refs.js";
import { diagnose, type Differential } from "../../src/domain/diagnosis.js";
import { modesFor, type FailureMode } from "../../src/domain/failureModes.js";
import type { Snapshot } from "../../src/domain/types.js";

export interface DiagnosisContext { ledger: Ledger; prompt: string; differential: Differential; hidden: string[] }

const sig = (m: FailureMode) => Object.entries(m.signature)
  .map(([k, v]) => `${k} ${v === 1 ? "rises" : v === -1 ? "falls" : v === 0 ? "stays in band" : "may move"}`).join(", ");

/**
 * Pre-RCA context: only what was knowable in the selected week. Left out: the RCA deck, the asset's target fields,
 * its own register row, every weekly row after the week, and any register title that repeats the answer.
 */
export function buildDiagnosisContext(snap: Snapshot, tag: string, week: number): DiagnosisContext {
  const eq = snap.equipment.find((e) => e.tag === tag);
  if (!eq) throw new Error(`No condition record for ${tag}.`);
  const rca = snap.rca.find((r) => r.tag === tag);
  const target = snap.incidents.find((i) => i.id === eq.linked_incident);
  const hidden = [eq.target_fields.dominant_failure_mode, rca?.root_cause, rca?.title, target?.title].filter((s): s is string => !!s);
  const cutoff = eq.history[week].date;
  const ledger = new Ledger();
  const blocks: string[] = [];
  const add = (ref: string, text: string) => { ledger.add(ref, text); blocks.push(`<excerpt ref="${ref}">\n${text}\n</excerpt>`); };

  for (const p of eq.params) add(`${eq.source}:info:${p.name}`, `${p.name} (${p.unit}): alarm ${p.alarm}, trip ${p.trip}, limit direction ${p.direction}.`);
  for (const h of eq.history.slice(0, week + 1))
    add(`${eq.source}:hist:${h.date}`, `${h.date} · ${eq.params.map((p, i) => `${p.name} ${h.values[i]} ${p.unit}`).join(" · ")} · condition status ${h.status}${h.remark ? ` · remark: ${h.remark}` : ""}`);

  const differential = diagnose(eq, week);
  add(`PP:diag:${tag}:w${week + 1}`,
    `Computed by PlantPulse (symptom matcher; baseline = first 6 weekly readings; |z| >= 3 counts as a symptom) for ${cutoff}:\n` +
    differential.observations.map((o) => `- ${o.param}: ${o.value} ${o.unit}, z ${o.z}, ${o.dir === 1 ? "above" : o.dir === -1 ? "below" : "inside"} the baseline band`).join("\n") +
    (differential.abstain ? `\nAbstained: ${differential.abstain}` : `\nScores: ${differential.ranking.map((r) => `${r.mode.id} ${r.score}`).join(", ")}`));
  if (differential.family) for (const m of modesFor(differential.family))
    add(`FM:${m.id}`, `${m.id} ${m.title} (ISO 14224 mode ${m.iso14224.mode}, mechanism ${m.iso14224.mechanism}). Expected signals: ${sig(m)}. Discriminating check (${m.check.cost} cost): ${m.check.test} If positive: ${m.check.ifTrue} If negative: ${m.check.ifFalse}`);

  const similar = snap.incidents
    .filter((i) => i.id !== target?.id && i.eq_type === target?.eq_type && i.occurred <= cutoff && !hidden.some((s) => i.title.includes(s)))
    .sort((a, b) => b.occurred.localeCompare(a.occurred)).slice(0, 6);
  for (const i of similar)
    add(`L3:row${i.src.row}`, `${i.tag} · ${i.plant} · ${i.occurred} · ${i.title} · component ${i.component} · mechanism ${i.mechanism} · no RCA package in the dataset`);

  const header = `Asset ${eq.tag}: ${eq.name}, ${eq.type}, class ${eq.eq_class}, criticality ${eq.criticality}, monitoring: ${eq.monitoring}. ` +
    `Review week: ${cutoff} (week ${week + 1}). No RCA exists yet.`;
  return { ledger, prompt: `${header}\n\n${blocks.join("\n\n")}`, differential, hidden };
}
