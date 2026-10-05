// prototype/src/domain/diagnosis.ts
// Deterministic symptom matcher: weekly condition readings vs the failure-mode library. The ranking is computed
// here, never by a model; the LLM investigator (server/ai/diagnosisAgent.ts) explains it and may disagree with refs.
import type { Equipment } from "./types";
import { EQUIPMENT_FAMILY, modesFor, type Dir, type Family, type FailureMode, type SignalKind } from "./failureModes.js";

const KIND_PATTERNS: [RegExp, SignalKind][] = [
  [/water content/i, "lube_water"], [/supply press/i, "lube_supply_press"], [/seal flush/i, "seal_flush_flow"],
  [/discharge press/i, "discharge_press"], [/winding/i, "winding_temp"], [/ampere|current/i, "motor_current"],
  [/2x/i, "harmonic_2x"], [/coupling offset/i, "coupling_offset"], [/\bdp\b/i, "dp"], [/heat duty/i, "duty"],
  [/outlet temp/i, "outlet_temp"], [/heavy-ends/i, "feed_heavy_ends"], [/bearing.*temp/i, "bearing_temp"], [/vibration/i, "vibration"],
];
export function signalKind(name: string): SignalKind | null {
  return KIND_PATTERNS.find(([re]) => re.test(name))?.[1] ?? null;
}

export const BASELINE_WEEKS = 6;
export const Z_MIN = 3;
export const MIN_SYMPTOMS = 2;

export interface Observation { kind: SignalKind; param: string; unit: string; date: string; value: number; z: number; dir: Dir }

function meanSd(xs: number[]): [number, number] {
  const m = xs.reduce((s, v) => s + v, 0) / xs.length;
  const v = xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1);
  return [m, Math.sqrt(v)];
}

export function observe(eq: Equipment, week: number): Observation[] {
  const row = eq.history[week];
  return eq.params.flatMap((p, i) => {
    const kind = signalKind(p.name);
    if (!kind) return [];
    const [m, sd] = meanSd(eq.history.slice(0, BASELINE_WEEKS).map((h) => h.values[i]));
    const z = sd > 0 ? (row.values[i] - m) / sd : 0;
    const dir: Dir = Math.abs(z) >= Z_MIN ? (z > 0 ? 1 : -1) : 0;
    return [{ kind, param: p.name, unit: p.unit, date: row.date, value: row.values[i], z: Math.round(z * 100) / 100, dir }];
  });
}

export interface ModeScore {
  mode: FailureMode; score: number;
  matched: SignalKind[]; contradicted: SignalKind[]; missing: SignalKind[]; unexplained: SignalKind[]; quiet: SignalKind[];
}

export function scoreMode(mode: FailureMode, obs: Observation[]): ModeScore {
  const s: ModeScore = { mode, score: 0, matched: [], contradicted: [], missing: [], unexplained: [], quiet: [] };
  let counted = 0;
  for (const o of obs) {
    const e = mode.signature[o.kind] ?? null;
    if (e === null && o.dir === 0) continue;
    counted++;
    if (e === null) s.unexplained.push(o.kind);
    else if (e === 0 && o.dir === 0) s.quiet.push(o.kind);
    else if (e !== 0 && o.dir === e) s.matched.push(o.kind);
    else if (e !== 0 && o.dir === 0) s.missing.push(o.kind);
    else s.contradicted.push(o.kind);
  }
  const raw = counted ? (s.matched.length - 0.5 * (s.contradicted.length + s.missing.length)) / counted : 0;
  s.score = Math.round(raw * 1000) / 1000;
  return s;
}

export interface Differential {
  tag: string; family: Family | null; week: number; date: string;
  observations: Observation[]; ranking: ModeScore[]; leading: string[]; abstain: string | null;
}

export function diagnose(eq: Equipment, week: number): Differential {
  const family = EQUIPMENT_FAMILY[eq.type] ?? null;
  const base = { tag: eq.tag, family, week, date: eq.history[week]?.date ?? "", observations: [] as Observation[], ranking: [] as ModeScore[], leading: [] as string[] };
  if (!family) return { ...base, abstain: `No failure-mode library for ${eq.type} yet.` };
  if (week < BASELINE_WEEKS || week >= eq.history.length)
    return { ...base, abstain: `Week ${week + 1} is inside the ${BASELINE_WEEKS}-week baseline or outside the record.` };
  const observations = observe(eq, week);
  const symptoms = observations.filter((o) => o.dir !== 0).length;
  if (symptoms < MIN_SYMPTOMS)
    return { ...base, observations, abstain: `Only ${symptoms} signal${symptoms === 1 ? "" : "s"} outside the baseline band; not enough to rank causes.` };
  const ranking = modesFor(family).map((m) => scoreMode(m, observations))
    .sort((a, b) => b.score - a.score || a.mode.id.localeCompare(b.mode.id));
  const leading = ranking.filter((r) => r.score === ranking[0].score).map((r) => r.mode.id);
  return { ...base, observations, ranking, leading, abstain: null };
}

/** First week (0-based) before the trip where the matcher has enough symptoms to rank; null if never. */
export function firstDiagnosableWeek(eq: Equipment): number | null {
  for (let w = BASELINE_WEEKS; w < eq.history.length && eq.history[w].status !== "TRIP"; w++)
    if (!diagnose(eq, w).abstain) return w;
  return null;
}

export interface LockOnWeek { week: number; date: string; leading: string[]; state: "abstain" | "unique" | "tied" | "wrong" }

/** Week-by-week matcher state from the end of the baseline to the week before the trip, against a gold mode. */
export function lockOn(eq: Equipment, goldMode: string): LockOnWeek[] {
  const trip = eq.history.findIndex((h) => h.status === "TRIP");
  const end = trip >= 0 ? trip : eq.history.length;
  const out: LockOnWeek[] = [];
  for (let w = BASELINE_WEEKS; w < end; w++) {
    const d = diagnose(eq, w);
    const state = d.abstain ? "abstain" : d.leading.length === 1 && d.leading[0] === goldMode ? "unique" : d.leading.includes(goldMode) ? "tied" : "wrong";
    out.push({ week: w, date: d.date, leading: d.leading, state });
  }
  return out;
}
