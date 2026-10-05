import { describe, expect, it } from "vitest";
import { SNAP, REVIEW_DATE } from "./data";
import { buildCheckup, summarise } from "./checkup";

const ko = SNAP.equipment.find((e) => e.tag === "KO-3201")!;
const rca = SNAP.rca.find((r) => r.tag === "KO-3201");

describe("machine checkup", () => {
  it("lists four parameters, every RCA action and the reviewer sign-off", () => {
    const checks = buildCheckup(ko, rca, ko.history.length - 1, REVIEW_DATE, false);
    expect(checks.filter((c) => c.group === "condition")).toHaveLength(4);
    expect(checks.filter((c) => c.group === "follow-through")).toHaveLength(rca!.actions.length + rca!.preventive.length);
    expect(checks[checks.length - 1].state).toBe("pending");
  });

  it("fails actions past their plan date and passes closed ones", () => {
    const checks = buildCheckup(ko, rca, ko.history.length - 1, REVIEW_DATE, false);
    const acts = checks.filter((c) => c.group === "follow-through");
    expect(acts.find((c) => c.label.startsWith("Repair leaking"))!.state).toBe("pass");
    expect(acts.find((c) => c.label.startsWith("Install online water-in-oil"))!.state).toBe("fail");
    expect(acts.find((c) => c.label.startsWith("Retube"))!.state).toBe("pending");
  });

  it("marks the trip week's out-of-limit readings", () => {
    const trip = ko.history.findIndex((h) => h.status === "TRIP");
    const s = summarise(buildCheckup(ko, rca, trip, REVIEW_DATE, false).filter((c) => c.group === "condition"));
    expect(s.warn + s.fail).toBeGreaterThan(0);
  });

  it("counts a reviewer verification as a pass", () => {
    expect(buildCheckup(ko, rca, 0, REVIEW_DATE, true).slice(-1)[0].state).toBe("pass");
  });
});
