import bundledSnap from "../data/case2.json";
import briefsJson from "../data/briefs.json";
import emapJson from "../data/evidence_map.json";
import validationJson from "../data/validation_report.json";
import type { Brief, EvidenceMap, Snapshot, ValidationReport } from "./types";

export let SNAP = bundledSnap as unknown as Snapshot;
/** Database ID of the published snapshot in live mode; null when running on the bundled file. */
export let SNAPSHOT_ID: string | null = null;
export const BRIEFS = briefsJson as unknown as Brief[];
export const EMAP = emapJson as unknown as EvidenceMap;
export const VALIDATION = validationJson as unknown as ValidationReport;
export let REVIEW_DATE = SNAP.meta.review_date;

/** Called once at startup in live mode, before React renders. ES module `let` exports are live bindings. */
export function applyServerSnapshot(s: Snapshot & { snapshotId: string }) {
  SNAP = s; SNAPSHOT_ID = s.snapshotId; REVIEW_DATE = s.meta.review_date;
  EVIDENCE = evidenceIndex();
}

export const equipmentByTag = (tag: string) => SNAP.equipment.find((e) => e.tag === tag);
export const rcaByTag = (tag: string) => SNAP.rca.find((r) => r.tag === tag);
export const hourlyByTag = (tag: string) => SNAP.hourly.find((h) => h.tag_prefix === tag.replace("-", ""));
export const incidentById = (id: string) => SNAP.incidents.find((i) => i.id === id);

/** Every evidence ID the UI can cite: curated register, masked-run inputs, conflicts, and the canonical
 *  record refs the AI features cite (L3:row5, E2:hist:2026-04-29, E2:info:<param>, R2:slide7). */
export function evidenceIndex() {
  const idx = new Map<string, { id: string; source: string; loc: string; title: string; excerpt: string; type: string }>();
  for (const e of EMAP.evidence) idx.set(e.id, e);
  for (const b of BRIEFS) for (const e of b.evidence)
    if (!idx.has(e.id)) idx.set(e.id, { ...e, title: e.loc, type: "observed" });
  for (const c of EMAP.conflicts)
    idx.set(c.id, { id: c.id, source: "curated", loc: "Conflict registry", title: c.topic, type: "conflict",
      excerpt: `A — ${c.a.says} (${c.a.evidence}). B — ${c.b.says} (${c.b.evidence}). ${c.note}` });
  for (const e of SNAP.equipment) {
    for (const h of e.history)
      idx.set(`${e.source}:hist:${h.date}`, { id: `${e.source}:hist:${h.date}`, source: e.source, loc: `Condition History · row ${h.row}`,
        title: `${e.tag} weekly reading ${h.date}`, type: "observed",
        excerpt: e.params.map((p, j) => `${p.name} ${h.values[j]} ${p.unit}`).join(" · ") + ` · ${h.status}` });
    for (const p of e.params)
      idx.set(`${e.source}:info:${p.name}`, { id: `${e.source}:info:${p.name}`, source: e.source, loc: "Equipment Info",
        title: `${e.tag} ${p.name} limits`, type: "observed", excerpt: `${p.name}: alarm ${p.alarm} / trip ${p.trip} ${p.unit} (no effective date recorded)` });
    idx.set(`${e.source}:info:design_life`, { id: `${e.source}:info:design_life`, source: e.source, loc: "Equipment Info",
      title: `${e.tag} design life`, type: "observed", excerpt: `Design life: ${e.design_life}` });
  }
  for (const r of SNAP.rca) r.slides.forEach((s, i) =>
    idx.set(`${r.source}:slide${i + 1}`, { id: `${r.source}:slide${i + 1}`, source: r.source, loc: `slide ${i + 1}`,
      title: `${r.tag} RCA slide ${i + 1}`, type: "documented_finding", excerpt: s.join("\n") }));
  for (const i of SNAP.incidents)
    idx.set(`L3:row${i.src.row}`, { id: `L3:row${i.src.row}`, source: i.src.source, loc: `Incident Database · row ${i.src.row}`,
      title: `${i.tag} register entry`, type: "observed",
      excerpt: `${i.title} · ${i.plant} · ${i.occurred} · ${i.status} · actual ${i.actual_usd} USD · potential ${i.potential_usd} USD · RCA due ${i.rca_due}` });
  return idx;
}
export let EVIDENCE = evidenceIndex();
