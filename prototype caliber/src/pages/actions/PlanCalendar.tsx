// Plan dates as month calendars: each RCA action sits on its plan date, coloured by where it stands on the review
// date; the review date is ringed and the days before it are shaded as past. Click a day to open its action.
import type { RcaAction } from "../../domain/types";
import type { ActionDue } from "../../domain/queue";
import { cn } from "@/lib/utils";

const DOT: Record<ActionDue, string> = {
  closed: "bg-ok text-white", not_due: "bg-info text-white", no_status_not_due: "bg-info/70 text-white",
  plan_passed: "bg-caution text-[#1b1200]", no_status_plan_passed: "bg-danger text-white",
};
const LABEL: Record<ActionDue, string> = {
  closed: "Closed", not_due: "Open, not due", no_status_not_due: "No status, not due", plan_passed: "Plan date passed", no_status_plan_passed: "No status, plan passed",
};
const WD = ["M", "T", "W", "T", "F", "S", "S"];
const iso = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

export function PlanCalendar({ actions, dues, review, onPick }: { actions: RcaAction[]; dues: ActionDue[]; review: string; onPick: (i: number) => void }) {
  const dates = [...actions.map((a) => a.plan_date).filter(Boolean), review].sort();
  const [y0, m0] = dates[0].split("-").map(Number);
  const [y1, m1] = dates[dates.length - 1].split("-").map(Number);
  const months: { y: number; m: number }[] = [];
  for (let y = y0, m = m0 - 1; y < y1 || (y === y1 && m <= m1 - 1); m = (m + 1) % 12, y += m === 0 ? 1 : 0) months.push({ y, m });
  const byDay = new Map<string, number[]>();
  actions.forEach((a, i) => { if (a.plan_date) byDay.set(a.plan_date, [...(byDay.get(a.plan_date) ?? []), i]); });

  return (
    <div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(168px,1fr))] gap-x-6 gap-y-5">
        {months.map(({ y, m }) => {
          const first = (new Date(Date.UTC(y, m, 1)).getUTCDay() + 6) % 7;
          const days = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
          return (
            <div key={`${y}-${m}`} className="min-w-0">
              <p className="mb-2 text-[12.5px] font-semibold text-ink-hi">{new Date(Date.UTC(y, m, 1)).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" })}</p>
              <div className="grid grid-cols-7 gap-0.5 text-center text-[10.5px] text-ink-4">{WD.map((d, i) => <span key={i}>{d}</span>)}</div>
              <div className="mt-1 grid grid-cols-7 gap-0.5">
                {Array.from({ length: first }, (_, i) => <span key={`b${i}`} />)}
                {Array.from({ length: days }, (_, k) => {
                  const day = iso(y, m, k + 1);
                  const hits = byDay.get(day);
                  const isReview = day === review;
                  const past = day < review;
                  const worst = hits ? hits.map((i) => dues[i]).sort((a, b) => Object.keys(DOT).indexOf(b) - Object.keys(DOT).indexOf(a))[0] : null;
                  const cell = cn("relative grid aspect-square place-items-center rounded-md text-[10.5px] tabular-nums",
                    past && !hits && "bg-fg/[0.035] text-ink-4", !past && !hits && "text-ink-3",
                    hits && cn("font-semibold", DOT[worst!]),
                    isReview && "ring-2 ring-accent ring-offset-1 ring-offset-[var(--popover-solid)]");
                  return hits ? (
                    <button key={day} type="button" onClick={() => onPick(hits[0])} className={cn(cell, "transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring")}
                      title={`${day}\n${hits.map((i) => `${actions[i].text} · ${LABEL[dues[i]]}`).join("\n")}`}>
                      {k + 1}{hits.length > 1 && <span className="absolute -right-1 -top-1 grid size-3.5 place-items-center rounded-full bg-ink-hi text-[8.5px] text-canvas">{hits.length}</span>}
                    </button>
                  ) : <span key={day} className={cell} title={isReview ? `${day} · review date` : undefined}>{k + 1}</span>;
                })}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-ink-3">
        {(["closed", "not_due", "plan_passed", "no_status_plan_passed"] as ActionDue[]).map((d) => (
          <span key={d} className="flex items-center gap-1.5"><span className={cn("size-2.5 rounded-sm", DOT[d].split(" ")[0])} />{LABEL[d]}</span>
        ))}
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm ring-2 ring-accent" />Review date</span>
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-fg/10" />Before the review date</span>
      </div>
    </div>
  );
}
