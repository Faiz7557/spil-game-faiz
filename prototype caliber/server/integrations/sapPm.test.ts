import { describe, expect, it } from "vitest";
import { toSapCsv } from "./sapPm.js";

describe("toSapCsv", () => {
  it("maps actions to PM notification fields and escapes text", () => {
    const csv = toSapCsv([{ id: "a1", caseTag: "KO-3201", plant: "ZCU", title: 'Verify "online" sensor, KO-3201', due: "2026-10-16", owner: "REL-05", priorityClass: "A", sourceRefs: ["R2:slide9"] }]);
    const [header, row] = csv.trim().split("\n");
    expect(header).toBe("NotificationType,FunctionalLocation,Equipment,ShortText,Priority,RequiredEnd,ResponsiblePerson,PlantPulseRef,EvidenceRefs");
    expect(row).toBe('M2,ZCU,KO-3201,"Verify ""online"" sensor, KO-3201",1,20261016,REL-05,a1,R2:slide9');
  });
  it("truncates short text to SAP's 40 characters", () => {
    const csv = toSapCsv([{ id: "a", caseTag: "X", plant: "P", title: "x".repeat(60), due: "", owner: "", priorityClass: "C", sourceRefs: [] }]);
    expect(csv.split("\n")[1].split(",")[3]).toHaveLength(40);
  });
  it("defuses spreadsheet formulas in free-text fields", () => {
    const csv = toSapCsv([{ id: "a", caseTag: "X", plant: "P", title: "=HYPERLINK(\"http://evil\")", due: "", owner: "@SUM(A1)", priorityClass: "C", sourceRefs: [] }]);
    const row = csv.split("\n")[1];
    expect(row).toContain("\"'=HYPERLINK(\"\"http://evil\"\")\"");
    expect(row).toContain(",'@SUM(A1),");
  });
});
