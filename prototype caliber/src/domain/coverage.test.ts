import { describe, expect, it } from "vitest";
import type { Snapshot } from "./types";
import { coverageFor } from "./coverage";
import snapJson from "../data/case2.json";

const snap = snapJson as unknown as Snapshot;
const open = snap.incidents.filter((i) => snap.meta.open_statuses.includes(i.status));

describe("coverageFor", () => {
  it("scores the five full cases highest and asks for the next missing evidence elsewhere", () => {
    const ko = coverageFor(snap.incidents.find((i) => i.tag === "KO-3201")!, snap);
    expect(ko.have.condition && ko.have.rca).toBe(true);
    const thin = coverageFor(open.find((i) => !snap.equipment.some((e) => e.linked_incident === i.id))!, snap);
    expect(thin.have.condition).toBe(false);
    expect(thin.nextRequest).toMatch(/condition readings/i);
  });
  it("gives register-level candidate modes only inside the library, and flags odd component/type pairs", () => {
    const all = open.map((i) => coverageFor(i, snap));
    expect(all.filter((c) => c.family === null).every((c) => c.candidates.length === 0)).toBe(true);
    const odd = all.find((c) => c.dqFlag);
    expect(odd?.dqFlag).toMatch(/not part of/);
  });
});
