// Who gets reminded today. Each row is an action that is due soon, overdue or awaiting review, with how far up the
// ladder its reminder has climbed (owner, then reviewer at 7 days, then manager at 14). Clicking a row opens it.
import { BellRing, ChevronRight } from "lucide-react";
import { REVIEW_DATE, rcaByTag } from "../domain/data";
import { fmtDate } from "../domain/kpis";
import { reminderPlan, type Recipient } from "../domain/notify";
import { useDemo } from "../domain/store";
import { openSectionTab } from "@/components/ui/section-tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const LADDER: Recipient[] = ["owner", "reviewer", "manager"];
const WHO: Record<Recipient, string> = { owner: "Owner", reviewer: "Reviewer", manager: "Manager" };
const STEP = ["bg-info", "bg-caution", "bg-danger"];

export default function RemindersPanel({ tag, onOpenAction }: { tag: string; onOpenAction?: (sourceIndex: number) => void }) {
  const demo = useDemo();
  const rca = rcaByTag(tag);
  const sourceList = rca ? [...rca.actions, ...rca.preventive] : [];
  const source = sourceList.map((a) => ({ id: a.text, title: a.text, state: a.status === "Closed" ? "verified" : "in_progress", due: a.plan_date || null, owner: a.pic }));
  const sim = demo.actions.filter((a) => a.caseTag === tag).map((a) => ({ id: a.id, title: a.title, state: a.state as string, due: a.due || null, owner: a.owner }));
  const plan = [...reminderPlan([...source, ...sim], REVIEW_DATE)].sort((a, b) => b.daysOverdue - a.daysOverdue);
  const toManager = plan.filter((r) => r.to.includes("manager")).length;

  const openRow = (id: string) => {
    const i = sourceList.findIndex((a) => a.text === id);
    if (i >= 0) onOpenAction?.(i); else openSectionTab("tracked");
  };

  return (
    <Card>
      <CardHeader action={<span className="text-[12px] text-ink-3">As of {fmtDate(REVIEW_DATE)}</span>}>
        <CardTitle icon={BellRing}>Who gets reminded today</CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] text-ink-3">
          <span><b className="text-[20px] font-semibold text-ink-hi tabular-nums">{plan.length}</b> reminders</span>
          <span><b className="text-[20px] font-semibold text-danger-ink tabular-nums">{toManager}</b> reach the manager</span>
          <span className="ml-auto flex items-center gap-3">
            {LADDER.map((w, i) => <span key={w} className="flex items-center gap-1.5"><span className={cn("h-1.5 w-3 rounded-full", STEP[i])} aria-hidden="true" />{WHO[w]}{i ? ` · ${i === 1 ? "7" : "14"} d` : ""}</span>)}
          </span>
        </div>

        {plan.length === 0 ? (
          <p className="mt-4 text-[13px] text-ink-3">Nothing is due soon, overdue or awaiting review.</p>
        ) : (
          <ul className="-mx-2 mt-3">
            {plan.map((r) => {
              const top = LADDER.reduce((m, w, i) => (r.to.includes(w) ? i : m), 0);
              return (
                <li key={r.id}>
                  <button type="button" onClick={() => openRow(r.id)}
                    className="group flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-fg/[0.04]">
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-1 text-[13px] text-ink group-hover:text-ink-hi">{r.title}</span>
                      <span className="text-[12px] text-ink-3">{r.owner || "Unassigned"} · {r.kind === "awaiting_review" ? "awaiting review" : r.kind === "due_soon" ? "due soon" : <span className="text-danger-ink">{r.daysOverdue} d overdue</span>}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1" aria-label={`Reminder reaches ${WHO[LADDER[top]]}`} title={`Reaches ${r.to.map((w) => WHO[w]).join(", ")}`}>
                      {LADDER.map((w, i) => <span key={w} className={cn("h-1.5 w-4 rounded-full", i <= top ? STEP[i] : "bg-fg/10")} />)}
                    </span>
                    <span className="w-16 shrink-0 text-right text-[12px] font-medium text-ink-2">{WHO[LADDER[top]]}</span>
                    <ChevronRight className="size-4 shrink-0 text-ink-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-2 text-[12px] text-ink-4">Email goes out in the hosted version; Teams and WhatsApp are on the roadmap.</p>
      </CardContent>
    </Card>
  );
}
