// prototype/src/components/ForecastPanel.tsx
// "Window to act": a zero-shot condition forecast made at the first alarm, read as a range of weeks until each
// limit, never as a failure date. The backtest block keeps the linear baseline next to it, honestly.
import { useState } from "react";
import { Timer } from "lucide-react";
import { equipmentByTag } from "../domain/data";
import { FORECAST, windowText, type Window } from "../domain/conditionForecast";
import { fmtDate } from "../domain/kpis";
import { LineChart } from "./Charts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MeterRow } from "@/components/ui/chart";
import { cn } from "@/lib/utils";

const HORIZON = 8; // weeks the model forecasts past the cutoff

export default function ForecastPanel({ tag }: { tag: string }) {
  const eq = equipmentByTag(tag)!;
  const f = FORECAST.weekly[tag];
  const [pi, setPi] = useState(0);
  if (!f) return (
    <Card id="window" className="scroll-mt-4">
      <CardHeader><CardTitle icon={Timer}>Window to act</CardTitle></CardHeader>
      <CardContent className="pt-2">
        <p className="text-[13.5px] text-ink-2">
          Forecast model not run in this build. Linear 6-week trend: {eq.linear_flag ? `flag on ${fmtDate(eq.linear_flag.date)} (${eq.linear_flag.parameter}, ~${eq.linear_flag.horizon_weeks} weeks to trip limit)` : "no flag"}.
        </p>
      </CardContent>
    </Card>
  );
  const p = f.params[pi];
  const c = f.cutoff_index;
  const n = Math.min(eq.history.length, c + 1 + p.q50.length);
  const x = eq.history.slice(0, n).map((h) => h.date.slice(5));
  const pad = (arr: number[]) => [...Array<null>(c + 1).fill(null), ...arr].slice(0, n);
  const bt = FORECAST.backtest;
  const linearBetter = !!bt && ((bt.linear_mae != null && bt.mae_likely != null && bt.linear_mae < bt.mae_likely) || bt.linear_missed < bt.missed_likely);
  const fmt = (v: number) => (Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(2).replace(/\.?0+$/, ""));

  return (
    <Card id="window" className="scroll-mt-4">
      <CardHeader action={<Badge tone="neutral" className="b-proposed">Forecast, not a failure date</Badge>}>
        <CardTitle icon={Timer}>Window to act</CardTitle>
        <CardDescription>
          Made on {fmtDate(f.cutoff_date)} (first alarm) with {FORECAST.model} (zero-shot). Weeks are counted from that date. Grey dashed = what actually
          happened later, shown for evaluation.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-3">
        <div className="mb-4 max-w-full overflow-x-auto">
          <div className="seg" role="group" aria-label="Forecast parameter">
            {f.params.map((q, i) => <button key={q.name} type="button" aria-pressed={pi === i} onClick={() => setPi(i)} className="whitespace-nowrap">{q.name}</button>)}
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(250px,1fr)]">
          <div className="min-w-0">
            <div className="mb-1 text-[13px] font-medium text-ink-2">{p.name} <span className="text-ink-3">({p.unit})</span></div>
            <LineChart title={`${tag} ${p.name} forecast`} unit={p.unit} height={230} x={x} fmt={fmt}
              refs={[{ y: p.alarm, label: "Alarm", color: "var(--caution)" }, { y: p.trip, label: "Trip", color: "var(--danger)" }]}
              marks={[{ i: c, label: "Forecast made", color: "var(--ink-3)" }]}
              series={[
                { name: "Reading up to forecast date", color: "var(--ink)", values: eq.history.slice(0, n).map((h, i) => (i <= c ? h.values[pi] : null)) },
                { name: "Later readings (evaluation)", color: "var(--ink-3)", dash: "2 3", values: eq.history.slice(0, n).map((h, i) => (i > c ? h.values[pi] : null)) },
                { name: "P50", color: "var(--series-1)", values: pad(p.q50) },
                { name: "P10", color: "var(--series-1)", dash: "4 3", width: 1, values: pad(p.q10) },
                { name: "P90", color: "var(--series-1)", dash: "4 3", width: 1, values: pad(p.q90) },
              ]} />
          </div>

          <div className="flex min-w-0 flex-col gap-4">
            <WindowRow label="Alarm limit reached in" w={p.alarm_window} tone="alarm" />
            <WindowRow label="Trip limit reached in" w={p.trip_window} tone="trip"
              linear={p.linear_trip_offset} actual={p.actual_trip_offset} />
            <div className="rounded-lg border border-line bg-fg/[0.02] px-3 py-2.5 text-[12.5px] text-ink-2">
              <span className="text-ink-3">Linear trend / actual trip:</span>{" "}
              <b className="font-semibold tabular-nums text-ink-hi">{p.linear_trip_offset ?? ">8"} / {p.actual_trip_offset ?? ">8"} weeks</b>
            </div>
          </div>
        </div>

        {bt && (
          <div className="mt-5 border-t border-line pt-4">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-[13.5px] font-semibold text-ink">How far to trust the window</h3>
              <span className="text-[12px] text-ink-3">Backtest over {bt.cases} cutoffs · internal</span>
            </div>
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
              <MeterRow label="Band contained the actual trip week" value={bt.coverage * 100} max={100} color="var(--accent)"
                display={`${Math.round(bt.coverage * 100)}%`} hint={`${Math.round(bt.coverage * bt.cases)} of ${bt.cases} cases`} />
              <table className="table text-[12.5px]" aria-label="Point-estimate backtest: model P50 against the linear trend">
                <thead><tr><th>Point estimate</th><th className="r">Error (weeks)</th><th className="r">No crossing forecast</th></tr></thead>
                <tbody>
                  <tr>
                    <td>Model P50</td>
                    <td className="r num">{bt.mae_likely?.toFixed(1) ?? "n/a"}</td>
                    <td className="r num">{bt.missed_likely} of {bt.cases}</td>
                  </tr>
                  <tr>
                    <td>Linear trend {linearBetter && <Badge tone="ok" className="ml-1">better point estimate</Badge>}</td>
                    <td className="r num">{bt.linear_mae?.toFixed(1) ?? "n/a"}</td>
                    <td className="r num">{bt.linear_missed} of {bt.cases}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-[12.5px] leading-relaxed text-ink-3">
              Backtest over {bt.cases} cutoffs: band contained the actual trip week in {Math.round(bt.coverage * 100)}% of cases. P50 error {bt.mae_likely?.toFixed(1)} weeks
              but no crossing forecast in {bt.missed_likely} of {bt.cases} cases; linear trend {bt.linear_mae?.toFixed(1)} weeks, {bt.linear_missed} missed.
              {linearBetter ? " On this near-linear data the linear trend is the better point estimate; use the band for planning margin." : ""} Internal.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** Weeks-from-forecast scale: a band from earliest to latest, a tick at most likely, optional linear/actual markers. */
function WindowRow({ label, w, tone, linear, actual }: { label: string; w: Window; tone: "alarm" | "trip"; linear?: number | null; actual?: number | null }) {
  const pos = (v: number) => `${(Math.min(v, HORIZON) / HORIZON) * 100}%`;
  const color = tone === "trip" ? "var(--danger)" : "var(--caution)";
  const soft = tone === "trip" ? "rgb(var(--danger-rgb)/0.22)" : "rgb(var(--caution-rgb)/0.22)";
  const has = w.earliest !== null;
  const end = w.latest ?? HORIZON;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[12.5px] text-ink-3">{label}</span>
        <span className={cn("text-right text-[13px] font-semibold tabular-nums", has ? (tone === "trip" ? "text-danger-ink" : "text-caution-ink") : "text-ink-2")}>{windowText(w)}</span>
      </div>
      <div className="relative mt-2 h-3 rounded-full bg-fg/[0.06]" role="img"
        aria-label={`${label}: ${windowText(w)}${linear != null ? `; linear trend ${linear} weeks` : ""}${actual != null ? `; actual ${actual} weeks` : ""}`}>
        {has && (
          <span className={cn("absolute inset-y-0 rounded-full", w.latest === null && "rounded-r-none")}
            style={{ left: pos(w.earliest!), width: `calc(${pos(end)} - ${pos(w.earliest!)})`, minWidth: 6, background: soft, boxShadow: `inset 0 0 0 1px ${color}` }} />
        )}
        {has && w.likely !== null && (
          <span className="absolute -inset-y-1 w-[3px] -translate-x-1/2 rounded-full" style={{ left: pos(w.likely), background: color }} />
        )}
        {linear != null && linear <= HORIZON && (
          <span className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 border-2 border-ink bg-panel" style={{ left: pos(linear) }} title={`Linear trend: ${linear} weeks`} />
        )}
        {actual != null && actual <= HORIZON && (
          <span className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-ink-3 bg-transparent" style={{ left: pos(actual) }} title={`Actual (evaluation): ${actual} weeks`} />
        )}
      </div>
      <div className="mt-1 flex justify-between text-[10.5px] tabular-nums text-ink-4" aria-hidden="true">
        {[0, 2, 4, 6, 8].map((t) => <span key={t}>{t === 8 ? "8 wk" : t}</span>)}
      </div>
      {(linear != null || actual != null) && (
        <div className="mt-1 flex flex-wrap gap-x-3 text-[11.5px] text-ink-3">
          {linear != null && <span className="flex items-center gap-1"><span className="size-2 rotate-45 border-2 border-ink" aria-hidden="true" />linear trend</span>}
          {actual != null && <span className="flex items-center gap-1"><span className="size-2.5 rounded-full border-2 border-ink-3" aria-hidden="true" />actual (evaluation)</span>}
          <span className="flex items-center gap-1"><span className="h-2.5 w-[3px] rounded-full" style={{ background: color }} aria-hidden="true" />most likely</span>
        </div>
      )}
    </div>
  );
}
