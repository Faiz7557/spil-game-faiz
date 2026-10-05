// Arc gauge for one condition parameter read against its own alarm and trip limits. A thick arc fills from the
// safe end toward the trip end as the reading closes in on its limit, coloured by the zone it is in; a thin outer
// band shows where normal, alarm and trip sit; an optional ghost marker shows an earlier reading (the worst week).
// Works for "high is bad" and "low is bad" parameters.
import { useId } from "react";
import { cn } from "@/lib/utils";

export interface GaugeProps {
  value: number;
  alarm: number;
  trip: number;
  direction: "high" | "low";
  /** An earlier reading to mark on the arc, such as the worst week. */
  ghost?: number;
  /** Kept for older call sites; the gauge follows the page theme through CSS tokens. */
  theme?: "dark" | "light";
  className?: string;
  label?: string;
}

const START = Math.PI, SWEEP = Math.PI; // left to right over the top
const ZONE_VAR = { ok: "var(--ok)", alarm: "var(--caution)", trip: "var(--danger)" } as const;

export function Gauge({ value, alarm, trip, direction, ghost, className, label }: GaugeProps) {
  const id = useId().replace(/:/g, "");
  // Scale: for high-is-bad, 0 → trip×1.25; for low-is-bad, the arc runs from good (left) to trip and beyond (right).
  const lo = direction === "high" ? 0 : Math.max(0, trip - (alarm - trip) * 2.2);
  const hi = direction === "high" ? trip * 1.25 : alarm + (alarm - trip) * 2.2;
  const frac = (v: number) => {
    const f = Math.min(1, Math.max(0, (v - lo) / (hi - lo)));
    return direction === "high" ? f : 1 - f;
  };
  const cx = 100, cy = 100, r = 74, rb = 90;
  const pt = (f: number, rr = r) => [cx + rr * Math.cos(START + SWEEP * f), cy + rr * Math.sin(START + SWEEP * f)] as const;
  const arc = (a: number, b: number, rr = r) => {
    const [x1, y1] = pt(a, rr), [x2, y2] = pt(b, rr);
    return `M${x1.toFixed(2)} ${y1.toFixed(2)} A${rr} ${rr} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
  };
  const fa = frac(alarm), ft = frac(trip), fv = Math.max(0.015, frac(value));
  const zone = gaugeZone(value, alarm, trip, direction);
  const col = ZONE_VAR[zone];
  const [vx, vy] = pt(fv, r);
  const tri = (f: number, rr: number, size = 7) => {
    const [x, y] = pt(f, rr);
    const a = START + SWEEP * f;
    // a small triangle pointing at the arc
    const ux = Math.cos(a), uy = Math.sin(a), tx = -uy, ty = ux;
    return `M${(x - ux * 2).toFixed(2)} ${(y - uy * 2).toFixed(2)} L${(x + ux * size + tx * size * 0.6).toFixed(2)} ${(y + uy * size + ty * size * 0.6).toFixed(2)} L${(x + ux * size - tx * size * 0.6).toFixed(2)} ${(y + uy * size - ty * size * 0.6).toFixed(2)} Z`;
  };
  return (
    <svg viewBox="0 0 200 112" className={cn("block w-full overflow-visible", className)} role="img"
      aria-label={label ?? `Reading ${value}, alarm ${alarm}, trip ${trip}: ${zone === "ok" ? "normal" : zone}`}>
      <defs>
        <linearGradient id={`g${id}`} gradientUnits="userSpaceOnUse" x1="26" y1="100" x2={vx.toFixed(1)} y2={vy.toFixed(1)}>
          <stop offset="0" style={{ stopColor: col, stopOpacity: 0.35 }} />
          <stop offset="1" style={{ stopColor: col, stopOpacity: 1 }} />
        </linearGradient>
      </defs>
      {/* zone band */}
      <path d={arc(0, fa, rb)} fill="none" style={{ stroke: "var(--ok)" }} strokeOpacity="0.55" strokeWidth="3" />
      <path d={arc(fa, ft, rb)} fill="none" style={{ stroke: "var(--caution)" }} strokeOpacity="0.75" strokeWidth="3" />
      <path d={arc(ft, 1, rb)} fill="none" style={{ stroke: "var(--danger)" }} strokeOpacity="0.75" strokeWidth="3" />
      {/* track and filled value arc */}
      <path d={arc(0, 1)} fill="none" style={{ stroke: "rgb(var(--tint-rgb) / 0.13)" }} strokeWidth="16" strokeLinecap="round" />
      <path d={arc(0, fv)} fill="none" stroke={`url(#g${id})`} strokeWidth="16" strokeLinecap="round" className="transition-[d] duration-500" />
      {/* threshold ticks across the track */}
      {[fa, ft].map((f, i) => {
        const [x1, y1] = pt(f, r - 10), [x2, y2] = pt(f, r + 10);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} style={{ stroke: i ? "var(--danger)" : "var(--caution)" }} strokeWidth="2" strokeLinecap="round" />;
      })}
      {/* the reading: a bright cap at the arc's end */}
      <circle cx={vx} cy={vy} r="5" style={{ fill: "var(--ink-hi)", stroke: col }} strokeWidth="3" />
      {ghost !== undefined && <path d={tri(frac(ghost), rb + 3)} style={{ fill: "var(--danger-ink)" }} />}
    </svg>
  );
}

export function gaugeZone(value: number, alarm: number, trip: number, direction: "high" | "low") {
  return direction === "high" ? (value >= trip ? "trip" : value >= alarm ? "alarm" : "ok") : (value <= trip ? "trip" : value <= alarm ? "alarm" : "ok");
}
