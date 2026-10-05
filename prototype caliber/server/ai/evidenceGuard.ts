import { z } from "zod";
import type { Ledger } from "../../src/domain/refs.js";
import { parseStructured } from "./client.js";
import type { CopilotAnswer } from "./copilot.js";
import type { Usage } from "./runLog.js";

export type GuardStatus = "supported" | "partial" | "unsupported" | "pending" | "not_required";
export interface GuardResult { index: number; status: GuardStatus; reason: string }

// A number in a sentence, with an optional scale word or suffix ("US$61.89M", "1.6 million", "45k").
const NUM = /(\d[\d,]*(?:\.\d+)?)\s*(k|m|b|thousand|million|billion)?\b/gi;
const SCALE: Record<string, number> = { k: 1e3, thousand: 1e3, m: 1e6, million: 1e6, b: 1e9, billion: 1e9 };
const digits = (s: string) => s.replace(/,/g, "");

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const ISO_DATE = /\b(\d{4})-(\d{2})-(\d{2})\b/g;
/** Asset tags (KO-3201, PU-2101B, KO3201_VIB) and evidence ids (R2, L3, EV-11) are identifiers, not quantities. */
const ASSET_TAG = /\b[A-Z]{1,4}-?\d{2,5}[A-Z]?(?:_[A-Z]+)?\b|\b(?:EV|CF|AUD)-\d+\b/g;

/** Every way the source files write one day: 2026-06-30, 30-Jun-2026, 30 Jun 2026. */
export function dateForms(y: string, m: string, d: string) {
  const mon = MON[Number(m) - 1];
  return [`${y}-${m}-${d}`, `${d}-${mon}-${y}`, `${Number(d)}-${mon}-${y}`, `${d} ${mon} ${y}`, `${Number(d)} ${mon} ${y}`].map((s) => s.toLowerCase());
}

/** True when a number from a sentence appears in the excerpts, literally or as a rounded/scaled form of one. */
export function numberSupported(token: string, scaleWord: string | undefined, excerpts: string): boolean {
  const plain = digits(token);
  if (!scaleWord && excerpts.includes(plain)) return true;
  const value = Number(plain) * (scaleWord ? SCALE[scaleWord.toLowerCase()] : 1);
  const found = (excerpts.match(/\d+(?:\.\d+)?/g) ?? []).map(Number);
  return found.some((y) => y !== 0 && Math.abs(value - y) / Math.abs(y) < 0.005);
}

export function structuralGuard(a: CopilotAnswer, ledger: Ledger): GuardResult[] {
  return a.sentences.map((s, index): GuardResult => {
    if (s.kind === "recommendation" || s.kind === "hypothesis")
      return s.refs.length && ledger.unknown(s.refs).length
        ? { index, status: "unsupported", reason: `Cites refs that were not retrieved: ${ledger.unknown(s.refs).join(", ")}` }
        : { index, status: s.refs.length ? "pending" : "not_required", reason: "" };
    if (!s.refs.length) return { index, status: "unsupported", reason: "Factual sentence without evidence refs." };
    const unknown = ledger.unknown(s.refs);
    if (unknown.length) return { index, status: "unsupported", reason: `Cites refs that were not retrieved: ${unknown.join(", ")}` };
    const raw = s.refs.map((r) => ledger.resolve(r)!).join(" ");
    const excerpts = digits(raw);
    const lower = raw.toLowerCase();
    // Dates are checked as dates, then removed so their parts are not checked again as loose numbers.
    const badDates = [...s.text.matchAll(ISO_DATE)].filter((m) => !dateForms(m[1], m[2], m[3]).some((f) => lower.includes(f))).map((m) => m[0]);
    if (badDates.length) return { index, status: "unsupported", reason: `Dates not found in the cited evidence: ${badDates.join(", ")}` };
    const missing = [...s.text.replace(ISO_DATE, " ").replace(ASSET_TAG, " ").matchAll(NUM)]
      .filter((m) => m[1].replace(/\D/g, "").length > 1 && !numberSupported(m[1], m[2], excerpts))
      .map((m) => m[0].trim());
    if (missing.length) return { index, status: "unsupported", reason: `Numbers not found in the cited evidence: ${missing.join(", ")}` };
    return { index, status: "pending", reason: "" };
  });
}

const Verdicts = z.object({ verdicts: z.array(z.object({ index: z.number().int(), status: z.enum(["supported", "partial", "unsupported"]), reason: z.string() })) });

const JUDGE = `You check whether each claim is supported by the evidence excerpts listed under it.
"supported": every part of the claim follows from the excerpts. "partial": some part does not. "unsupported": the excerpts do not support it.
Claims of kind "recommendation" or "hypothesis" are advice or a possibility, not a statement of fact: rate them "supported" when every
fact they rely on is in the excerpts, even though the advice itself is not written there. Lines marked "Computed by PlantPulse" are
code-computed facts and count as evidence.
Judge only against the excerpts shown, not general knowledge. Give a one-sentence reason for each verdict.`;

/** Deterministic pass first; only sentences that survive it go to the judge, which sees nothing but the claim and its excerpts. */
export async function evidenceGuard(a: CopilotAnswer, ledger: Ledger): Promise<{ results: GuardResult[]; usage: Usage | null }> {
  const results = structuralGuard(a, ledger);
  const pending = results.filter((r) => r.status === "pending");
  if (!pending.length) return { results, usage: null };
  const body = pending.map((r) => {
    const s = a.sentences[r.index];
    return `<claim index="${r.index}" kind="${s.kind}">${s.text}</claim>\n${s.refs.map((ref) => `<excerpt ref="${ref}">${ledger.resolve(ref)}</excerpt>`).join("\n")}`;
  }).join("\n\n");
  const out = await parseStructured({ schema: Verdicts, name: "evidence_verdicts", system: JUDGE, content: body, effort: "low", maxTokens: 8000, what: "evidence check" });
  for (const v of out.data.verdicts) {
    const r = results.find((x) => x.index === v.index && x.status === "pending");
    if (r) { r.status = v.status; r.reason = v.reason; }
  }
  for (const r of results) if (r.status === "pending") { r.status = "unsupported"; r.reason = "The checker returned no verdict."; }
  return { results, usage: out.usage };
}
