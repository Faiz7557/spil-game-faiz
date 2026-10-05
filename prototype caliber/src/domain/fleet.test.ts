import { describe, expect, it } from "vitest";
import { SNAP } from "./data";
import { fleetReadings } from "./fleet";

describe("fleetReadings", () => {
  const fleet = fleetReadings(SNAP.equipment);
  it("reads the lead parameter of every documented asset from its last weekly route", () => {
    expect(fleet).toHaveLength(SNAP.equipment.length);
    const ko = fleet.find((f) => f.tag === "KO-3201")!;
    expect(ko.param).toMatchObject({ name: "DE Radial Vibration", alarm: 45, trip: 75, direction: "high" });
    expect(ko.latest).toMatchObject({ value: 27.234, date: "2026-06-03", status: "NORMAL" });
  });
  it("keeps the worst week and the weeks since the first TRIP", () => {
    const ko = fleet.find((f) => f.tag === "KO-3201")!;
    expect(ko.worst.value).toBeGreaterThan(ko.param.trip);
    expect(ko.weeksSinceTrip).toBe(5);
  });
});
