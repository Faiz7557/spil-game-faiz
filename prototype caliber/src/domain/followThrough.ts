// prototype/src/domain/followThrough.ts
import type { Equipment, Rca, Snapshot } from "./types";
import { BASELINE_WEEKS, Z_MIN } from "./diagnosis.js";

const TAG = /\b([A-Z]{2})-(\d{4})([A-Z]?)((?:\/(?:\d{4}[A-Z]?|[A-Z]))*)/g;

/** "KO-3202/3203" → KO-3202, KO-3203; "PM-4405B/C" → PM-4405B, PM-4405C. */
export function expandTags(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(TAG)) {
    const [, prefix, num, suffix, rest] = m;
    out.push(`${prefix}-${num}${suffix}`);
    for (const part of rest.split("/").filter(Boolean)) out.push(/^\d/.test(part) ? `${prefix}-${part}` : `${prefix}-${num}${part}`);
  }
  return [...new Set(out)];
}

export interface SisterItem { tag: string | null; scope: string; reason: string; ref: string; kind: "named" | "fleet" | "register" }
const FLEET = /\ball\b|\bfleet\b|\bparallel\b/i;

/** Where the same cause could strike next: assets named in RCA actions, fleet-wide roll-outs, and same type+component in the register. */
export function sisterAssets(snap: Snapshot, tag: string): SisterItem[] {
  const rca = snap.rca.find((r) => r.tag === tag);
  const eq = snap.equipment.find((e) => e.tag === tag);
  const target = eq ? snap.incidents.find((i) => i.id === eq.linked_incident) : undefined;
  const out: SisterItem[] = [];
  if (rca) {
    const lists: [Rca["actions"], string][] = [[rca.actions, `${rca.source}:slide9`], [rca.preventive, `${rca.source}:slide10`]];
    for (const [actions, ref] of lists) for (const a of actions) {
      const tags = expandTags(a.text).filter((t) => t !== tag);
      for (const t of tags) if (!out.some((o) => o.tag === t)) out.push({ tag: t, scope: a.text, reason: `Named in RCA ${a.kind} action (${a.status ?? "no status"}, plan ${a.plan_date})`, ref, kind: "named" });
      if (!tags.length && a.kind === "proactive" && FLEET.test(a.text)) out.push({ tag: null, scope: a.text, reason: `Fleet roll-out in RCA proactive action (${a.status ?? "no status"}, plan ${a.plan_date})`, ref, kind: "fleet" });
    }
  }
  if (target) for (const i of snap.incidents)
    if (i.id !== target.id && i.tag !== tag && i.eq_type === target.eq_type && i.component === target.component)
      out.push({ tag: i.tag, scope: `${i.plant} · ${i.title}`, reason: `Same equipment type and component in the register (${i.occurred}); a candidate to review, not proof of the same cause`, ref: `L3:row${i.src.row}`, kind: "register" });
  return out;
}

export type { Equipment };

export const OBSERVATION_WEEKS_REQUIRED = 8;
export interface SignalRecovery { param: string; unit: string; direction: "high" | "low"; postWeeks: number; okWeeks: number; latest: number; latestZ: number; ok: boolean }
export interface Effectiveness {
  tripDate: string | null; weeksObserved: number; required: number; signals: SignalRecovery[];
  verdict: "no_trip" | "no_post_data" | "not_recovered" | "recovered_window_short" | "recovered"; openSourceActions: number;
}

export function effectiveness(eq: Equipment, rca: Rca | undefined): Effectiveness {
  const trip = eq.history.findIndex((h) => h.status === "TRIP");
  const openSourceActions = rca ? [...rca.actions, ...rca.preventive].filter((a) => a.status !== "Closed").length : 0;
  const empty = { tripDate: trip >= 0 ? eq.history[trip].date : null, weeksObserved: 0, required: OBSERVATION_WEEKS_REQUIRED, signals: [] as SignalRecovery[], openSourceActions };
  if (trip < 0) return { ...empty, verdict: "no_trip" };
  const post = eq.history.slice(trip + 1);
  if (!post.length) return { ...empty, verdict: "no_post_data" };
  const signals = eq.params.map((p, i): SignalRecovery => {
    const b = eq.history.slice(0, BASELINE_WEEKS).map((h) => h.values[i]);
    const m = b.reduce((s, v) => s + v, 0) / b.length;
    const sd = Math.sqrt(b.reduce((s, v) => s + (v - m) ** 2, 0) / (b.length - 1)) || 1e-9;
    const safe = (v: number) => (p.direction === "high" ? (v - m) / sd < Z_MIN : (v - m) / sd > -Z_MIN);
    const latest = post[post.length - 1].values[i];
    return { param: p.name, unit: p.unit, direction: p.direction, postWeeks: post.length, okWeeks: post.filter((h) => safe(h.values[i])).length,
      latest, latestZ: Math.round(((latest - m) / sd) * 10) / 10, ok: safe(latest) };
  });
  const verdict = signals.some((s) => !s.ok) ? "not_recovered" : post.length < OBSERVATION_WEEKS_REQUIRED ? "recovered_window_short" : "recovered";
  return { ...empty, weeksObserved: post.length, signals, verdict };
}
