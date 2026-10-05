import { describe, expect, it } from "vitest";
import snap from "../../src/data/case2.json";
import { assemblePayload } from "./snapshot.js";
import { toIncidentRow } from "./writeSnapshot.js";

describe("assemblePayload", () => {
  it("rebuilds the Snapshot shape the UI expects", () => {
    const s: any = snap;
    const out = assemblePayload({
      snapshot: { id: "S", label: s.meta.snapshot, review_date: s.meta.review_date },
      sources: Object.values(s.sources).map((x: any) => ({ id: x.id, kind: x.kind, file_name: x.file_name, sha256: x.sha256, storage_path: null, source_updated_at: null, ingested_at: s.meta.review_date })),
      incidents: s.incidents.map((i: any) => ({ ...toIncidentRow(i), snapshot_id: "S" })),
      equipment: s.equipment.map((doc: any) => ({ doc })),
      hourly: s.hourly.map((doc: any) => ({ doc })), rca: s.rca.map((doc: any) => ({ doc })),
    });
    expect(out.incidents).toHaveLength(380);
    expect(out.incidents).toEqual(s.incidents);
    expect(out.meta.open_statuses).toEqual(["NEW REGISTERED", "RCA PROCESS", "CA/PA EXECUTION", "MONITORING RESULT"]);
    expect(out.meta.ar_placeholder_count).toBe(226);
    expect(out.meta.duplicate_ar).toEqual(s.meta.duplicate_ar);
    expect(out.sources.L3.file_name).toBe("Incident Database.xlsx");
  });
});
