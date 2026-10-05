import { describe, expect, it } from "vitest";
import { can, type AppUser } from "./auth.js";

const u = (role: AppUser["role"], isDemo = false): AppUser => ({ id: "u", role, isDemo, displayName: "x" });

describe("permissions", () => {
  it("viewer can read and ask the copilot but cannot change actions", () => {
    expect(can(u("viewer"), "copilot")).toBe(true);
    expect(can(u("viewer"), "action.write")).toBe(false);
  });
  it("demo guests act as engineer and reviewer, but only in their sandbox", () => {
    expect(can(u("viewer", true), "action.write")).toBe(true);
    expect(can(u("viewer", true), "action.verify")).toBe(true);
    expect(can(u("viewer", true), "ingest")).toBe(false);
  });
  it("only data owners ingest and publish", () => {
    expect(can(u("engineer"), "ingest")).toBe(false);
    expect(can(u("data_owner"), "ingest")).toBe(true);
  });
  it("only reviewers and managers verify", () => {
    expect(can(u("engineer"), "action.verify")).toBe(false);
    expect(can(u("reviewer"), "action.verify")).toBe(true);
  });
});
