import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import snapJson from "../../src/data/case2.json";
import type { Snapshot } from "../../src/domain/types";
import { extractEquipment, extractHourly, extractIncidents } from "./xlsx.js";

const snap = snapJson as unknown as Snapshot;
const BASE = "../Supporting Data/Case 2_ Intelligence Manufacturing";
const TAGS = ["PU-2101B", "KO-3201", "PM-4405B", "HE-3301", "BL-5702"];

describe("TS extraction matches the validated Python output", () => {
  it("incident register: every field of every row", async () => {
    const rows = await extractIncidents(readFileSync(`${BASE}/Incident Database/Incident Database.xlsx`), "L3");
    expect(rows).toHaveLength(380);
    expect(rows.reduce((s, r) => s + r.actual_usd, 0)).toBe(61_886_460);
    expect(rows.reduce((s, r) => s + r.potential_usd, 0)).toBe(5_307_970);
    expect(rows.filter((r) => r.ar === null)).toHaveLength(226);
    expect(rows).toEqual(snap.incidents);
  }, 60_000);

  it.each(TAGS.map((t, i) => [t, i]))("equipment performance %s", async (tag, i) => {
    const e = await extractEquipment(readFileSync(`${BASE}/Equipment Performance/Equipment Performance - RCA${Number(i) + 1} ${tag}.xlsx`), `E${Number(i) + 1}`);
    const { linked_incident: _l, join_count: _j, linear_flag: _f, ...ref } = snap.equipment.find((x) => x.tag === tag)!;
    expect(e).toEqual(ref);
  }, 60_000);

  it.each(TAGS.map((t, i) => [t, i]))("production data %s", async (tag, i) => {
    const h = await extractHourly(readFileSync(`${BASE}/Production Data/Production Data - RCA${Number(i) + 1} ${tag}.xlsx`), `P${Number(i) + 1}`);
    const ref = snap.hourly.find((x) => x.tag_prefix === tag.replace("-", ""))!;
    expect(h.t).toEqual(ref.t);
    expect(h.series).toEqual(ref.series);
    expect(h.run).toEqual(ref.run);
    expect(h.off_with_nonzero_amp).toBe(ref.off_with_nonzero_amp);
    expect(h.forecast).toEqual(ref.forecast);
    expect(h).toEqual(ref);
  }, 60_000);
});
