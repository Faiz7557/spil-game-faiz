import type { ElementType, ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { toneText, type Tone } from "./badge";

/** A computed change between two recorded periods. `good` says whether this direction is good news. */
export interface Delta { pct: number; label: string; good: boolean | null }

/** Last n buckets against the n before them, as a percentage change. Null when there is nothing to compare. */
export function periodDelta(values: number[], n = 3, label = `vs prior ${n} mo`, upIsGood = false): Delta | null {
  if (values.length < n * 2) return null;
  const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
  const cur = sum(values.slice(-n)), prev = sum(values.slice(-2 * n, -n));
  if (!prev) return null;
  const pct = ((cur - prev) / prev) * 100;
  return { pct, label, good: Math.abs(pct) < 0.5 ? null : (pct > 0) === upIsGood };
}

const TONE_RULE: Partial<Record<Tone, string>> = { danger: "var(--danger)", warn: "var(--caution)", ok: "var(--ok)", accent: "var(--accent)", info: "var(--info)", ai: "var(--ai)" };

/** Mini bar chart for a tile's foot: the figure's recorded shape, newest on the right. */
export function MiniBars({ values, color = "var(--accent)", label, recent = true }: { values: number[]; color?: string; label?: string; /** Emphasise the newest three bars (time series only). */ recent?: boolean }) {
  const max = Math.max(...values, 1);
  return (
    <div className="flex h-9 items-end gap-[2px]" role="img" aria-label={label}>
      {values.map((v, i) => (
        <span key={i} className="min-w-0 flex-1 rounded-t-[2px]" style={{ height: `${Math.max(4, (v / max) * 100)}%`, background: color, opacity: !recent || i >= values.length - 3 ? (recent ? 1 : 0.85) : 0.42 }} />
      ))}
    </div>
  );
}

/** Part of a whole as one bar, for snapshot counts that have no time series. */
export function ShareBar({ value, max, color = "var(--accent)", label }: { value: number; max: number; color?: string; label?: string }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-fg/[0.07]" role="img" aria-label={label}>
      <div className="h-full rounded-full transition-[width] duration-700 ease-out-soft" style={{ width: `${Math.min(100, (value / (max || 1)) * 100)}%`, background: color }} />
    </div>
  );
}

/**
 * A headline figure: a coloured rule, the label, the value, one chip (a change or a share) with a short context
 * line, and an optional foot visual (bars or a share bar). `tone` colours the value only when the value is itself a
 * state (overdue = danger). When `onClick` is set the tile opens the figure's definition and source.
 */
export function StatTile({ label, value, context, icon: Icon, tone, accent, delta, chip, visual, onClick, className, footer }: {
  label: ReactNode; value: ReactNode; context?: ReactNode; icon?: ElementType; tone?: Tone;
  /** Colour of the top rule and icon; defaults to the tone, else a neutral line. */
  accent?: string; delta?: Delta | null; chip?: ReactNode; visual?: ReactNode;
  /** @deprecated kept for older call sites; the visual always sits at the foot. */
  visualPosition?: "side" | "bottom"; onClick?: () => void; className?: string; footer?: ReactNode;
}) {
  const Comp = onClick ? "button" : "div";
  const rule = accent ?? (tone ? TONE_RULE[tone] : undefined) ?? "var(--line-strong)";
  const DIcon = !delta ? Minus : delta.pct > 0.5 ? ArrowUpRight : delta.pct < -0.5 ? ArrowDownRight : Minus;
  return (
    <Comp type={onClick ? "button" : undefined} onClick={onClick} style={{ ["--rule" as string]: rule }}
      className={cn(
        "tw group relative flex min-w-0 flex-col overflow-hidden rounded-xl border border-line text-left",
        "[background:var(--glass),var(--panel)] shadow-[var(--shadow)]",
        "before:absolute before:inset-x-0 before:top-0 before:h-[2px] before:bg-[var(--rule)] before:content-['']",
        onClick && "cursor-pointer transition-[border-color,transform] duration-200 ease-out-soft hover:-translate-y-0.5 hover:border-line-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}>
      <div className="flex items-start justify-between gap-3 px-4 pt-4">
        <span className="min-w-0 text-[12.5px] font-medium leading-snug text-ink-3">{label}</span>
        {Icon && (
          <span className="grid size-7 shrink-0 place-items-center rounded-md border border-line bg-fg/[0.03]" style={{ color: rule === "var(--line-strong)" ? "var(--ink-3)" : rule }}>
            <Icon className="size-3.5" strokeWidth={1.9} aria-hidden="true" />
          </span>
        )}
      </div>
      <div className={cn("whitespace-nowrap px-4 pt-1.5 text-[30px] font-semibold leading-none tracking-[-0.03em] tabular-nums", tone ? toneText[tone] : "text-ink-hi")}>{value}</div>
      {(delta || chip || context) && (
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 px-4 pt-2.5 text-[12px] leading-snug">
          {delta && (
            <span className={cn("inline-flex shrink-0 items-center gap-0.5 rounded-md px-1.5 py-0.5 font-medium tabular-nums",
              delta.good === null ? "bg-fg/[0.06] text-ink-2" : delta.good ? "bg-ok/12 text-ok-ink" : "bg-danger/12 text-danger-ink")}>
              <DIcon className="size-3" strokeWidth={2.4} aria-hidden="true" />{Math.abs(delta.pct).toFixed(0)}%
            </span>
          )}
          {chip && <span className="inline-flex shrink-0 items-center rounded-md bg-fg/[0.06] px-1.5 py-0.5 font-medium text-ink-2 tabular-nums">{chip}</span>}
          <span className="min-w-0 text-ink-3">{delta ? delta.label : null}{delta && context ? " · " : null}{context}</span>
        </div>
      )}
      {visual && <div className="mt-auto px-4 pb-4 pt-4">{visual}</div>}
      {!visual && <div className="pb-4" />}
      {footer && <div className="border-t border-line px-4 py-2 text-[11.5px] text-ink-3">{footer}</div>}
    </Comp>
  );
}
