
import { describe, expect, it } from "vitest";
import { SNAP } from "./data";
import { checkClaim, type RcaClaim } from "./claimCheck";

const eq = SNAP.equipment.find((e) => e.tag === "KO-3201")!;
const base: Omit<RcaClaim, "quote" | "parameter" | "claim_type"> = {
  slide: 6, value: null, value_max: null, unit: null, time_ref: null, duration_days: null, assessment: "none",
};

describe("checkClaim on KO-3201", () => {
  it("CF-04: 'header pressure 1.8 barg, within normal band' conflicts with 1.078 barg in the trip week", () => {
    const f = checkClaim({ ...base, quote: "Header pressure 1.8 barg — within normal band.", parameter: "Lube oil supply pressure",
      value: 1.8, unit: "barg", time_ref: "2026-04-29", claim_type: "measurement", assessment: "G" }, eq);
    expect(f.verdict).toBe("conflict");
    expect(f.observed).toMatchObject({ value: 1.078, date: "2026-04-29" });
    expect(f.refs).toContain("E2:hist:2026-04-29");
  });
  it("CF-03: '~2 weeks above 500 ppm' conflicts with 11 weeks in the weekly record", () => {
    const f = checkClaim({ ...base, slide: 4, quote: "drifted above 500 ppm for ~2 weeks", parameter: "Lube oil water content",
      value: 500, unit: "ppm", duration_days: 14, claim_type: "duration" }, eq);
    expect(f.verdict).toBe("conflict");
    expect(f.observed?.days).toBe(77);
  });
  it("CF-01: an alert of 60 micron conflicts with the recorded 45 micron alarm", () => {
    const f = checkClaim({ ...base, slide: 7, quote: "Alert at 60 micron", parameter: "DE radial vibration", value: 60, unit: "micron", claim_type: "threshold" }, eq);
    expect(f.verdict).toBe("conflict");
  });
  it("CF-05: a 6-year bearing design life conflicts with 5 years in Equipment Info", () => {
    const f = checkClaim({ ...base, quote: "3 years vs 6-year design", parameter: "Bearing design life", value: 6, unit: "years", claim_type: "design_spec" }, eq);
    expect(f.verdict).toBe("conflict");
  });
  it("surfaces a lab grab sample (1,800 ppm) that differs >10 % from the weekly record (1,530 ppm)", () => {
    const f = checkClaim({ ...base, quote: "Water content 1,800 ppm vs < 500 ppm spec", parameter: "Lube oil water content",
      value: 1800, unit: "ppm", time_ref: "2026-04-29", claim_type: "measurement", assessment: "NG" }, eq);
    expect(f.verdict).toBe("conflict"); // 1800 vs 1530 = 17.6% apart > 10% tolerance; a lab grab vs weekly value is worth surfacing
    expect(f.note).toMatch(/different sampling/i);
  });
  it("is not checkable when no parameter matches", () => {
    const f = checkClaim({ ...base, quote: "Anti-surge margin maintained", parameter: "Anti-surge margin", claim_type: "assessment", assessment: "G" }, eq);
    expect(f.verdict).toBe("not_checkable");
  });
  it("refuses unit mismatch instead of converting", () => {
    const f = checkClaim({ ...base, quote: "vibration 8 mm/s", parameter: "DE radial vibration", value: 8, unit: "mm/s", time_ref: "2026-04-29", claim_type: "measurement" }, eq);
    expect(f.verdict).toBe("not_checkable");
    expect(f.note).toMatch(/unit/i);
  });
});
