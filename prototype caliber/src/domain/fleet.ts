import type { Equipment } from "./types";

export interface FleetReading {
  tag: string; name: string; plant: string;
  param: { name: string; unit: string; alarm: number; trip: number; direction: "high" | "low" };
  latest: { value: number; date: string; week: number; status: string };
  /** The worst weekly reading of the same parameter, and the week the route first recorded TRIP. */
  worst: { value: number; date: string };
  tripDate: string | null;
  weeksSinceTrip: number | null;
}

/**
 * The lead parameter of each asset (the first one the equipment sheet lists) read against its own limits:
 * the last weekly route and the worst week. Values come straight from the condition history.
 */
export function fleetReadings(equipment: Equipment[]): FleetReading[] {
  return equipment.map((e) => {
    const p = e.params[0];
    const dir = p.direction === "low" ? "low" : "high";
    const last = e.history[e.history.length - 1];
    const worst = e.history.reduce((w, h) => (dir === "high" ? h.values[0] > w.values[0] : h.values[0] < w.values[0]) ? h : w, e.history[0]);
    const trip = e.history.find((h) => h.status === "TRIP") ?? null;
    return {
      tag: e.tag, name: e.name.replace(` ${e.tag}`, ""), plant: e.plant_unit,
      param: { name: p.name, unit: p.unit, alarm: p.alarm, trip: p.trip, direction: dir },
      latest: { value: last.values[0], date: last.date, week: last.week, status: last.status },
      worst: { value: worst.values[0], date: worst.date },
      tripDate: trip?.date ?? null,
      weeksSinceTrip: trip ? last.week - trip.week : null,
    };
  });
}
