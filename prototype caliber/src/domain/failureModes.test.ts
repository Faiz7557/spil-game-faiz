// prototype/src/domain/failureModes.test.ts
import { describe, expect, it } from "vitest";
import { EQUIPMENT_FAMILY, FAILURE_MODES, REGISTER_FAMILY, modeById, modesFor } from "./failureModes";
import snap from "../data/case2.json";

describe("failure-mode library", () => {
  it("has unique ids, at least three rival modes per family and a check for each mode", () => {
    expect(new Set(FAILURE_MODES.map((m) => m.id)).size).toBe(FAILURE_MODES.length);
    for (const f of ["CO", "PU", "EM", "HX", "BL"] as const) expect(modesFor(f).length).toBeGreaterThanOrEqual(3);
    for (const m of FAILURE_MODES) {
      expect(Object.keys(m.signature).length).toBeGreaterThan(0);
      expect(m.check.test.length).toBeGreaterThan(10);
      expect(m.iso14224.mode).toMatch(/^[A-Z]{3}$/);
    }
  });
  it("covers every equipment type with condition data", () => {
    for (const e of snap.equipment) expect(EQUIPMENT_FAMILY[e.type]).toBeDefined();
    expect(REGISTER_FAMILY.HB).toBe("HX");
    expect(modeById("CO-1")?.family).toBe("CO");
  });
});
