import { describe, expect, it } from "vitest";
import { runGates } from "./validate.js";
import snap from "../../src/data/case2.json";

describe("quality gates", () => {
  it("pass on the validated snapshot", () => {
    const r = runGates(snap as any);
    expect(r.blocking).toEqual([]);
    expect(r.checks.find((c) => c.id === "identity.unique_ids")!.pass).toBe(true);
  });
  it("block publish on duplicate snapshot IDs or a broken loss identity", () => {
    const bad: any = structuredClone(snap);
    bad.incidents[1].id = bad.incidents[0].id;
    bad.incidents[2].total_usd += 1;
    const r = runGates(bad);
    expect(r.blocking.map((c) => c.id).sort()).toEqual(["financial.loss_identity", "identity.unique_ids"]);
  });
});
