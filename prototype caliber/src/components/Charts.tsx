import { useId, useMemo, type ReactNode } from "react";
import { Area, CartesianGrid, ComposedChart, Line, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from "recharts";
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";
import { Legend, TipCard } from "@/components/ui/chart";
import { cn } from "@/lib/utils";

export interface Series { name: string; color: string; values: (number | null)[]; dash?: string; width?: number; /** Draw a 10% wash under the line. Defaults to on for a lone solid series. */ fill?: boolean }
export interface RefLine { y: number; label: string; color: string }
export interface VMark { i: number; label: string; color?: string }
export interface Band { from: number; to: number; label: string; tone?: "anomaly" }

interface LineProps {
  series: Series[]; x: string[]; unit: string; height?: number; refs?: RefLine[]; marks?: VMark[]; bands?: Band[];
  xTick?: (label: string, i: number) => string | null; fmt?: (v: number) => string; title: string; showLegend?: boolean;
  yPad?: number;
}

/** CSS variables cannot drive SVG gradient stops reliably, so resolve the few the pages pass. */
const VAR_HEX: Record<string, string> = {
  "var(--series-1)": "var(--accent)", "var(--series-2)": "var(--series-2)", "var(--series-3)": "var(--series-3)", "var(--series-4)": "var(--series-4)",
  "var(--danger)": "var(--danger)", "var(--caution)": "var(--caution)", "var(--ok)": "var(--ok)", "var(--trail)": "var(--accent)", "var(--accent)": "var(--accent)",
  "var(--ink)": "var(--ink)", "var(--ink-2)": "var(--ink-2)", "var(--ink-3)": "var(--ink-3)", "var(--line)": "var(--line-strong)",
};
/** Colours written for the old light theme are re-pointed onto the dark palette. */
const LEGACY_HEX: Record<string, string> = { "#131a20": "var(--ink)", "#626e7a": "var(--ink-3)", "#44505c": "var(--ink-2)", "#b8322a": "var(--danger)", "#2c7549": "var(--ok)", "#7b2f8f": "var(--ai)", "#e8b623": "var(--caution)", "#2a5f9e": "var(--accent)", "#c8641a": "var(--series-2)" };
const hex = (c: string) => VAR_HEX[c] ?? LEGACY_HEX[c.toLowerCase()] ?? c;

function niceTicks(min: number, max: number, n = 4) {
  const span = max - min || 1;
  const step0 = span / n;
  const mag = 10 ** Math.floor(Math.log10(step0));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= step0) ?? step0;
  const lo = Math.floor(min / step) * step;
  const out: number[] = [];
  for (let v = lo; v <= max + step * 0.5; v += step) out.push(Number(v.toFixed(6)));
  return out;
}

