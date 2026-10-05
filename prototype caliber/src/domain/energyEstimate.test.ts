// prototype/src/domain/energyEstimate.test.ts
import { describe, expect, it } from "vitest";
import { estimateEnergy } from "./energyEstimate";

describe("estimateEnergy", () => {
  it("needs every company input before giving a number", () => {
    expect(estimateEnergy([100], ["ON"], { voltageV: 400, powerFactor: null, efKgPerKwh: 0.8 }).kwh).toBeNull();
  });
  it("computes P = √3·V·I·PF over running hours only", () => {
    const e = estimateEnergy([100, 100, 50], ["ON", "ON", "OFF"], { voltageV: 400, powerFactor: 0.85, efKgPerKwh: 0.8 });
    expect(e.kwh).toBeCloseTo(2 * Math.sqrt(3) * 400 * 100 * 0.85 / 1000, 3);
    expect(e.tco2).toBeCloseTo((e.kwh! * 0.8) / 1000, 6);
  });
});
