import { describe, expect, it } from "vitest";
import { SENSOR_RULE } from "../../src/domain/actionTransitions.js";
import { interpretCheck } from "./evidenceCheck.js";

describe("interpretCheck", () => {
  it("a cooler repair record is flagged as not satisfying the sensor rule", () => {
    const r = interpretCheck({ document_type: "repair_record", kinds_satisfied: ["repair_record"], document_date: "2026-04-30",
      asset_tags: ["KO-3201"], summary: "Tube plug and re-test", concerns: [] }, SENSOR_RULE, "KO-3201");
    expect(r.suggestedKind).toBe("repair_record");
    expect(r.warnings.join(" ")).toMatch(/different action/);
  });
  it("warns when the document names another asset", () => {
    const r = interpretCheck({ document_type: "installation_record", kinds_satisfied: ["installation_record"], document_date: "2026-10-12",
      asset_tags: ["KO-3202"], summary: "", concerns: [] }, SENSOR_RULE, "KO-3201");
    expect(r.warnings.join(" ")).toMatch(/KO-3202/);
  });
  it("warns when no date can be read", () => {
    const r = interpretCheck({ document_type: "installation_record", kinds_satisfied: ["installation_record"], document_date: null,
      asset_tags: ["KO-3201"], summary: "", concerns: [] }, SENSOR_RULE, "KO-3201");
    expect(r.warnings.join(" ")).toMatch(/date/i);
  });
  it("a matching, dated document on the right asset has no warnings", () => {
    const r = interpretCheck({ document_type: "installation_record", kinds_satisfied: ["installation_record"], document_date: "2026-10-12",
      asset_tags: ["KO-3201"], summary: "", concerns: [] }, SENSOR_RULE, "KO-3201");
    expect(r.warnings).toEqual([]);
  });
});
