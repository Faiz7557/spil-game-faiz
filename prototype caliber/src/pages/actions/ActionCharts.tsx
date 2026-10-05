// The two pictures at the top of Actions: where the RCA's own actions stand against their plan dates, and how far
// the tracked follow-up has travelled towards a reviewer's verification. Both are counts of recorded states.
import { ArrowRight, GitBranch, ListChecks } from "lucide-react";
import type { RcaAction } from "../../domain/types";
import type { ActionDue } from "../../domain/queue";
import { ruleCheck, type SimAction } from "../../domain/actionTransitions";
import { fmtDate } from "../../domain/kpis";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const DUE_STYLE: Record<ActionDue, { label: string; bar: string; dot: string }> = {
  closed: { label: "Closed", bar: "bg-ok", dot: "bg-ok" },
  not_due: { label: "Open, not due", bar: "bg-info", dot: "bg-info" },
  no_status_not_due: { label: "No status, not due", bar: "bg-info/60", dot: "bg-info/60" },
  plan_passed: { label: "Plan date passed", bar: "bg-caution", dot: "bg-caution" },
  no_status_plan_passed: { label: "No status, plan passed", bar: "bg-danger", dot: "bg-danger" },
};
const ORDER: ActionDue[] = ["closed", "not_due", "no_status_not_due", "plan_passed", "no_status_plan_passed"];

export function SourceStatusChart({ actions, dues, source, onPick, onOpen }: {
  actions: RcaAction[]; dues: ActionDue[]; source: string; onPick: (i: number) => void; onOpen: () => void;
}) {
  const order = actions.map((_, i) => i).sort((a, b) => ORDER.indexOf(dues[a]) - ORDER.indexOf(dues[b]));
  const late = dues.filter((d) => d === "plan_passed" || d === "no_status_plan_passed").length;
  const closed = dues.filter((d) => d === "closed").length;
  return (
    <Card className="h-full">
      <CardHeader action={<button type="button" onClick={onOpen} className="inline-flex items-center gap-1 text-[12.5px] font-medium text-accent-ink hover:text-accent-hover">All actions<ArrowRight className="size-3.5" aria-hidden="true" /></button>}>
        <CardTitle icon={ListChecks}>RCA actions</CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="flex items-baseline gap-3">
          <span className="text-[30px] font-semibold leading-none tracking-[-0.03em] text-ink-hi tabular-nums">{closed}<span className="text-[17px] font-medium text-ink-3"> of {actions.length} closed</span></span>
          {late > 0 && <span className="rounded-md bg-danger/12 px-1.5 py-0.5 text-[12px] font-medium text-danger-ink tabular-nums">{late} past plan date</span>}
        </div>
        <div className="mt-4 flex h-9 gap-1" role="group" aria-label={`${source} actions by status`}>
          {order.map((i) => (
            <button key={i} type="button" onClick={() => onPick(i)} title={`${actions[i].text} · ${DUE_STYLE[dues[i]].label} · plan ${fmtDate(actions[i].plan_date)}`}
              className={cn("min-w-0 flex-1 rounded-md transition-[transform,filter] duration-150 hover:-translate-y-0.5 hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", DUE_STYLE[dues[i]].bar)}>
              <span className="sr-only">{actions[i].text}: {DUE_STYLE[dues[i]].label}</span>
            </button>
          ))}
        </div>
        <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[12.5px]">
          {ORDER.filter((d) => dues.includes(d)).map((d) => (
            <li key={d} className="flex items-center gap-2 text-ink-2">
              <span className={cn("size-2 shrink-0 rounded-full", DUE_STYLE[d].dot)} aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate">{DUE_STYLE[d].label}</span>
              <span className="font-medium text-ink-hi tabular-nums">{dues.filter((x) => x === d).length}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

const STAGES: { label: string; states: SimAction["state"][] }[] = [
  { label: "Draft", states: ["draft", "rework"] },
  { label: "Assigned", states: ["reviewed", "assigned"] },
  { label: "In progress", states: ["in_progress", "execution_reported"] },
  { label: "Evidence in", states: ["evidence_submitted"] },
  { label: "In review", states: ["ready_for_verification"] },
  { label: "Verified", states: ["verified"] },
];

export function PipelineChart({ actions, kind, onOpen }: { actions: SimAction[]; kind: string; onOpen: () => void }) {
  const counts = STAGES.map((s) => actions.filter((a) => s.states.includes(a.state)).length);
  const max = Math.max(1, ...counts);
  const missing = actions.filter((a) => a.state !== "verified").reduce((n, a) => n + ruleCheck(a).missing.length, 0);
  const blockedAt = STAGES.findIndex((_, i) => i < 4 && counts[i] > 0 && missing > 0);
  return (
    <Card className="h-full">
      <CardHeader action={<button type="button" onClick={onOpen} className="inline-flex items-center gap-1 text-[12.5px] font-medium text-accent-ink hover:text-accent-hover">Open actions<ArrowRight className="size-3.5" aria-hidden="true" /></button>}>
        <CardTitle icon={GitBranch}>Follow-up pipeline</CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="flex items-baseline gap-3">
          <span className="text-[30px] font-semibold leading-none tracking-[-0.03em] text-ink-hi tabular-nums">{counts[5]}<span className="text-[17px] font-medium text-ink-3"> of {actions.length} verified</span></span>
          {missing > 0 && <span className="rounded-md bg-danger/12 px-1.5 py-0.5 text-[12px] font-medium text-danger-ink tabular-nums">{missing} evidence items missing</span>}
        </div>
        {actions.length === 0 ? (
          <p className="mt-6 text-[13px] text-ink-3">No {kind} actions yet. Create one from the draft or an RCA action.</p>
        ) : (
          <ol className="mt-4 grid grid-cols-6 items-end gap-1.5" aria-label="Actions by stage">
            {STAGES.map((s, i) => (
              <li key={s.label} className="flex min-w-0 flex-col items-center gap-1.5">
                <span className="text-[13px] font-semibold text-ink-hi tabular-nums">{counts[i]}</span>
                <span className={cn("w-full rounded-t-md transition-[height] duration-500 ease-out-soft", i === 5 ? "bg-ok" : i === blockedAt ? "bg-caution" : counts[i] ? "bg-accent" : "bg-fg/[0.08]")}
                  style={{ height: `${8 + (counts[i] / max) * 56}px` }} />
                <span className={cn("w-full truncate text-center text-[11px]", i === blockedAt ? "font-medium text-caution-ink" : "text-ink-3")} title={s.label}>{s.label}</span>
              </li>
            ))}
          </ol>
        )}
        {blockedAt >= 0 && <p className="mt-3 text-[12px] text-caution-ink">Stuck before evidence: verification needs every required item attached.</p>}
      </CardContent>
    </Card>
  );
}
