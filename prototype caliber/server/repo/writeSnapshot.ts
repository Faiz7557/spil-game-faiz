import type { Equipment, Hourly, Incident, Rca, Snapshot } from "../../src/domain/types.js";
import { db } from "../db.js";

const OPEN = ["NEW REGISTERED", "RCA PROCESS", "CA/PA EXECUTION", "MONITORING RESULT"];
export type EquipmentPart = Omit<Equipment, "linked_incident" | "join_count" | "linear_flag">;

/** Port of linear_flags() in pipeline/extract_case2.py: 6-point fit, flag when projected trip crossing ≤ 8 weeks. */
export function linearFlag(e: EquipmentPart) {
  const trip = e.history.findIndex((h) => h.status === "TRIP");
  for (let i = 5; i < trip; i++) {
    const hz: [number, string][] = [];
    e.params.forEach((p, j) => {
      const y = e.history.slice(i - 5, i + 1).map((h) => h.values[j]);
      const xm = 2.5, ym = y.reduce((s, v) => s + v, 0) / 6;
      const slope = y.reduce((s, v, k) => s + (k - xm) * (v - ym), 0) / 17.5;
      const intercept = ym - slope * xm;
      if (slope === 0 || (p.trip - y[5]) * slope <= 0) return;
      const d = (p.trip - (slope * 5 + intercept)) / slope;
      if (d > 0) hz.push([d, p.name]);
    });
    if (hz.length) {
      const [d, name] = hz.sort((a, b) => a[0] - b[0])[0];
      if (d <= 8) return { date: e.history[i].date, week: e.history[i].week, horizon_weeks: Math.round(d * 100) / 100, parameter: name };
    }
  }
  return null;
}

export interface SnapshotParts {
  sources: { id: string; kind: string; file_name: string; storage_path: string; sha256: string }[];
  incidents: Incident[]; equipment: EquipmentPart[]; hourly: Hourly[]; rca: (Omit<Rca, "tag"> & { tag: string })[];
}

export function assembleFromParts(p: SnapshotParts, reviewDate: string): Snapshot {
  const counts = new Map<string, number>();
  for (const i of p.incidents) counts.set(i.ar_raw, (counts.get(i.ar_raw) ?? 0) + 1);
  const equipment: Equipment[] = p.equipment.map((e) => {
    const linked = p.incidents.filter((i) => i.ar === e.linked_ar && i.tag === e.tag);
    return { ...e, linked_incident: linked.length === 1 ? linked[0].id : null, join_count: linked.length, linear_flag: linearFlag(e) };
  });
  const rca = p.rca.map((r) => {
    const tag = equipment.find((e) => r.slides?.[0]?.some((s) => s.includes(e.tag)))?.tag ?? r.tag ?? "";
    return { ...r, tag } as Rca;
  });
  return {
    meta: { snapshot: "Ingested snapshot", review_date: reviewDate, open_statuses: OPEN, currency: "USD (converted once from k US$ × 1,000)",
      ar_placeholder_count: counts.get("n/a") ?? 0, duplicate_ar: Object.fromEntries([...counts].filter(([k, v]) => k !== "n/a" && v > 1)) },
    sources: Object.fromEntries(p.sources.map((s) => [s.id, { id: s.id, kind: s.kind, relative_path: s.storage_path, file_name: s.file_name, sha256: s.sha256, source_updated_at: null, ingested_at: reviewDate }])),
    incidents: p.incidents, equipment, hourly: p.hourly, rca,
  };
}

const ISO = /^\d{4}-\d{2}-\d{2}$/;

/** The register writes "n/a" in RCA Due Date for closed records. The date column holds null; the source text is kept
 *  in src.rca_due_raw so the published payload is identical to the validated extraction (see snapshot.ts). */
export function toIncidentRow({ total_usd: _t, ...x }: Incident) {
  if (x.rca_due === null || ISO.test(x.rca_due)) return x;
  return { ...x, rca_due: null, src: { ...x.src, rca_due_raw: x.rca_due } };
}

async function must(p: PromiseLike<{ error: unknown }>, what: string) {
  const { error } = await p;
  if (error) throw new Error(`${what}: ${JSON.stringify(error)}`);
}

/** Make one snapshot the published one; the previous published snapshot is archived, never deleted. */
export async function publishSnapshot(sid: string) {
  await must(db().from("snapshots").update({ status: "archived" }).eq("status", "published"), "archive");
  await must(db().from("snapshots").update({ status: "published" }).eq("id", sid), "publish");
}

export async function writeSnapshot(s: Snapshot, o: { label: string; status: "staging" | "published"; createdBy?: string; validation?: unknown }) {
  const { data, error } = await db().from("snapshots").insert({ label: o.label, review_date: s.meta.review_date, status: "staging", created_by: o.createdBy ?? null, validation: o.validation ?? {} }).select("id").single();
  if (error) throw error;
  const sid = data.id as string;
  await must(db().from("sources").insert(Object.values(s.sources).map((x) => ({ snapshot_id: sid, id: x.id, kind: x.kind, file_name: x.file_name, storage_path: x.relative_path, sha256: x.sha256, source_updated_at: x.source_updated_at }))), "sources");
  for (let i = 0; i < s.incidents.length; i += 200)
    await must(db().from("incidents").insert(s.incidents.slice(i, i + 200).map(toIncidentRow).map((x) => ({ ...x, snapshot_id: sid }))), "incidents");
  await must(db().from("equipment").insert(s.equipment.map((e) => ({ snapshot_id: sid, tag: e.tag, source_id: e.source, doc: e }))), "equipment");
  await must(db().from("hourly_series").insert(s.hourly.map((h) => ({ snapshot_id: sid, tag_prefix: h.tag_prefix, source_id: h.source, doc: h }))), "hourly");
  await must(db().from("rca_documents").insert(s.rca.map((r) => ({ snapshot_id: sid, tag: r.tag, source_id: r.source, doc: r }))), "rca");
  if (o.status === "published") await publishSnapshot(sid);
  return sid;
}
