import { describe, expect, it } from "vitest";
import { Ledger } from "../../src/domain/refs.js";
import { structuralGuard } from "./evidenceGuard.js";

describe("structuralGuard", () => {
  const l = new Ledger(); l.add("R2:slide9", "… Closed …"); l.add("L3:row5", "KO-3201 actual 1584000 USD");
  it("marks sentences with unknown refs or no refs as unsupported before any model call", () => {
    const r = structuralGuard({ sentences: [
      { text: "Repair is closed.", refs: ["R2:slide9"], kind: "fact" },
      { text: "AI saved US$1.5M.", refs: [], kind: "fact" },
      { text: "Loss was 1,584,000.", refs: ["L3:row99"], kind: "fact" },
      { text: "Consider a lab sample.", refs: [], kind: "recommendation" },
    ], abstentions: [], follow_ups: [] }, l);
    expect(r.map((x) => x.status)).toEqual(["pending", "unsupported", "unsupported", "not_required"]);
    expect(r[2].reason).toMatch(/L3:row99/);
  });
  it("flags numbers that appear in no cited excerpt", () => {
    const r = structuralGuard({ sentences: [{ text: "Loss was US$2,000,000.", refs: ["L3:row5"], kind: "fact" }], abstentions: [], follow_ups: [] }, l);
    expect(r[0].status).toBe("unsupported");
    expect(r[0].reason).toMatch(/2,000,000/);
  });
  it("matches ISO dates against the dd-Mon-yyyy form the RCA decks use, and rejects a wrong day", () => {
    const k = new Ledger(); k.add("R2:slide9", "Install online water-in-oil sensor · 30-Jun-2026 · REL-05 · In Progress");
    const r = structuralGuard({ sentences: [
      { text: "The sensor install was due 2026-06-30 and is In Progress.", refs: ["R2:slide9"], kind: "fact" },
      { text: "The sensor install was due 2026-07-30.", refs: ["R2:slide9"], kind: "fact" },
    ], abstentions: [], follow_ups: [] }, k);
    expect(r.map((x) => x.status)).toEqual(["pending", "unsupported"]);
    expect(r[1].reason).toMatch(/2026-07-30/);
  });
  it("treats asset tags as identifiers, not numbers", () => {
    const k = new Ledger(); k.add("E2:hist:2026-04-29", "DE radial vibration 75 micron · TRIP");
    const r = structuralGuard({ sentences: [
      { text: "KO-3201 recorded 75 micron DE vibration at the trip.", refs: ["E2:hist:2026-04-29"], kind: "fact" },
      { text: "KO-3201 recorded 80 micron at the trip.", refs: ["E2:hist:2026-04-29"], kind: "fact" },
    ], abstentions: [], follow_ups: [] }, k);
    expect(r.map((x) => x.status)).toEqual(["pending", "unsupported"]);
    expect(r[1].reason).toMatch(/80/);
  });
  it("accepts rounded or scaled forms of a cited number, but not a different number", () => {
    const k = new Ledger(); k.add("L3:kpi:all:all", '{"n":380,"actual":61886460}');
    const r = structuralGuard({ sentences: [
      { text: "Recorded actual loss is US$61.89M across 380 records.", refs: ["L3:kpi:all:all"], kind: "fact" },
      { text: "Recorded actual loss is US$62.5M.", refs: ["L3:kpi:all:all"], kind: "fact" },
    ], abstentions: [], follow_ups: [] }, k);
    expect(r.map((x) => x.status)).toEqual(["pending", "unsupported"]);
  });
});
