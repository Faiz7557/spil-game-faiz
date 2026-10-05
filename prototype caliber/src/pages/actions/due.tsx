// Due-state vocabulary shared by the Actions page: source-action due labels, the plan-date strip,
// the owner chip and the due-proximity meter. All dates are compared with the snapshot review date.
import { CalendarClock, UserRound } from "lucide-react";
import { REVIEW_DATE } from "../../domain/data";
import { fmtDate } from "../../domain/kpis";
import type { ActionDue } from "../../domain/queue";
import type { RcaAction } from "../../domain/types";
import { Badge, toneDot, type Tone } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/** Source-action due state, same wording the Issues page uses. */
export const DUE: Record<ActionDue, { label: string; short: string; tone: Tone }> = {
  closed: { label: "Closed (source)", short: "Closed", tone: "ok" },
  plan_passed: { label: "Plan date passed — confirm status", short: "Plan passed", tone: "warn" },
  not_due: { label: "Not yet due", short: "Not due", tone: "info" },
  no_status_plan_passed: { label: "No status recorded · plan date passed", short: "No status · passed", tone: "danger" },
  no_status_not_due: { label: "No status recorded", short: "No status", tone: "info" },
};

export function DueBadge({ due }: { due: ActionDue }) {
  const d = DUE[due];
  return <Badge tone={d.tone} dot pulse={due === "no_status_plan_passed"}>{d.label}</Badge>;
}

const DAY = 86_400_000;
/** Whole days from the review date to `iso` (negative = before the review date). */
export const daysFromReview = (iso: string) => Math.round((Date.parse(iso) - Date.parse(REVIEW_DATE)) / DAY);

/** Planned → due soon → overdue, using the reminder rule's thresholds (due soon = within 3 days). */
export function dueZone(due: string): { zone: "none" | "planned" | "soon" | "overdue"; days: number } {
  if (!due) return { zone: "none", days: 0 };
  const d = daysFromReview(due);
  return { zone: d < 0 ? "overdue" : d <= 3 ? "soon" : "planned", days: d };
}

export function DueMeter({ due, className }: { due: string; className?: string }) {
  const { zone, days } = dueZone(due);
  const text = zone === "none" ? "No due date set"
    : zone === "overdue" ? `Overdue by ${-days} day${days === -1 ? "" : "s"}`
      : days === 0 ? "Due on the review date" : `Due in ${days} day${days === 1 ? "" : "s"}`;
  const tone: Tone = zone === "overdue" ? "danger" : zone === "soon" ? "warn" : zone === "planned" ? "ok" : "neutral";
  const segs: { key: typeof zone; label: string; on: string }[] = [
    { key: "planned", label: "Planned", on: "bg-ok" },
    { key: "soon", label: "Due ≤3 d", on: "bg-caution" },
    { key: "overdue", label: "Overdue", on: "bg-danger" },
  ];
  return (
    <div className={cn("min-w-0", className)}>
      <div className="flex items-center gap-1.5 text-[12px] text-ink-3"><CalendarClock className="size-3.5" aria-hidden="true" />Due {due ? fmtDate(due) : "—"}</div>
      <div className="mt-1.5 grid grid-cols-3 gap-1" aria-hidden="true">
        {segs.map((s) => <span key={s.key} className={cn("h-1.5 rounded-full", zone === s.key ? s.on : "bg-fg/[0.07]")} title={s.label} />)}
      </div>
      <div className={cn("mt-1 flex items-center gap-1.5 text-[12.5px] font-medium", tone === "danger" ? "text-danger-ink" : tone === "warn" ? "text-caution-ink" : tone === "ok" ? "text-ok-ink" : "text-ink-3")}>
        <span className={cn("size-1.5 rounded-full", toneDot[tone])} aria-hidden="true" />{text}
        <span className="font-normal text-ink-3">vs review date</span>
      </div>
    </div>
  );
}

