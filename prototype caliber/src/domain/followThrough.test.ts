// prototype/src/domain/followThrough.test.ts
import { describe, expect, it } from "vitest";
import type { Snapshot } from "./types";
import { expandTags, sisterAssets } from "./followThrough";
import snapJson from "../data/case2.json";

const snap = snapJson as unknown as Snapshot;

describe("expandTags", () => {
  it("expands shorthand lists", () => {
    expect(expandTags("Apply online water-in-oil monitoring to KO-3202/3203")).toEqual(["KO-3202", "KO-3203"]);
    expect(expandTags("Add PM-4405B/C to monthly vibration route")).toEqual(["PM-4405B", "PM-4405C"]);
    expect(expandTags("Apply interlock standard to all API-682 seal pumps in ARP")).toEqual([]);
  });
});

describe("sisterAssets", () => {
  it("lists named sister assets with the RCA slide they come from", () => {
    const ko = sisterAssets(snap, "KO-3201");
    expect(ko.filter((s) => s.kind === "named").map((s) => [s.tag, s.ref])).toEqual([["KO-3202", "R2:slide9"], ["KO-3203", "R2:slide9"]]);
  });
  it("keeps fleet-wide roll-outs without inventing tags", () => {
    const pu = sisterAssets(snap, "PU-2101B");
    expect(pu.some((s) => s.kind === "named" && s.tag === "PU-2101A")).toBe(true);
    expect(pu.some((s) => s.kind === "fleet" && s.tag === null && /API-682/.test(s.scope))).toBe(true);
    expect(sisterAssets(snap, "PM-4405B").some((s) => s.tag === "PM-4405C")).toBe(true);
  });
});

import { OBSERVATION_WEEKS_REQUIRED, effectiveness } from "./followThrough";

describe("effectiveness", () => {
  const byTag = (t: string) => snap.equipment.find((e) => e.tag === t)!;
  const rca = (t: string) => snap.rca.find((r) => r.tag === t);
  it("says recovered but window too short for most assets", () => {
    const e = effectiveness(byTag("KO-3201"), rca("KO-3201"));
    expect(e.weeksObserved).toBe(5);
    expect(e.required).toBe(OBSERVATION_WEEKS_REQUIRED);
    expect(e.verdict).toBe("recovered_window_short");
    expect(e.openSourceActions).toBe(5);
  });
  it("catches HE-3301 cold outlet temperature still below its band", () => {
    const e = effectiveness(byTag("HE-3301"), rca("HE-3301"));
    expect(e.verdict).toBe("not_recovered");
    expect(e.signals.find((s) => !s.ok)?.param).toMatch(/Cold Outlet Temp/);
  });
});
