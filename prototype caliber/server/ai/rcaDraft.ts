import { z } from "zod";
import type { RcaDraft } from "../../src/domain/rcaDraftTypes.js";
import { similarCandidates } from "../../src/domain/similar.js";
import type { Incident } from "../../src/domain/types.js";
import { parseStructured } from "./client.js";

export { similarCandidates };

export const Draft = z.object({
  problem_statement: z.string(),
  checklist: z.array(z.object({ id: z.string(), category: z.enum(["4P", "4M+1E"]), item: z.string(), status: z.string(), data_needed: z.string() })),
  similar: z.array(z.object({ ref: z.string(), why: z.string() })),
  data_requests: z.array(z.object({ to_role: z.string(), request: z.string() })),
  first_checks: z.array(z.string()),
});

/** The model only has register metadata, so it can never assess a checklist row or cite a record it was not offered. */
export function sanitizeDraft(d: RcaDraft, offeredRefs: Set<string>): RcaDraft {
  return { ...d, checklist: d.checklist.map((c) => ({ ...c, status: "Not assessed" })), similar: d.similar.filter((s) => offeredRefs.has(s.ref)) };
}

const fmt = (i: Incident) => `${i.tag} · ${i.plant} · ${i.eq_type}/${i.component} · ${i.mechanism} · ${i.title} · ${i.occurred} · ${i.status}`;

export const DRAFT_SYSTEM = `You prepare an RCA starter for a reliability engineer at a petrochemical plant, using the 4P (parameter) and 4M+1E (man, machine, method, material, environment) method.
You only have register metadata, not inspection results. Therefore:
- Every checklist row must have status "Not assessed" and say exactly what data would assess it.
- Do not state a root cause. Similar incidents are candidates to compare, never proof of cause.
- Address data requests to the roles named in the record (for example the PIC code).
- Cite similar records only by the L3:rowN refs listed under "Candidate similar records".`;

export function draftPrompt(target: Incident, sims: Incident[]) {
  return `Target record (L3:row${target.src.row}):\n${fmt(target)}\nRCA due: ${target.rca_due}; PIC: ${target.pic_rca}; Pre-Risk ${target.pre_risk}; downtime ${target.downtime_h} h.\n\nCandidate similar records:\n${sims.map((s) => `L3:row${s.src.row}: ${fmt(s)}`).join("\n") || "none"}`;
}

export async function draftRca(target: Incident, all: Incident[]) {
  const sims = similarCandidates(target, all);
  const offered = new Set(sims.map((s) => `L3:row${s.src.row}`));
  const out = await parseStructured({ schema: Draft, name: "rca_draft", system: DRAFT_SYSTEM, content: draftPrompt(target, sims), effort: "low", maxTokens: 8000, what: "RCA starter" });
  return { draft: sanitizeDraft(out.data, offered), usage: out.usage };
}
