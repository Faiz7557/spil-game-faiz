import type { ReactNode } from "react";
import { ChevronRight, CircleCheck, CircleDashed } from "lucide-react";
import { cn } from "@/lib/utils";
import { toneDot, toneText, type Tone } from "@/components/ui/badge";
import { STATUS_HEX } from "@/components/ui/chart";
import type { CategoryId } from "../../domain/queue";
import type { Coverage } from "../../domain/coverage";

/** Lifecycle category -> status tone. Same mapping as the restyled .tag-band colours in styles.css. */
export const CAT_TONE: Record<CategoryId, Tone> = { operational: "danger", investigation: "info", followup: "warn", pending: "ai", planned: "neutral" };
export const CAT_HEX: Record<CategoryId, string> = {
  operational: STATUS_HEX.danger, investigation: STATUS_HEX.info, followup: STATUS_HEX.warn, pending: STATUS_HEX.ai, planned: STATUS_HEX.muted,
};
export const preRiskTone = (r: string): Tone => (r === "I" || r === "II" ? "danger" : "info");

/** A lit status dot. Always paired with a text label by the caller. */
export function Dot({ tone, pulse, className }: { tone: Tone; pulse?: boolean; className?: string }) {
  return (
    <span className={cn("relative inline-flex size-2 shrink-0", className)} aria-hidden="true">
      {pulse && <span className={cn("absolute inset-0 animate-ping rounded-full opacity-50 motion-reduce:hidden", toneDot[tone])} />}
      <span className={cn("relative inline-flex size-2 rounded-full shadow-[0_0_8px_currentColor]", toneDot[tone], toneText[tone])} />
    </span>
  );
}

/** One labelled recorded figure: small label, value, a qualifier line. */
export function Figure({ label, value, sub }: { label: ReactNode; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="min-w-0 rounded-lg border border-line bg-fg/[0.02] px-3 py-2.5">
      <div className="text-[11.5px] text-ink-3">{label}</div>
      <div className="mt-1 text-[15px] font-semibold tabular-nums tracking-[-0.01em] text-ink-hi">{value}</div>
      {sub && <div className="mt-0.5 text-[12px] leading-snug text-ink-3">{sub}</div>}
    </div>
  );
}

/**
 * The sort keys that decide rank, left to right, with this record's value under each. Reading it answers
 * "why is it here" without a score: the first key that differs from a neighbour decides the order.
 */
export function RankKeys({ keys }: { keys: { k: string; v: ReactNode; tone?: Tone }[] }) {
  return (
    <ol className="flex flex-wrap items-stretch gap-1.5" aria-label="Sort keys, highest priority first">
      {keys.map((x, i) => (
        <li key={x.k} className="flex items-center gap-1.5">
          <div className="rounded-lg border border-line bg-fg/[0.025] px-2.5 py-1.5">
            <div className="text-[11px] text-ink-3">{i + 1}. {x.k}</div>
            <div className={cn("mt-0.5 flex items-center gap-1.5 text-[13px] font-medium tabular-nums", x.tone ? toneText[x.tone] : "text-ink")}>
              {x.tone && <Dot tone={x.tone} />}{x.v}
            </div>
          </div>
          {i < keys.length - 1 && <ChevronRight className="size-3.5 text-ink-4" aria-hidden="true" />}
        </li>
      ))}
    </ol>
  );
}

const COV_ITEMS: { key: keyof Coverage["have"]; label: string }[] = [
  { key: "condition", label: "Condition readings" }, { key: "rca", label: "RCA package" },
  { key: "owner", label: "RCA owner (PIC)" }, { key: "dueDate", label: "RCA due date" },
];

/** Four-segment meter: one segment per evidence item the coverage check looks for. */
export function CoverageSegments({ c, className }: { c: Coverage; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-[3px]", className)} role="img"
      aria-label={`Evidence coverage ${Math.round(c.score * 100)}%: ${COV_ITEMS.filter((x) => c.have[x.key]).map((x) => x.label).join(", ") || "none"}`}>
      {COV_ITEMS.map((x) => (
        <span key={x.key} className={cn("h-1.5 w-3.5 rounded-full", c.have[x.key] ? (c.score === 1 ? "bg-ok" : "bg-caution") : "bg-fg/[0.09]")} />
      ))}
    </span>
  );
}

/** Checklist form of the same coverage, for detail views. */
export function CoverageChecklist({ c }: { c: Coverage }) {
  return (
    <ul className="grid gap-1.5 sm:grid-cols-2">
      {COV_ITEMS.map((x) => (
        <li key={x.key} className={cn("flex items-center gap-2 rounded-lg border px-2.5 py-2 text-[13px]",
          c.have[x.key] ? "border-line bg-ok-soft text-ink" : "border-dashed border-line-strong text-ink-3")}>
          {c.have[x.key] ? <CircleCheck className="size-4 shrink-0 text-ok" aria-hidden="true" /> : <CircleDashed className="size-4 shrink-0 text-ink-4" aria-hidden="true" />}
          <span className="min-w-0 flex-1">{x.label}</span>
          <span className="text-[11.5px] text-ink-3">{c.have[x.key] ? "on file" : "missing"}</span>
        </li>
      ))}
    </ul>
  );
}

/** Section heading inside a card body. More space above than below. */
export function SubHead({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-2 mt-5 flex flex-wrap items-baseline justify-between gap-2 first:mt-0">
      <h3 className="text-[13.5px] font-semibold text-ink-hi">{children}</h3>
      {right}
    </div>
  );
}
