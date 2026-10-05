// Small primitives shared by the Investigation page sections. Local on purpose: other agents own src/components/ui.
import type { ReactNode } from "react";
import { Check, OctagonX, TriangleAlert } from "lucide-react";
import type { Tone } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type Zone = "ok" | "alarm" | "trip";

export const ZONE: Record<Zone, { label: string; tone: Tone; Icon: typeof Check; dot: string; hex: string }> = {
  ok: { label: "Normal", tone: "ok", Icon: Check, dot: "bg-ok", hex: "var(--ok)" },
  alarm: { label: "Alarm", tone: "warn", Icon: TriangleAlert, dot: "bg-caution", hex: "var(--caution)" },
  trip: { label: "Trip", tone: "danger", Icon: OctagonX, dot: "bg-danger", hex: "var(--danger)" },
};

/** Weekly status recorded in the condition file → zone. */
export const statusZone = (s: string): Zone => (s === "TRIP" ? "trip" : s === "ALARM" ? "alarm" : "ok");

/** Scroll a page section into view. Plain hash links would fight the hash router. */
export function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  (el.querySelector("h2") as HTMLElement | null)?.focus?.({ preventScroll: true });
}

/** A compact label/value pair used in summaries and provenance blocks. */
export function Fact({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("min-w-0", className)}>
      <div className="text-[12px] text-ink-3">{label}</div>
      <div className="mt-0.5 text-[13.5px] leading-snug text-ink">{children}</div>
    </div>
  );
}

/** Format a reading the way the condition charts do: whole numbers above 100, trimmed decimals below. */
export const fmtReading = (v: number) => (Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(2).replace(/\.?0+$/, ""));
