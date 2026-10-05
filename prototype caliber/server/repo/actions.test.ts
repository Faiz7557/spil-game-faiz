import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SENSOR_RULE } from "../../src/domain/actionTransitions";
import { setDbForTests } from "../db.js";
import { HttpError } from "../http.js";
import { allowedPatch, fromRow, loadAction, toRow } from "./actions.js";

const row = {
  id: "a1", snapshot_id: "S", case_tag: "KO-3201", incident_id: "L3-2", title: "Verify sensor",
  source_action_ref: "R2 · X1", source_refs: ["EV-11"], rationale: "r", owner_label: "REL-05", due: "2026-10-16",
  scope: "s", dependency: "none", state: "assigned", rule: SENSOR_RULE, reviewer_label: "", effectiveness_result: "",
  execution_note: "", is_demo: false, created_by: "u1", created_at: "2026-10-02T00:00:00Z",
};

describe("action row mapping", () => {
  it("round-trips a SimAction", () => {
    const a = fromRow(row, [], []);
    expect(a.owner).toBe("REL-05");
    expect(a.rule.required).toContain("installation_record");
    expect(toRow(a)).toMatchObject({ owner_label: "REL-05", state: "assigned", due: "2026-10-16" });
  });
});

describe("allowedPatch", () => {
  it("drops fields that the current state does not let you edit", () => {
    expect(allowedPatch("ready_for_verification", { owner: "me", reviewer: "QA lead" })).toEqual({ reviewer: "QA lead" });
    expect(allowedPatch("assigned", { owner: "me" })).toEqual({});
  });
});

describe("loadAction authorization", () => {
  const fakeDb = (r: unknown) => {
    const q: any = { select: () => q, eq: () => q, order: () => q, in: () => q, maybeSingle: async () => ({ data: r }), then: (f: any) => f({ data: [] }) };
    return { from: () => q } as unknown as SupabaseClient;
  };
  it("a guest cannot open a team (non-demo) action", async () => {
    setDbForTests(fakeDb(row));
    const err = await loadAction("a1", { id: "g1", role: "viewer", isDemo: true, displayName: "Guest" }).catch((e) => e);
    expect(err).toBeInstanceOf(HttpError);
    expect(err.status).toBe(403);
  });
  it("another user's sandbox action is invisible (404)", async () => {
    setDbForTests(fakeDb({ ...row, is_demo: true, created_by: "someone-else" }));
    const err = await loadAction("a1", { id: "g1", role: "viewer", isDemo: true, displayName: "Guest" }).catch((e) => e);
    expect(err.status).toBe(404);
  });
});
