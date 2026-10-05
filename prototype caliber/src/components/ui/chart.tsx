/*
 * The chart kit. Every chart in the workspace speaks one language: 2px lines, a 10% area wash, 4px rounded bar
 * ends on a ghost track, hairline solid grids, a glass tooltip with tabular figures, and text that never wears the
 * series colour. Categorical hues come from --series-1..6 in fixed order (validated on the panel surface).
 */
import { useState, type ReactNode } from "react";
import {
  Bar, BarChart, Cell, Pie, PieChart, PolarAngleAxis, RadialBar, RadialBarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid,
  type TooltipContentProps,
} from "recharts";
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";
import { cn } from "@/lib/utils";

export const SERIES = ["var(--series-1)", "var(--series-2)", "var(--series-3)", "var(--series-4)", "var(--series-5)", "var(--series-6)"];
/** Literal hexes for places a CSS variable cannot reach (SVG gradient stops in some browsers, canvas). */
export const SERIES_HEX = ["var(--accent)", "var(--series-2)", "var(--series-3)", "var(--series-4)", "var(--series-5)", "var(--series-6)"];
export const STATUS_HEX = { ok: "var(--ok)", warn: "var(--caution)", danger: "var(--danger)", info: "var(--info)", ai: "var(--ai)", accent: "var(--accent)", muted: "var(--ink-4)" };

/* ---------- tooltip ---------- */

export interface TipRow { label: ReactNode; value: ReactNode; color?: string; dashed?: boolean }

/** The glass tooltip body, shared by Recharts and hand-drawn charts. */
export function TipCard({ title, rows, foot, className }: { title?: ReactNode; rows: TipRow[]; foot?: ReactNode; className?: string }) {
  return (
    <div className={cn("tw min-w-[150px] rounded-[10px] border border-line-strong bg-[rgba(17,27,46,0.94)] px-3 py-2.5 text-[12px] leading-snug text-ink shadow-[0_18px_40px_-12px_rgb(var(--shade-rgb)/calc(0.75*var(--shade-k)))] backdrop-blur-md", className)}>
      {title && <div className="mb-1.5 font-medium text-ink-hi">{title}</div>}
      <div className="flex flex-col gap-1">
        {rows.map((r, i) => (
          <div key={i} className="flex items-center gap-2">
            {r.color && <span className={cn("h-[3px] w-3 shrink-0 rounded-full", r.dashed && "h-0 border-t-2 border-dashed bg-transparent")} style={r.dashed ? { borderColor: r.color } : { background: r.color }} aria-hidden="true" />}
            <span className="text-ink-3">{r.label}</span>
            <span className="ml-auto pl-3 font-medium tabular-nums text-ink-hi">{r.value}</span>
          </div>
        ))}
      </div>
      {foot && <div className="mt-2 border-t border-line pt-1.5 text-[11px] text-ink-3">{foot}</div>}
    </div>
  );
}

/** Adapter: Recharts' tooltip `content` prop -> TipCard. */
export function rechartsTip(opts: { title?: (label: unknown, payload: readonly unknown[]) => ReactNode; fmt?: (v: number, name: string) => ReactNode; foot?: ReactNode } = {}) {
  return function Tip({ active, payload, label }: TooltipContentProps<ValueType, NameType>) {
    if (!active || !payload?.length) return null;
    return (
      <TipCard
        title={opts.title ? opts.title(label, payload) : String(label ?? "")}
        rows={payload.filter((p) => p.value != null).map((p) => ({
          label: p.name, color: (p.payload as { fill?: string })?.fill ?? p.color ?? p.stroke,
          value: opts.fmt ? opts.fmt(Number(p.value), String(p.name)) : String(p.value),
        }))}
        foot={opts.foot} />
    );
  };
}

/* ---------- legend ---------- */

export function Legend({ items, className }: { items: { label: ReactNode; color: string; dashed?: boolean; swatch?: "line" | "dot" | "bar" }[]; className?: string }) {
  return (
    <ul className={cn("tw flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-ink-2", className)}>
      {items.map((it, i) => (
        <li key={i} className="flex items-center gap-1.5">
          {it.swatch === "dot" ? <span className="size-2 rounded-full" style={{ background: it.color }} aria-hidden="true" />
            : it.swatch === "bar" ? <span className="h-2.5 w-2 rounded-[2px]" style={{ background: it.color }} aria-hidden="true" />
              : <span className={cn("w-3.5", it.dashed ? "border-t-2 border-dashed" : "h-[3px] rounded-full")} style={it.dashed ? { borderColor: it.color } : { background: it.color }} aria-hidden="true" />}
          {it.label}
        </li>
      ))}
    </ul>
  );
}

export { Sparkline } from "./sparkline";

/* ---------- donut ---------- */

export interface Slice { key: string; label: string; value: number; color: string }

