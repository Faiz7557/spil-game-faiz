// prototype/src/domain/refs.diagnosis.test.ts
import { describe, expect, it } from "vitest";
import { Ledger, parseRef } from "./refs";

describe("diagnosis refs", () => {
  it("parses computed and library refs", () => {
    expect(parseRef("PP:diag:KO-3201:w9")).toEqual({ source: "computed", kind: "diag", key: "KO-3201:w9" });
    expect(parseRef("PP:fc:KO-3201:w10")).toEqual({ source: "computed", kind: "fc", key: "KO-3201:w10" });
    expect(parseRef("FM:CO-1")).toEqual({ source: "library", kind: "failure_mode", key: "CO-1" });
    expect(parseRef("FM:nope")).toBeNull();
  });
  it("lets the ledger hold them", () => {
    const l = new Ledger();
    l.add("FM:PU-1", "x");
    expect(l.unknown(["FM:PU-1", "FM:PU-9"])).toEqual(["FM:PU-9"]);
  });
});
