import { describe, expect, it } from "vitest";
import { Ledger, parseRef } from "./refs";

describe("refs", () => {
  it("parses each ref family", () => {
    expect(parseRef("L3:row5")).toEqual({ source: "L3", kind: "row", key: "5" });
    expect(parseRef("R2:slide7")).toEqual({ source: "R2", kind: "slide", key: "7" });
    expect(parseRef("E2:hist:2026-04-29")).toEqual({ source: "E2", kind: "hist", key: "2026-04-29" });
    expect(parseRef("EV-11")).toEqual({ source: "curated", kind: "evidence", key: "EV-11" });
    expect(parseRef("nonsense")).toBeNull();
  });
  it("ledger only resolves refs that were actually retrieved", () => {
    const l = new Ledger();
    l.add("R2:slide9", "P2 Repair leaking lube-oil cooler tube … Closed");
    expect(l.resolve("R2:slide9")).toContain("Closed");
    expect(l.resolve("R2:slide10")).toBeNull();
    expect(l.unknown(["R2:slide9", "L3:row99"])).toEqual(["L3:row99"]);
  });
});