/** Donut with a centre readout that follows the hovered slice. Slices are separated by a surface gap, not strokes. */
export function Donut({ data, size = 176, thickness = 18, center, fmt = (v) => v.toLocaleString(), onPick, activeKey }: {
  data: Slice[]; size?: number; thickness?: number; center?: { value: ReactNode; label: ReactNode };
  fmt?: (v: number) => string; onPick?: (key: string) => void; activeKey?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const total = data.reduce((s, d) => s + d.value, 0);
  const focus = hover !== null ? data[hover] : null;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data.filter((d) => d.value > 0)} dataKey="value" nameKey="label" innerRadius={size / 2 - thickness} outerRadius={size / 2 - 2}
            paddingAngle={data.length > 1 ? 2.5 : 0} cornerRadius={4} stroke="none" startAngle={90} endAngle={-270} isAnimationActive animationDuration={700}
            onMouseEnter={(_, i) => setHover(i)} onMouseLeave={() => setHover(null)} onClick={(d) => onPick?.((d as unknown as Slice).key)}>
            {data.filter((d) => d.value > 0).map((d, i) => (
              <Cell key={d.key} fill={d.color} cursor={onPick ? "pointer" : undefined}
                opacity={(hover !== null && hover !== i) || (activeKey && activeKey !== d.key) ? 0.35 : 1} style={{ transition: "opacity .2s" }} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="text-[22px] font-semibold leading-none tracking-[-0.03em] text-ink-hi tabular-nums">{focus ? fmt(focus.value) : center?.value ?? fmt(total)}</div>
          <div className="mt-1 max-w-[110px] text-[11px] leading-tight text-ink-3">{focus ? `${focus.label} · ${Math.round((focus.value / (total || 1)) * 100)}%` : center?.label ?? "total"}</div>
        </div>
      </div>
    </div>
  );
}

/* ---------- radial meter: one value against a whole ---------- */

export function RadialMeter({ value, max, color = STATUS_HEX.accent, size = 120, label, sub }: {
  value: number; max: number; color?: string; size?: number; label?: ReactNode; sub?: ReactNode;
}) {
  const pct = Math.max(0, Math.min(100, (value / (max || 1)) * 100));
  return (
    <div className="flex shrink-0 flex-col items-center" style={{ width: size }}>
    <div className="relative" style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart innerRadius="78%" outerRadius="100%" data={[{ v: pct }]} startAngle={220} endAngle={-40} barSize={10}>
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} axisLine={false} />
          <RadialBar dataKey="v" cornerRadius={6} fill={color} background={{ fill: "rgb(var(--tint-rgb)/0.1)" }} isAnimationActive animationDuration={900} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="text-[20px] font-semibold leading-none tracking-[-0.03em] text-ink-hi tabular-nums">{label ?? `${Math.round(pct)}%`}</div>
        </div>
      </div>
    </div>
      {/* the caption sits under the ring, never across the arc */}
      {sub && <div className="-mt-2 text-center text-[11.5px] leading-tight text-ink-3">{sub}</div>}
    </div>
  );
}

/* ---------- columns on a ghost track (reference: the "production performance" bars) ---------- */

export function TrackColumns({ data, color = STATUS_HEX.accent, height = 200, fmt = (v) => v.toLocaleString(), unit, onPick, activeKey, xLabel }: {
  data: { key: string; value: number; color?: string; note?: string }[]; color?: string; height?: number;
  fmt?: (v: number) => string; unit?: string; onPick?: (key: string) => void; activeKey?: string; xLabel?: (k: string) => string;
}) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -12 }} barCategoryGap="28%">
          <CartesianGrid vertical={false} />
          <XAxis dataKey="key" tickLine={false} axisLine={false} interval={0} tickFormatter={xLabel} dy={4} />
          <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => fmt(Number(v))} width={52} />
          <Tooltip cursor={false} content={rechartsTip({ fmt: (v) => `${fmt(v)}${unit ? ` ${unit}` : ""}`, title: (l, p) => <>{String(l)}{(p[0] as { payload?: { note?: string } })?.payload?.note && <span className="block text-[11px] font-normal text-ink-3">{(p[0] as { payload: { note: string } }).payload.note}</span>}</> })} />
          <Bar dataKey="value" name={unit ?? "value"} radius={[5, 5, 5, 5]} maxBarSize={24} background={{ fill: "rgb(var(--tint-rgb)/0.07)", radius: 5 }}
            isAnimationActive animationDuration={700} onClick={(d) => onPick?.((d as unknown as { key: string }).key)}>
            {data.map((d) => <Cell key={d.key} fill={d.color ?? color} cursor={onPick ? "pointer" : undefined} opacity={activeKey && activeKey !== d.key ? 0.35 : 1} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ---------- meter bar: label, value, track ---------- */

export function MeterRow({ label, value, max, color = STATUS_HEX.accent, display, hint, onClick, active }: {
  label: ReactNode; value: number; max: number; color?: string; display?: ReactNode; hint?: ReactNode; onClick?: () => void; active?: boolean;
}) {
  const pct = Math.max(0, Math.min(100, (value / (max || 1)) * 100));
  const Comp = onClick ? "button" : "div";
  return (
    <Comp type={onClick ? "button" : undefined} onClick={onClick}
      className={cn("group block w-full rounded-lg px-2 py-1.5 text-left transition-colors", onClick && "hover:bg-fg/[0.04]", active && "bg-accent-soft")}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-[13px]">
        <span className="min-w-0 text-ink-2 group-hover:text-ink">{label}</span>
        <span className="ml-auto font-medium tabular-nums text-ink-hi">{display ?? value.toLocaleString()}</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-fg/[0.07]">
        <div className="h-full rounded-full transition-[width] duration-700 ease-out-soft" style={{ width: `${pct}%`, background: color }} />
      </div>
      {hint && <div className="mt-1 text-[11px] text-ink-3">{hint}</div>}
    </Comp>
  );
}
