import { describe, expect, it } from "vitest";
import { SNAP } from "../../src/domain/data.js";
import { Ledger } from "../../src/domain/refs.js";
import { runTool } from "./copilotTools.js";

describe("copilot tools", () => {
  it("get_kpis returns code-computed numbers and records a ref", async () => {
    const l = new Ledger();
    const out: any = await runTool("get_kpis", { plant: "ZCU" }, { snap: SNAP, ledger: l });
    expect(out.n).toBe(62);
    expect(out.ref).toBe("L3:kpi:ZCU:all");
    expect(l.resolve("L3:kpi:ZCU:all")).toContain("\"n\":62");
  });
  it("get_case reports KO-3201 action due states", async () => {
    const l = new Ledger();
    const out: any = await runTool("get_case", { tag: "KO-3201" }, { snap: SNAP, ledger: l });
    expect(out.actions.map((a: any) => a.due_state)).toEqual(["closed", "plan_passed", "not_due", "plan_passed", "no_status_plan_passed", "no_status_plan_passed"]);
    expect(l.resolve("R2:slide9")).toContain("Closed");
  });
  it("unknown tool returns an error object, not a throw", async () => {
    const out: any = await runTool("drop_tables", {}, { snap: SNAP, ledger: new Ledger() });
    expect(out.error).toMatch(/unknown tool/i);
  });
});
