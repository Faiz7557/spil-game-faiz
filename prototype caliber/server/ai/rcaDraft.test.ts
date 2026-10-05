import { describe, expect, it } from "vitest";
import { SNAP } from "../../src/domain/data.js";
import { sanitizeDraft, similarCandidates } from "./rcaDraft.js";

describe("sanitizeDraft", () => {
  it("forces every checklist row to Not assessed and drops similar incidents that were not offered", () => {
    const d = sanitizeDraft({
      problem_statement: "x", checklist: [{ id: "P1", category: "4P", item: "Seal flush flow", status: "NG", data_needed: "flow log" }],
      similar: [{ ref: "L3:row10", why: "same component" }, { ref: "L3:row999", why: "invented" }],
      data_requests: [{ to_role: "PIC REL-05", request: "Send seal inspection photos" }], first_checks: ["Inspect seal faces"],
    }, new Set(["L3:row10"]));
    expect(d.checklist[0].status).toBe("Not assessed");
    expect(d.similar.map((s) => s.ref)).toEqual(["L3:row10"]);
  });
});

describe("similarCandidates", () => {
  it("never returns the target and only returns records sharing at least the component", () => {
    const target = SNAP.incidents[10];
    const sims = similarCandidates(target, SNAP.incidents);
    expect(sims.some((s) => s.id === target.id)).toBe(false);
    for (const s of sims) expect(s.component === target.component || (s.eq_type === target.eq_type && s.mechanism === target.mechanism)).toBe(true);
    expect(sims.length).toBeLessThanOrEqual(8);
  });
});
