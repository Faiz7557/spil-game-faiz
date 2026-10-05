import type { Incident } from "./types";

/** Comparable register records: same equipment type and component first, then same component anywhere. Target excluded.
 *  Candidates to compare, never evidence of a shared cause. */
export function similarCandidates(target: Incident, all: Incident[], n = 8) {
  const score = (i: Incident) => (i.eq_type === target.eq_type ? 2 : 0) + (i.component === target.component ? 3 : 0) + (i.mechanism === target.mechanism ? 1 : 0);
  return all.filter((i) => i.id !== target.id).map((i) => ({ i, s: score(i) })).filter((x) => x.s >= 3)
    .sort((a, b) => b.s - a.s || b.i.occurred.localeCompare(a.i.occurred) || a.i.serial - b.i.serial).slice(0, n).map((x) => x.i);
}
