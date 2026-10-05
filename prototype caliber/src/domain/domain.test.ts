// Executable versions of the reference tasks in design §10.6 that the domain layer can answer.
import { describe, expect, it } from "vitest";
import { BRIEFS, EMAP, REVIEW_DATE, SNAP, rcaByTag } from "./data";
import { ALL, applyFilter, kpis } from "./kpis";
import { actionDue, buildQueue } from "./queue";
import { SENSOR_RULE, closureCheck, guard, transition, type SimAction } from "./actionTransitions";

const base = (): SimAction => ({
  id: "A1", caseTag: "KO-3201", title: "Verify sensor", sourceActionRef: "R2 slide 9 / X1", sourceRefs: ["EV-11"],
  rationale: "Plan date passed", owner: "REL-05", ownerRole: "Reliability engineer", due: "2026-10-16", scope: "KO-3201",
  dependency: "none", state: "draft", evidence: [], rule: SENSOR_RULE, reviewer: "", effectivenessResult: "",
  executionNote: "", log: [], createdAt: "2026-10-02",
});

describe("G01 actual vs potential loss", () => {
  it("keeps actual and potential separate", () => {
    const k = kpis(SNAP.incidents, SNAP.meta.open_statuses, REVIEW_DATE);
    expect(k.actual).toBe(61_886_460);
    expect(k.potential).toBe(5_307_970);
    expect(k.open).toBe(220);
    expect(k.rcaDuePassed).toBe(183);
    expect(k.downtime).toBe(2261.1);
  });
});

describe("G02 AR placeholder is not an identity", () => {
  it("keeps 226 n/a rows as distinct incidents", () => {
    const na = SNAP.incidents.filter((i) => i.ar === null);
    expect(na.length).toBe(226);
    expect(new Set(na.map((i) => i.id)).size).toBe(226);
  });
});

describe("G03/G04 KO-3201 follow-up", () => {
  const rca = rcaByTag("KO-3201")!;
  it("repair closed does not close the rest", () => {
    expect(rca.actions.map((a) => actionDue(a, REVIEW_DATE))).toEqual(["closed", "plan_passed", "not_due", "plan_passed"]);
  });
  it("retube (31 Oct) is not overdue on 2 Oct", () => {
    const retube = rca.actions.find((a) => a.text.startsWith("Retube"))!;
    expect(actionDue(retube, REVIEW_DATE)).toBe("not_due");
  });
  it("preventive actions without status are never treated as closed", () => {
    expect(rca.preventive.every((a) => actionDue(a, REVIEW_DATE) === "no_status_plan_passed")).toBe(true);
  });
});

describe("G06 closing the sensor action with cooler-repair evidence", () => {
  it("is blocked and explains why", () => {
    let a = base();
    a = transition(a, "reviewed", "t", "", "t");
    a = transition(a, "assigned", "t", "", "t");
    a = transition(a, "in_progress", "t", "", "t");
    a = { ...a, executionNote: "Reported done" };
    a = transition(a, "execution_reported", "t", "", "t");
    a = { ...a, evidence: [{ id: "S1", kind: "repair_record", label: "Cooler repair", dated: "2026-04-30", ref: "EV-11", simulated: true, addedAt: "t" }] };
    a = transition(a, "evidence_submitted", "t", "", "t");
    const g = guard(a, "ready_for_verification");
    expect(g.ok).toBe(false);
    expect(g.unmet.join(" ")).toMatch(/Installation/);
    expect(g.unmet.join(" ")).toMatch(/different action/);
    expect(closureCheck(a).ok).toBe(false);
  });
  it("reviewer cannot be the owner", () => {
    const a = { ...base(), state: "ready_for_verification" as const, reviewer: "REL-05", effectivenessResult: "ok",
      evidence: SENSOR_RULE.required.map((k, i) => ({ id: "E" + i, kind: k, label: k, dated: "2026-10-10", ref: "", simulated: true as const, addedAt: "t" })) };
    expect(guard(a, "verified").unmet).toContain("The reviewer cannot be the action owner.");
    expect(guard({ ...a, reviewer: "Lead engineer" }, "verified").ok).toBe(true);
  });
});

describe("G07/G08 masked run hygiene", () => {
  const masked = BRIEFS.find((b) => b.mode === "masked_diagnostic")!;
  it("does not receive the target fields or RCA", () => {
    expect(masked.manifest.allowed_evidence).toEqual(["M-01", "M-02", "M-03"]);
    const text = JSON.stringify(masked.evidence);
    expect(text).not.toMatch(/Dominant Failure Mode|Bearing Distress|AR-2026-ZCU-0142|2026-04-29/);
  });
  it("cites only allowlisted evidence and makes no documented findings", () => {
    expect(masked.validation.structural_pass).toBe(true);
    expect(masked.brief.documented_findings).toHaveLength(0);
  });
});

describe("G09 filter changes the denominator", () => {
  it("ZCU subset recomputes counts", () => {
    const rows = applyFilter(SNAP.incidents, { plant: "ZCU", year: ALL });
    const k = kpis(rows, SNAP.meta.open_statuses, REVIEW_DATE);
    expect(k.n).toBe(62);
    expect(k.n).not.toBe(380);
    expect(k.actual).toBeLessThan(61_886_460);
  });
});

describe("Queue ordering", () => {
  it("puts KO-3201 first under default rules", () => {
    const q = buildQueue(SNAP.equipment, SNAP.rca, SNAP.incidents, REVIEW_DATE, new Set(), { "KO-3201": EMAP.conflicts.length });
    expect(q[0].tag).toBe("KO-3201");
    expect(q.every((i) => i.category === "followup")).toBe(true);
  });
});

import { buildTank } from "./tank";
describe("Problem Tank prioritization", () => {
  const detailed = new Set(SNAP.equipment.map((e) => e.linked_incident!));
  const tank = buildTank(SNAP.incidents, SNAP.meta.open_statuses, REVIEW_DATE, detailed);
  it("covers every open-status record exactly once", () => {
    expect(tank).toHaveLength(220);
    expect(new Set(tank.map((t) => t.incident.id)).size).toBe(220);
  });
  it("orders by category, then source Pre-Risk", () => {
    const inv = tank.filter((t) => t.category === "investigation");
    expect(tank[0].category).toBe("investigation");
    const ranks = inv.map((t) => ["I", "II", "III", "IV"].indexOf(t.incident.pre_risk));
    expect([...ranks].sort((a, b) => a - b)).toEqual(ranks);
  });
  it("flags the five detailed cases and keeps them in the tank", () => {
    expect(tank.filter((t) => t.detailed)).toHaveLength(5);
  });
});
