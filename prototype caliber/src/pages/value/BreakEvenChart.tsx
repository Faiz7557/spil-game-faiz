import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Legend, rechartsTip, SERIES } from "@/components/ui/chart";

/** Compact US$ for axes and tooltips: US$1.2M, US$450k, US$80. */
export const usdCompact = (v: number) => {
  const a = Math.abs(v), s = v < 0 ? "−" : "";
  if (a >= 1e6) return `${s}US$${(a / 1e6).toFixed(a >= 1e7 ? 0 : 1)}M`;
  if (a >= 1e3) return `${s}US$${Math.round(a / 1e3)}k`;
  return `${s}US$${Math.round(a)}`;
};

/**
 * Cumulative value against cumulative cost, month by month, computed only from the figures the user entered:
 * benefit accrues at (labour + reliability) / 12 per month; cost starts at the one-off integration and grows at
 * running cost / 12. The crossing is the payback month that computeCase already reports.
 */
export function BreakEvenChart({ labour, reliability, running, oneOff, paybackMonths }: {
  labour: number; reliability: number; running: number; oneOff: number; paybackMonths: number | null;
}) {
  const horizon = paybackMonths === null ? 36 : Math.min(60, Math.max(12, Math.ceil((paybackMonths * 1.8) / 6) * 6));
  const data = Array.from({ length: horizon + 1 }, (_, m) => ({
    m,
    labour: (labour / 12) * m,
    reliability: (reliability / 12) * m,
    cost: oneOff + (running / 12) * m,
  }));
  return (
    <figure className="m-0">
      <div className="h-[220px]" role="img"
        aria-label={paybackMonths === null ? "Cumulative benefit stays below cumulative cost over 36 months" : `Cumulative benefit crosses cumulative cost after ${paybackMonths.toFixed(1)} months`}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 18, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="m" type="number" domain={[0, horizon]} ticks={Array.from({ length: horizon / 6 + 1 }, (_, i) => i * 6)}
              tickLine={false} axisLine={false} tickFormatter={(v) => `${v} mo`} dy={4} />
            <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => usdCompact(Number(v))} width={62} />
            <Tooltip cursor={{ stroke: "rgb(var(--tint-rgb)/0.35)", strokeWidth: 1 }}
              content={rechartsTip({ title: (l) => `Month ${String(l)}`, fmt: (v) => usdCompact(v), foot: "Cumulative, from your inputs" })} />
            <Area type="linear" dataKey="labour" name="Labour benefit" stackId="b" stroke={SERIES[0]} strokeWidth={2} fill={SERIES[0]} fillOpacity={0.1} isAnimationActive animationDuration={500} />
            <Area type="linear" dataKey="reliability" name="Reliability benefit" stackId="b" stroke={SERIES[2]} strokeWidth={2} fill={SERIES[2]} fillOpacity={0.1} isAnimationActive animationDuration={500} />
            <Area type="linear" dataKey="cost" name="Cost incl. integration" stroke={SERIES[1]} strokeWidth={2} strokeDasharray="5 4" fill="transparent" isAnimationActive animationDuration={500} />
            {paybackMonths !== null && paybackMonths <= horizon && (
              <ReferenceLine x={paybackMonths} stroke="var(--ok)" strokeDasharray="3 3"
                label={{ value: `Break-even · ${paybackMonths.toFixed(1)} mo`, position: "insideTopLeft", fill: "var(--ok-ink)", fontSize: 11, dy: -16 }} />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <Legend className="mt-3" items={[
        { label: "Labour benefit", color: SERIES[0] },
        { label: "Reliability benefit (stacked)", color: SERIES[2] },
        { label: "Cumulative cost incl. integration", color: SERIES[1], dashed: true },
      ]} />
    </figure>
  );
}