/** Single-axis line chart with crosshair tooltip. Never mixes units: one chart per unit. */
export function LineChart({ series, x, unit, height = 200, refs = [], marks = [], bands = [], xTick, fmt = (v) => v.toFixed(1), title, showLegend = true, yPad = 0.06 }: LineProps) {
  const gid = useId().replace(/:/g, "");
  const { data, ticks, domain, xTicks } = useMemo(() => {
    const vals = series.flatMap((s) => s.values.filter((v): v is number => v !== null)).concat(refs.map((r) => r.y));
    let lo = Math.min(...vals), hi = Math.max(...vals);
    const pad = (hi - lo) * yPad || 1;
    const nonNeg = lo >= 0;
    lo -= pad; hi += pad;
    if (nonNeg && lo < 0) lo = 0;
    const t = niceTicks(lo, hi).filter((v) => !nonNeg || v >= 0);
    const rows = x.map((label, i) => {
      const row: Record<string, number | string | null> = { i, label };
      series.forEach((s, k) => { row[`s${k}`] = s.values[i] ?? null; });
      return row;
    });
    const xt = xTick ? x.map((l, i) => (xTick(l, i) ? i : -1)).filter((i) => i >= 0) : undefined;
    return { data: rows, ticks: t, domain: [Math.min(lo, t[0]), Math.max(hi, t[t.length - 1])] as [number, number], xTicks: xt };
  }, [series, x, refs, yPad, xTick]);

  const solo = series.length === 1;
  const Tip = ({ active, payload, label }: TooltipContentProps<ValueType, NameType>) => {
    if (!active || !payload?.length) return null;
    const i = Number(label);
    return (
      <TipCard title={x[i]} rows={series.map((s, k) => ({ s, k })).filter(({ s }) => s.values[i] != null).map(({ s }) => ({
        label: s.name, color: hex(s.color), dashed: !!s.dash, value: `${fmt(s.values[i]!)} ${unit}`,
      }))}
        foot={bands.filter((b) => i >= b.from && i <= b.to).map((b) => b.label).join(" · ") || undefined} />
    );
  };

  return (
    <figure className="tw m-0">
      {showLegend && series.length > 1 && (
        <Legend className="mb-2" items={series.map((s) => ({ label: s.name, color: hex(s.color), dashed: !!s.dash }))} />
      )}
      <div style={{ height }} role="img" aria-label={title}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: refs.length ? 72 : 12, bottom: 0, left: 0 }}>
            <defs>
              {series.map((s, k) => (
                <linearGradient key={k} id={`${gid}-${k}`} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor={hex(s.color)} stopOpacity={0.34} />
                  <stop offset="100%" stopColor={hex(s.color)} stopOpacity={0} />
                </linearGradient>
              ))}
              <pattern id={`${gid}-hatch`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="6" stroke="rgb(var(--tint-rgb)/0.18)" strokeWidth="2" />
              </pattern>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="i" type="number" domain={[0, Math.max(0, x.length - 1)]} ticks={xTicks} interval={0}
              tickFormatter={(i: number) => (xTick ? xTick(x[i], i) ?? "" : x[i] ?? "")} tickLine={false} axisLine={{ stroke: "rgb(var(--tint-rgb)/0.18)" }} dy={4} />
            <YAxis domain={domain} ticks={ticks} tickFormatter={(v: number) => fmt(v)} tickLine={false} axisLine={false} width={48}
              label={{ value: unit, position: "insideTopLeft", offset: 0, dy: -10, dx: 4, fill: "var(--ink-3)", fontSize: 10.5, fontWeight: 500 }} />
            {bands.map((b, k) => (
              <ReferenceArea key={`b${k}`} x1={b.from} x2={Math.max(b.to, b.from + 0.4)} ifOverflow="extendDomain"
                fill={b.tone === "anomaly" ? "rgb(var(--caution-rgb)/0.12)" : `url(#${gid}-hatch)`}
                stroke={b.tone === "anomaly" ? "rgb(var(--caution-rgb)/0.55)" : "none"} strokeDasharray={b.tone === "anomaly" ? "3 3" : undefined}
                label={{ value: b.label, position: "insideTopLeft", fill: b.tone === "anomaly" ? "var(--caution-ink)" : "var(--ink-3)", fontSize: 10.5 }} />
            ))}
            {refs.map((r) => (
              <ReferenceLine key={r.label} y={r.y} stroke={hex(r.color)} strokeDasharray="4 4" strokeWidth={1.2}
                label={{ value: r.label, position: "right", fill: hex(r.color), fontSize: 10.5, fontWeight: 600 }} />
            ))}
            {marks.map((m, k) => (
              <ReferenceLine key={`m${k}`} x={m.i} stroke={hex(m.color ?? "var(--ink-3)")} strokeDasharray="2 3"
                label={{ value: m.label, position: k % 2 ? "insideTopLeft" : "insideBottomLeft", fill: hex(m.color ?? "var(--ink-3)"), fontSize: 10.5 }} />
            ))}
            <Tooltip content={Tip} cursor={{ stroke: "rgb(var(--ink-rgb)/0.28)", strokeWidth: 1 }} isAnimationActive={false} />
            {series.map((s, k) => (s.fill ?? (solo && !s.dash)) ? (
              <Area key={k} type="monotone" dataKey={`s${k}`} name={s.name} stroke={hex(s.color)} strokeWidth={s.width ?? 2} strokeDasharray={s.dash}
                fill={`url(#${gid}-${k})`} connectNulls={false} dot={false} activeDot={{ r: 4.5, stroke: "var(--panel)", strokeWidth: 2 }} isAnimationActive animationDuration={800} />
            ) : (
              <Line key={k} type="monotone" dataKey={`s${k}`} name={s.name} stroke={hex(s.color)} strokeWidth={s.width ?? 2} strokeDasharray={s.dash}
                connectNulls={false} dot={false} activeDot={{ r: 4.5, stroke: "var(--panel)", strokeWidth: 2 }} isAnimationActive animationDuration={800} />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}

/** Horizontal paired bars: actual and potential loss stay two separate marks, separated by a surface gap. */
export function PairedBars({ rows, fmt, onPick, legend, active }: {
  rows: { key: string; a: number; b: number; note?: string }[]; fmt: (v: number) => string;
  onPick?: (key: string) => void; legend: [string, string]; active?: string;
}) {
  const max = Math.max(...rows.map((r) => r.a + r.b), 1);
  return (
    <div className="tw">
      <Legend className="mb-3" items={[{ label: legend[0], color: "var(--accent)", swatch: "bar" }, { label: legend[1], color: "var(--series-2)", swatch: "bar" }]} />
      <div className="flex flex-col gap-0.5">
        {rows.map((r) => (
          <button key={r.key} type="button" onClick={() => onPick?.(r.key)}
            title={`${r.key}: ${legend[0]} ${fmt(r.a)} · ${legend[1]} ${fmt(r.b)}`}
            className={cn("group grid w-full grid-cols-[56px_1fr_84px] items-center gap-3 rounded-lg px-2 py-[7px] text-left transition-colors hover:bg-fg/[0.04]",
              active && active !== r.key && "opacity-45", active === r.key && "bg-accent-soft")}>
            <span className="font-mono text-[12.5px] font-medium text-ink-2 group-hover:text-ink-hi">{r.key}</span>
            <span className="flex h-2.5 gap-[2px] overflow-hidden rounded-full bg-fg/[0.06]">
              <span className="h-full rounded-l-full transition-[width] duration-700 ease-out-soft" style={{ width: `${(r.a / max) * 100}%`, background: "var(--accent)" }} />
              <span className="h-full rounded-r-full transition-[width] duration-700 ease-out-soft" style={{ width: `${(r.b / max) * 100}%`, background: "var(--series-2)" }} />
            </span>
            <span className="text-right text-[12.5px] font-medium tabular-nums text-ink-hi">{fmt(r.a)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function Figure({ title, caption, children, right }: { title: string; caption?: ReactNode; children: ReactNode; right?: ReactNode }) {
  return (
    <div className="tw">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3">
        <h3 className="text-[14px] font-semibold text-ink">{title}</h3>{right}
      </div>
      {children}
      {caption && <p className="mt-2 text-[12px] leading-snug text-ink-3">{caption}</p>}
    </div>
  );
}
