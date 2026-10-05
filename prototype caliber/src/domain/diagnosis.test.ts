// prototype/src/domain/diagnosis.test.ts
import { describe, expect, it } from "vitest";
import type { Equipment } from "./types";
import { diagnose, firstDiagnosableWeek, observe, scoreMode, signalKind } from "./diagnosis";
import { modeById } from "./failureModes";
import snapJson from "../data/case2.json";

const snap = snapJson as unknown as { equipment: Equipment[] };
const byTag = (t: string) => snap.equipment.find((e) => e.tag === t)!;

function fake(type: string, names: string[], rows: number[][]): Equipment {
  return {
    tag: "XX-0001", type, params: names.map((name) => ({ name, unit: "u", alarm: 0, trip: 0, direction: "high" as const })),
    history: rows.map((values, i) => ({ week: i + 1, date: `2026-01-${String(i + 1).padStart(2, "0")}`, values, status: "NORMAL", remark: null, row: i + 2 })),
  } as unknown as Equipment;
}
const base = [[10, 100], [10.2, 101], [9.8, 99], [10.1, 100.5], [9.9, 99.5], [10, 100]];

describe("signalKind", () => {
  it("maps every parameter in the case files", () => {
    for (const e of snap.equipment) for (const p of e.params) expect(signalKind(p.name), p.name).not.toBeNull();
    expect(signalKind("Lube Oil Water Content")).toBe("lube_water");
    expect(signalKind("Motor DE Bearing Temp")).toBe("bearing_temp");
    expect(signalKind("Tube-side dP")).toBe("dp");
  });
});

describe("observe and score", () => {
  it("flags readings 3 sd or more from the baseline", () => {
    const e = fake("Centrifugal Pump", ["Overall Vibration", "Discharge Pressure"], [...base, [12, 100.2]]);
    const o = observe(e, 6);
    expect(o.map((x) => [x.kind, x.dir])).toEqual([["vibration", 1], ["discharge_press", 0]]);
  });
  it("scores a mode the way the 2 Oct prototype did", () => {
    const obs = observe(byTag("KO-3201"), 9); // first ALARM week
    expect(obs.map((o) => o.dir)).toEqual([1, 1, -1, 1]);
    expect(scoreMode(modeById("CO-1")!, obs).score).toBe(0.75);
    expect(scoreMode(modeById("CO-2")!, obs).score).toBe(0.625);
  });
});

describe("diagnose", () => {
  it("abstains with fewer than two symptoms or an unknown type", () => {
    expect(diagnose(fake("Centrifugal Pump", ["Overall Vibration", "Discharge Pressure"], [...base, [12, 100.2]]), 6).abstain).toMatch(/Only 1 signal/);
    expect(diagnose(fake("Agitator", ["Overall Vibration"], [...base, [12]]), 6).abstain).toMatch(/No failure-mode library/);
  });
  it("finds the first week with enough symptoms", () => {
    expect(Object.fromEntries(snap.equipment.map((e) => [e.tag, firstDiagnosableWeek(e)]))).toEqual({
      "PU-2101B": 8, "KO-3201": 7, "PM-4405B": 8, "HE-3301": 7, "BL-5702": 7,
    });
  });
  it("is honest about early ambiguity", () => {
    expect(diagnose(byTag("KO-3201"), 7).leading).toEqual(["CO-1", "CO-4", "CO-5"]);
    expect(diagnose(byTag("BL-5702"), 7).leading).toEqual(["BL-4"]); // wrong early; documented, not hidden
  });
});

import gold from "../data/diagnosis_gold.json";
import { lockOn } from "./diagnosis";

describe("lockOn", () => {
  it("records when the documented cause becomes the unique leading hypothesis", () => {
    const strip = (t: string) => lockOn(byTag(t), (gold.cases as Record<string, { mode: string }>)[t].mode)
      .map((x) => ({ abstain: ".", unique: "U", tied: "T", wrong: "X" })[x.state]).join("");
    expect(strip("PU-2101B")).toBe("..TUUUUUUUUUUU");
    expect(strip("KO-3201")).toBe(".TUUUUUUUUUUUU");
    expect(strip("PM-4405B")).toBe("..UUUUUUUUUUUU");
    expect(strip("HE-3301")).toBe(".UUUUUUUUUUUUU");
    expect(strip("BL-5702")).toBe(".XUUUUUUUUUUUU");
  });
});
