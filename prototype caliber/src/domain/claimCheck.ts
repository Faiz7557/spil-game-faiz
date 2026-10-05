import type { Equipment, Param, WeeklyRow } from "./types";

export type ClaimType = "measurement" | "threshold" | "duration" | "design_spec" | "assessment";
export interface RcaClaim {
  slide: number; quote: string; parameter: string; value: number | null; value_max: number | null;
  unit: string | null; time_ref: string | null; duration_days: number | null; claim_type: ClaimType;
  assessment: "G" | "NG" | "none";
}
export interface Finding {
  claim: RcaClaim; verdict: "consistent" | "conflict" | "not_checkable";
  observed: { value?: number; date?: string; days?: number; text?: string } | null;
  refs: string[]; note: string;
}

const TOL = 0.1; // 10 % relative difference before a measurement is called a conflict
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const unitNorm = (u: string | null) => (u ?? "").toLowerCase().replace("µm", "micron").replace(/\s/g, "");
const KEYWORDS: [RegExp, RegExp][] = [
  [/vibration/, /vibration/], [/water/, /water/], [/pressure|press/, /press/], [/temp/, /temp/],
  [/flow/, /flow/], [/dp|differential/, /dp/], [/duty/, /duty/], [/offset|alignment/, /offset/], [/harmonic|2x/, /harmonic/],
];

function matchParam(name: string, eq: Equipment): { p: Param; j: number } | null {
  const n = norm(name);
  for (const [claimRe, paramRe] of KEYWORDS) {
    if (!claimRe.test(n)) continue;
    const j = eq.params.findIndex((p) => paramRe.test(norm(p.name)));
    if (j >= 0) return { p: eq.params[j], j };
  }
  return null;
}

function nearestRow(hist: WeeklyRow[], date: string): WeeklyRow | null {
  const t = Date.parse(date);
  if (Number.isNaN(t)) return null;
  let best: WeeklyRow | null = null;
  for (const h of hist) if (!best || Math.abs(Date.parse(h.date) - t) < Math.abs(Date.parse(best.date) - t)) best = h;
  return best && Math.abs(Date.parse(best.date) - t) <= 7 * 86400000 ? best : null;
}

export function checkClaim(c: RcaClaim, eq: Equipment): Finding {
  const src = eq.source;
  const nc = (note: string): Finding => ({ claim: c, verdict: "not_checkable", observed: null, refs: [], note });

  if (c.claim_type === "design_spec") {
    const m = /(\d+(?:\.\d+)?)\s*years?\s*\(bearing\)/i.exec(eq.design_life);
    if (!m || c.value === null || !/bearing/i.test(c.parameter)) return nc("No matching design value in Equipment Info.");
    const rec = Number(m[1]);
    return { claim: c, verdict: rec === c.value ? "consistent" : "conflict", observed: { value: rec, text: eq.design_life },
      refs: [`${src}:info:design_life`], note: `Equipment Info records ${eq.design_life}.` };
  }

  const hit = matchParam(c.parameter, eq);
  if (!hit) return nc("No monitored parameter matches this claim.");
  const { p, j } = hit;
  if (c.unit && unitNorm(c.unit) !== unitNorm(p.unit))
    return nc(`Claim unit ${c.unit} differs from the record unit ${p.unit}; units are never converted.`);

  if (c.claim_type === "threshold") {
    if (c.value === null) return nc("Threshold claim has no value.");
    const same = c.value === p.alarm || c.value === p.trip;
    return { claim: c, verdict: same ? "consistent" : "conflict", observed: { value: p.alarm, text: `alarm ${p.alarm} / trip ${p.trip} ${p.unit}` },
      refs: [`${src}:info:${p.name}`], note: same ? "Matches a recorded limit." : "Limit differs from Equipment Info, which has no effective date — a threshold-version question." };
  }

  if (c.claim_type === "duration") {
    if (c.value === null || c.duration_days === null) return nc("Duration claim needs a limit and a duration.");
    const trip = eq.history.find((h) => h.status === "TRIP");
    const above = (v: number) => (p.direction === "high" ? v > c.value! : v < c.value!);
    const before = eq.history.filter((h) => !trip || h.date <= trip.date);
    const first = before.find((h) => above(h.values[j]));
    if (!first || !trip) return nc("The record never crosses this limit before the trip.");
    const days = Math.round((Date.parse(trip.date) - Date.parse(first.date)) / 86400000);
    const agrees = days <= c.duration_days * 2 && days >= c.duration_days / 2;
    return { claim: c, verdict: agrees ? "consistent" : "conflict", observed: { days, date: first.date },
      refs: [`${src}:hist:${first.date}`, `${src}:hist:${trip.date}`],
      note: `Weekly record first exceeds ${c.value} ${p.unit} on ${first.date}, ${days} days before the trip.` };
  }

  if (c.claim_type === "measurement" || c.claim_type === "assessment") {
    if (c.value === null) return nc("No value to compare.");
    const row = c.time_ref ? nearestRow(eq.history, c.time_ref) : null;
    if (!row) return nc("No weekly reading within 7 days of the claim's time.");
    const obs = row.values[j];
    const lo = c.value, hi = c.value_max ?? c.value;
    const gap = obs < lo ? (lo - obs) / lo : obs > hi ? (obs - hi) / hi : 0;
    const conflict = gap > TOL;
    return { claim: c, verdict: conflict ? "conflict" : "consistent", observed: { value: obs, date: row.date },
      refs: [`${src}:hist:${row.date}`],
      note: conflict ? `Weekly record shows ${obs} ${p.unit} on ${row.date}. A different sampling point or method may explain it; an owner must decide which record is authoritative.` : "Within 10 % of the weekly record." };
  }
  return nc("Claim type not supported.");
}
