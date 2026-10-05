import type { Snapshot } from "../../src/domain/types.js";
import { db, publishedSnapshotId } from "../db.js";

const OPEN = ["NEW REGISTERED", "RCA PROCESS", "CA/PA EXECUTION", "MONITORING RESULT"];

export interface SnapshotRows {
  snapshot: { id: string; label: string; review_date: string };
  sources: { id: string; kind: string; file_name: string; sha256: string; storage_path: string | null; source_updated_at: string | null; ingested_at: string }[];
  incidents: any[]; equipment: { doc: any }[]; hourly: { doc: any }[]; rca: { doc: any }[];
}

export type ServerSnapshot = Snapshot & { snapshotId: string };

/** Rebuilds the exact Snapshot shape the UI was written against, so pages don't care where data came from. */
export function assemblePayload(p: SnapshotRows): ServerSnapshot {
  const counts = new Map<string, number>();
  for (const i of p.incidents) counts.set(i.ar_raw, (counts.get(i.ar_raw) ?? 0) + 1);
  return {
    snapshotId: p.snapshot.id,
    meta: {
      snapshot: p.snapshot.label, review_date: p.snapshot.review_date, open_statuses: OPEN,
      currency: "USD (converted once from k US$ × 1,000)",
      ar_placeholder_count: counts.get("n/a") ?? 0,
      duplicate_ar: Object.fromEntries([...counts].filter(([k, v]) => k !== "n/a" && v > 1)),
    },
    sources: Object.fromEntries(p.sources.map((s) => [s.id, {
      id: s.id, kind: s.kind, relative_path: s.storage_path ?? s.file_name, file_name: s.file_name,
      sha256: s.sha256, source_updated_at: s.source_updated_at, ingested_at: s.ingested_at.slice(0, 10),
    }])),
    incidents: p.incidents.map(({ snapshot_id: _s, ...i }) => {
      const { rca_due_raw, ...src } = i.src ?? {};
      return {
        ...i, src, rca_due: rca_due_raw ?? i.rca_due, actual_usd: Number(i.actual_usd), potential_usd: Number(i.potential_usd),
        total_usd: Number(i.actual_usd) + Number(i.potential_usd), downtime_h: Number(i.downtime_h),
      };
    }),
    equipment: p.equipment.map((e) => e.doc), hourly: p.hourly.map((h) => h.doc), rca: p.rca.map((r) => r.doc),
  };
}

// A published snapshot never changes (a new one gets a new id), so each server instance keeps the last one it built.
let cache: { sid: string; payload: Promise<ServerSnapshot> } | null = null;

export async function loadPublishedSnapshot(): Promise<ServerSnapshot> {
  const sid = await publishedSnapshotId();
  if (cache?.sid !== sid) {
    const payload = buildSnapshot(sid);
    cache = { sid, payload };
    payload.catch(() => { if (cache?.payload === payload) cache = null; });
  }
  return cache.payload;
}

async function buildSnapshot(sid: string): Promise<ServerSnapshot> {
  const q = (t: string, cols = "*") => db().from(t).select(cols).eq("snapshot_id", sid);
  const [snapshot, sources, incidents, equipment, hourly, rca] = await Promise.all([
    db().from("snapshots").select("id, label, review_date").eq("id", sid).single(),
    q("sources"), q("incidents").order("serial"), q("equipment", "doc"), q("hourly_series", "doc"), q("rca_documents", "doc"),
  ]);
  for (const r of [snapshot, sources, incidents, equipment, hourly, rca]) if (r.error) throw r.error;
  return assemblePayload({
    snapshot: snapshot.data as SnapshotRows["snapshot"], sources: sources.data as unknown as SnapshotRows["sources"],
    incidents: incidents.data as any[], equipment: equipment.data as any[], hourly: hourly.data as any[], rca: rca.data as any[],
  });
}
