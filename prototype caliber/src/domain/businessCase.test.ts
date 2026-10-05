import { describe, expect, it } from "vitest";
import { EXAMPLE_SCENARIO, breakEvenRecurrences, computeCase, type CaseInputs } from "./businessCase";

const inputs: CaseInputs = {
  rcaPerYear: 150, hoursPerRcaBaseline: 16, hoursPerRcaWithTool: 10, loadedCostPerHour: 40, adoption: 0.6,
  avoidedRecurrences: 1, avgRecordedLossPerRecurrence: 200_000, avoidableShare: 0.5,
  platformCostPerYear: 6000, aiCostPerTask: 0.35, aiTasksPerYear: 2000, integrationOneOff: 20000,
};

describe("computeCase", () => {
  it("labour benefit = tasks × hours saved × cost × adoption", () => {
    expect(computeCase(inputs).labourBenefit).toBe(150 * 6 * 40 * 0.6);
  });
  it("net benefit subtracts running and one-off costs, payback in months", () => {
    const r = computeCase(inputs);
    expect(r.runningCost).toBe(6000 + 0.35 * 2000);
    expect(r.netYear1).toBe(r.labourBenefit! + r.reliabilityBenefit! - r.runningCost! - 20000);
    expect(r.paybackMonths).toBeCloseTo(20000 / ((r.labourBenefit! + r.reliabilityBenefit! - r.runningCost!) / 12), 5);
  });
  it("returns null payback when the case does not pay back", () => {
    expect(computeCase({ ...inputs, avoidedRecurrences: 0, adoption: 0.01 }).paybackMonths).toBeNull();
  });
  it("reports which inputs are missing instead of inventing them", () => {
    const r = computeCase({ ...inputs, loadedCostPerHour: null as unknown as number });
    expect(r.missing).toContain("loadedCostPerHour");
    expect(r.labourBenefit).toBeNull();
  });
  it("an empty form lists every input as missing and computes nothing", () => {
    const r = computeCase({} as CaseInputs);
    expect(r.missing).toHaveLength(12);
    expect([r.labourBenefit, r.reliabilityBenefit, r.runningCost, r.annualNet, r.paybackMonths]).toEqual([null, null, null, null, null]);
  });
});

describe("example scenario", () => {
  it("labels every value and computes break-even honestly", () => {
    for (const v of Object.values(EXAMPLE_SCENARIO)) expect(v.source.length).toBeGreaterThan(5);
    const inputs = Object.fromEntries(Object.entries(EXAMPLE_SCENARIO).map(([k, v]) => [k, v.value])) as unknown as CaseInputs;
    const r = computeCase(inputs);
    expect(r.missing).toEqual([]);
    expect(breakEvenRecurrences(inputs)).toBeCloseTo((100025 - 11100) / 81430, 2);
  });
});
