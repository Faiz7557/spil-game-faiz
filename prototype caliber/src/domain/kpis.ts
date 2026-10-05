import type { Incident } from "./types";

export interface Filter { plant: string; year: string }
export const ALL = "ALL";

export function applyFilter(rows: Incident[], f: Filter) {
  return rows.filter((r) => (f.plant === ALL || r.plant === f.plant) && (f.year === ALL || r.occurred.startsWith(f.year)));
}

const sum = (rows: Incident[], key: "actual_usd" | "potential_usd") => rows.reduce((a, r) => a + (r[key] ?? 0), 0);

/** KPI dictionary §6.4. All values are recorded figures from the register, never forecasts. */
export function kpis(rows: Incident[], openStatuses: string[], reviewDate: string) {
  const open = rows.filter((r) => openStatuses.includes(r.status));
  const rcaDuePassed = open.filter((r) => r.rca_due !== null && r.rca_due < reviewDate);
  // Downtime summed in tenths to avoid float drift (source has one decimal).
  const downtime = rows.reduce((a, r) => a + Math.round((r.downtime_h ?? 0) * 10), 0) / 10;
  return {
    n: rows.length,
    actual: sum(rows, "actual_usd"),
    potential: sum(rows, "potential_usd"),
    downtime,
    open: open.length,
    openActual: sum(open, "actual_usd"),
    openPotential: sum(open, "potential_usd"),
    rcaDuePassed: rcaDuePassed.length,
    plants: new Set(rows.map((r) => r.plant)).size,
    firstDate: rows.length ? rows.reduce((m, r) => (r.occurred < m ? r.occurred : m), rows[0].occurred) : null,
    lastDate: rows.length ? rows.reduce((m, r) => (r.occurred > m ? r.occurred : m), rows[0].occurred) : null,
  };
}

export function groupSum(rows: Incident[], key: keyof Incident) {
  const m = new Map<string, { key: string; actual: number; potential: number; n: number }>();
  for (const r of rows) {
    const k = String(r[key]);
    const g = m.get(k) ?? { key: k, actual: 0, potential: 0, n: 0 };
    g.actual += r.actual_usd; g.potential += r.potential_usd; g.n += 1;
    m.set(k, g);
  }
  return [...m.values()].sort((a, b) => b.actual - a.actual || a.key.localeCompare(b.key));
}

export const usd = (v: number, digits = 0) =>
  "US$" + v.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
export const usdM = (v: number) => "US$" + (v / 1e6).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + "M";
export const fmtDate = (iso: string | null | undefined) => {
  if (!iso) return "unknown";
  const d = new Date(iso.slice(0, 10) + "T00:00:00Z");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
};
