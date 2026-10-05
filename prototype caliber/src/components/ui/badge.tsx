import * as React from "react";
import { cn } from "@/lib/utils";

export type Tone = "neutral" | "accent" | "ok" | "warn" | "danger" | "info" | "ai" | "sim";
const TONE: Record<Tone, string> = { neutral: "", accent: "b-trail", ok: "b-ok", warn: "b-warn", danger: "b-danger", info: "b-info", ai: "b-ai", sim: "b-simulated" };
export const toneDot: Record<Tone, string> = { neutral: "bg-ink-3", accent: "bg-accent", ok: "bg-ok", warn: "bg-caution", danger: "bg-danger", info: "bg-info", ai: "bg-ai", sim: "bg-ink-3" };
export const toneText: Record<Tone, string> = { neutral: "text-ink-2", accent: "text-accent-ink", ok: "text-ok-ink", warn: "text-caution-ink", danger: "text-danger-ink", info: "text-info-ink", ai: "text-ai-ink", sim: "text-ink-2" };
export const toneColor: Record<Tone, string> = { neutral: "var(--ink-3)", accent: "var(--accent)", ok: "var(--ok)", warn: "var(--caution)", danger: "var(--danger)", info: "var(--info)", ai: "var(--ai)", sim: "var(--ink-3)" };

/** Status pill. `dot` adds the small lit indicator used for live state (running, overdue, verified). */
export function Badge({ tone = "neutral", dot, pulse, className, children, ...props }: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone; dot?: boolean; pulse?: boolean }) {
  return (
    <span className={cn("badge", TONE[tone], className)} {...props}>
      {dot && (
        <span className="relative inline-flex size-1.5" aria-hidden="true">
          {pulse && <span className={cn("absolute inset-0 animate-ping rounded-full opacity-60 motion-reduce:hidden", toneDot[tone])} />}
          <span className={cn("relative inline-flex size-1.5 rounded-full", toneDot[tone])} />
        </span>
      )}
      {children}
    </span>
  );
}
