// prototype/src/domain/diagnosisBrief.ts
import type { GuardStatus } from "../lib/copilotTypes";

export interface BriefClaim { text: string; refs: string[] }
export interface DiagnosisBriefT {
  hypotheses: { mode_id: string; title: string; standing: "leading" | "plausible" | "unlikely"; for: BriefClaim[]; against: BriefClaim[] }[];
  next_check: { test: string; separates: string[]; if_positive: string; if_negative: string; refs: string[] };
  abstentions: string[];
}
export interface GuardSentence { text: string; refs: string[]; kind: "fact" | "recommendation" }
export interface RecordedDiagnosis {
  brief: DiagnosisBriefT; guard: { index: number; status: GuardStatus; reason: string }[]; model: string; run_at: string; week: number;
}

/** One order for server and UI: each hypothesis's "for" then "against" claims, then the next check. Guard indexes follow it. */
export function toGuardSentences(b: DiagnosisBriefT): GuardSentence[] {
  const out: GuardSentence[] = [];
  for (const h of b.hypotheses) {
    for (const c of h.for) out.push({ text: c.text, refs: c.refs, kind: "fact" });
    for (const c of h.against) out.push({ text: c.text, refs: c.refs, kind: "fact" });
  }
  out.push({ text: `${b.next_check.test} If positive: ${b.next_check.if_positive} If negative: ${b.next_check.if_negative}`, refs: b.next_check.refs, kind: "recommendation" });
  return out;
}
