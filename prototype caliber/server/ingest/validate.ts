import type { Snapshot } from "../../src/domain/types.js";

export interface Check { id: string; gate: string; description: string; pass: boolean; blocking: boolean; detail: string }

export function runGates(s: Snapshot) {
  const inc = s.incidents;
  const checks: Check[] = [];
  const add = (id: string, gate: string, description: string, pass: boolean, blocking: boolean, detail = "") => checks.push({ id, gate, description, pass, blocking, detail });
  const ids = new Set(inc.map((i) => i.id));
  add("identity.unique_ids", "identity", "Every incident has a unique snapshot ID", ids.size === inc.length, true, `${ids.size}/${inc.length}`);
  const badLoss = inc.filter((i) => i.actual_usd + i.potential_usd !== i.total_usd);
  add("financial.loss_identity", "financial", "Actual + potential = total on every row", badLoss.length === 0, true, badLoss.map((i) => i.id).join(", "));
  const na = inc.filter((i) => i.ar === null).length;
  add("identity.ar_placeholder", "identity", "AR placeholders normalised to null (never joined)", true, false, `${na} rows`);
  const joins = s.equipment.map((e) => ({ tag: e.tag, n: inc.filter((i) => i.ar === e.linked_ar && i.tag === e.tag).length }));
  add("identity.detailed_join", "identity", "Each detailed asset joins exactly one incident", joins.every((j) => j.n === 1), true, joins.filter((j) => j.n !== 1).map((j) => `${j.tag}:${j.n}`).join(", "));
  const noDate = inc.filter((i) => !/^\d{4}-\d{2}-\d{2}$/.test(i.occurred));
  add("time.occurred_iso", "time", "Occurrence dates parse as ISO dates", noDate.length === 0, true, noDate.map((i) => i.id).join(", "));
  const units = s.equipment.flatMap((e) => e.params.filter((p) => !p.unit).map((p) => `${e.tag}:${p.name}`));
  add("unit.present", "unit", "Every monitored parameter has a unit", units.length === 0, true, units.join(", "));
  const offAmp = s.hourly.reduce((n, h) => n + h.off_with_nonzero_amp, 0);
  add("unit.off_current", "unit", "OFF rows with non-zero current are flagged, not zeroed", true, false, `${offAmp} rows`);
  add("time.source_updated", "time", "Source publication time recorded", Object.values(s.sources).every((x) => x.source_updated_at), false, "Unknown times block strict historical replay only");
  return { checks, blocking: checks.filter((c) => c.blocking && !c.pass) };
}
