import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * A trend line with a wash, no axes, for stat tiles. Hand-drawn SVG rather than Recharts so the landing page can use
 * it without loading the chart library. The SVG stretches to its box, so the end dot is HTML to stay round.
 */
export function Sparkline({ values, color = "var(--accent)", height = 36, className, highlightLast = true, label }: {
  values: number[]; color?: string; height?: number; className?: string; highlightLast?: boolean; label?: string;
}) {
  const id = useId().replace(/:/g, "");
  if (values.length < 2) return null;
  const W = 120, H = height, pad = 3;
  const lo = Math.min(...values), hi = Math.max(...values);
  const sx = (i: number) => pad + (i / (values.length - 1)) * (W - pad * 2);
  const sy = (v: number) => pad + (1 - (v - lo) / (hi - lo || 1)) * (H - pad * 2);
  const d = values.map((v, i) => `${i ? "L" : "M"}${sx(i).toFixed(1)},${sy(v).toFixed(1)}`).join("");
  const last = values.length - 1;
  return (
    <div className={cn("relative h-9 w-full", className)} role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 block size-full overflow-visible">
        <defs>
          <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.32} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <path d={`${d}L${sx(last)},${H}L${sx(0)},${H}Z`} fill={`url(#${id})`} />
        <path d={d} fill="none" stroke={color} strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </svg>
      {highlightLast && (
        <span className="absolute size-[7px] -translate-x-1/2 -translate-y-1/2 rounded-full shadow-[0_0_0_2px_var(--panel)]"
          style={{ left: `${(sx(last) / W) * 100}%`, top: `${(sy(values[last]) / H) * 100}%`, background: color }} />
      )}
    </div>
  );
}
