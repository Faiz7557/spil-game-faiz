import { describe, expect, it } from "vitest";
import snap from "../../src/data/case2.json";
import type { Snapshot } from "../../src/domain/types";
import { linearFlag } from "./writeSnapshot.js";

describe("linearFlag", () => {
  it("reproduces the Python flags (validation check V20)", () => {
    const s = snap as unknown as Snapshot;
    const got = Object.fromEntries(s.equipment.map((e) => [e.tag, linearFlag(e)?.date ?? null]));
    expect(got).toEqual({ "PU-2101B": "2026-01-29", "KO-3201": "2026-03-25", "PM-4405B": "2026-05-27", "HE-3301": "2026-04-16", "BL-5702": "2026-05-13" });
    for (const e of s.equipment) expect(linearFlag(e)).toEqual(e.linear_flag);
  });
});