const initials = (s: string) => s.split(/[\s(]+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");

/** Owner as a chip: initials disc + name. Unassigned shows as a dashed caution chip with the suggested role. */
export function OwnerChip({ owner, role, label = "Owner" }: { owner: string; role?: string; label?: string }) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5 text-[12px] text-ink-3"><UserRound className="size-3.5" aria-hidden="true" />{label}</div>
      {owner ? (
        <span className="mt-1.5 inline-flex max-w-full items-center gap-2 rounded-full border border-line-strong bg-fg/[0.04] py-0.5 pl-0.5 pr-2.5 text-[13px] text-ink-hi">
          <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent-soft text-[10.5px] font-semibold text-accent-ink" aria-hidden="true">{initials(owner)}</span>
          <span className="truncate">{owner}</span>
        </span>
      ) : (
        <span className="mt-1.5 inline-flex max-w-full items-center gap-1.5 rounded-full border border-dashed border-caution/60 bg-caution-soft px-2.5 py-1 text-[12.5px] text-caution-ink" title={role || undefined}>
          Unassigned{role ? <span className="truncate text-ink-3">· {role}</span> : null}
        </span>
      )}
    </div>
  );
}

/**
 * The plan-date strip: every source action placed on one date axis, the review date drawn as a hard line.
 * Left of the line is past; a marker there that is not Closed is a follow-up that slipped.
 */
export function SourceStrip({ actions, dues, onPick }: { actions: RcaAction[]; dues: ActionDue[]; onPick: (i: number) => void }) {
  const t = actions.map((a) => Date.parse(a.plan_date)).filter((n) => !Number.isNaN(n));
  const review = Date.parse(REVIEW_DATE);
  const lo0 = Math.min(review, ...t), hi0 = Math.max(review, ...t);
  const pad = Math.max((hi0 - lo0) * 0.06, 7 * DAY);
  const lo = lo0 - pad, hi = hi0 + pad;
  const x = (ms: number) => ((ms - lo) / (hi - lo)) * 100;
  // Greedy lanes so markers that sit close together do not overlap.
  const lanes: number[] = [];
  const laneEnd: number[] = [];
  actions.map((a, i) => ({ i, p: x(Date.parse(a.plan_date)) })).filter((m) => !Number.isNaN(m.p)).sort((a, b) => a.p - b.p).forEach(({ i, p }) => {
    let l = laneEnd.findIndex((e) => p - e > 5);
    if (l < 0) { l = laneEnd.length; laneEnd.push(p); } else laneEnd[l] = p;
    lanes[i] = l;
  });
  const nLanes = Math.max(1, laneEnd.length);
  const rx = x(review);
  const startLabel = new Date(lo + pad).toISOString().slice(0, 10);
  const endLabel = new Date(hi - pad).toISOString().slice(0, 10);
  return (
    <div>
      <div className="relative rounded-lg border border-line bg-[rgb(var(--well-rgb)/0.45)]" style={{ height: 22 + nLanes * 26 }}>
        <div className="absolute inset-y-0 left-0 rounded-l-lg bg-[repeating-linear-gradient(135deg,rgb(var(--danger-rgb)/0.07)_0_6px,transparent_6px_12px)]" style={{ width: `${rx}%` }} aria-hidden="true" />
        <div className="absolute inset-y-0 w-px bg-fg/80 shadow-[0_0_10px_rgba(255,255,255,0.4)]" style={{ left: `${rx}%` }} aria-hidden="true" />
        <span className={cn("absolute top-1 whitespace-nowrap text-[11px] font-medium text-ink-hi", rx > 70 ? "-translate-x-full pr-1.5" : "pl-1.5")} style={{ left: `${rx}%` }}>
          Review date · {fmtDate(REVIEW_DATE)}
        </span>
        {actions.map((a, i) => {
          const d = DUE[dues[i]];
          if (lanes[i] === undefined) return null; // no usable plan date: listed below, not plotted
          return (
            <button key={a.text} type="button" onClick={() => onPick(i)}
              aria-label={`${a.text}: plan ${fmtDate(a.plan_date)}, ${d.label}`} title={`${a.text}\nPlan ${fmtDate(a.plan_date)} · ${d.label}`}
              className="group absolute -translate-x-1/2 rounded-full p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              style={{ left: `${x(Date.parse(a.plan_date))}%`, top: 20 + lanes[i] * 26 }}>
              <span className={cn("block size-3 rounded-full ring-2 ring-ground transition-transform duration-150 group-hover:scale-125", toneDot[d.tone])} />
            </button>
          );
        })}
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] tabular-nums text-ink-3"><span>{fmtDate(startLabel)}</span><span>{fmtDate(endLabel)}</span></div>
    </div>
  );
}
