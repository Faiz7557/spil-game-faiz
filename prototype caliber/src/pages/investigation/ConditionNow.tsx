// Section 1 of the diagnosis: where each recorded condition parameter stands against its own alarm and trip
// limits in the review week, plus the week-by-week strip that picks the review week for the whole page.
import { useMemo } from "react";
import { Activity, ArrowDown, ArrowUp } from "lucide-react";
import type { Equipment } from "../../domain/types";
import { diagnose, lockOn, Z_MIN } from "../../domain/diagnosis";
import { fmtDate } from "../../domain/kpis";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Gauge, gaugeZone } from "@/components/ui/gauge";
import { Sparkline } from "@/components/ui/chart";
import { cn } from "@/lib/utils";
import { ZONE, fmtReading, statusZone } from "./parts";

export function ConditionNow({ eq, week, onWeek, goldMode, revealGold }: {
  eq: Equipment; week: number; onWeek: (w: number) => void; goldMode: string; revealGold: boolean;
}) {
  const row = eq.history[week];
  const tripIdx = eq.history.findIndex((h) => h.status === "TRIP");
  // The trip-week reading is post-failure data: shown as a ghost tick only in snapshot review.
  const ghostRow = revealGold && tripIdx >= 0 && tripIdx !== week ? eq.history[tripIdx] : null;
  const obs = useMemo(() => diagnose(eq, week).observations, [eq, week]);
  const zones = eq.params.map((p, i) => gaugeZone(row.values[i], p.alarm, p.trip, p.direction));
  const count = (z: string) => zones.filter((x) => x === z).length;
  const rowZone = statusZone(row.status);

  return (
    <Card id="condition" className="scroll-mt-4">
      <CardHeader action={
        <Badge tone={ZONE[rowZone].tone} dot pulse={rowZone !== "ok"}>Recorded status: {row.status}</Badge>
      }>
        <CardTitle icon={Activity}>Condition in the review week</CardTitle>
        <CardDescription>
          Week {week + 1} · {fmtDate(row.date)}. Recorded weekly readings from the condition file, read against each parameter's own alarm and
          trip limits. Not live plant status.{" "}
          <span className="text-ink-2">{count("trip")} at trip · {count("alarm")} at alarm · {count("ok")} normal.</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-3">
        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-line bg-line min-[440px]:grid-cols-2 lg:grid-cols-4">
          {eq.params.map((p, i) => {
            const v = row.values[i];
            const z = zones[i];
            const o = obs.find((x) => x.param === p.name);
            const zm = ZONE[z];
            const upTo = eq.history.slice(0, week + 1).map((h) => h.values[i]);
            return (
              <div key={p.name} className="flex min-w-0 flex-col bg-panel px-4 pb-3.5 pt-3 transition-colors hover:bg-panel-2">
                <div className="flex items-start justify-between gap-2">
                  <span className="min-w-0 text-[13px] font-medium leading-snug text-ink-2">{p.name}</span>
                  <Badge tone={zm.tone} className="shrink-0"><zm.Icon aria-hidden="true" />{zm.label}</Badge>
                </div>
                <div className="mx-auto mt-2 w-full max-w-[170px]">
                  <Gauge value={v} alarm={p.alarm} trip={p.trip} direction={p.direction} ghost={ghostRow ? ghostRow.values[i] : undefined}
                    label={`${p.name}: ${v} ${p.unit}, alarm ${p.alarm}, trip ${p.trip}, ${zm.label.toLowerCase()}`} />
                </div>
                <div className="relative -mt-[2.7rem] text-center leading-none">
                  <span className="block text-[22px] font-semibold leading-none tracking-[-0.035em] text-ink-hi tabular-nums">{fmtReading(v)}</span>
                  <span className="mt-1 block text-[11px] text-ink-3">{p.unit}</span>
                </div>
                <div className="mt-3.5 flex items-center justify-center gap-3 text-[11.5px] tabular-nums text-ink-3">
                  <span><span className="mr-1 inline-block size-1.5 rounded-full bg-caution align-middle" aria-hidden="true" />alarm {p.direction === "high" ? "≥" : "≤"} {p.alarm}</span>
                  <span><span className="mr-1 inline-block size-1.5 rounded-full bg-danger align-middle" aria-hidden="true" />trip {p.direction === "high" ? "≥" : "≤"} {p.trip}</span>
                </div>
                <div className="mt-3 flex items-end gap-2 border-t border-line pt-2.5">
                  <div className="min-w-0 flex-1">
                    <Sparkline values={upTo} color={zm.hex} height={28} className="h-7" label={`${p.name} up to week ${week + 1}`} />
                  </div>
                  {o && (
                    <span className={cn("inline-flex shrink-0 items-center gap-0.5 text-[11.5px] tabular-nums", o.dir !== 0 ? "text-info-ink" : "text-ink-3")}
                      title={`z vs the first-6-week baseline; outside the band at |z| ≥ ${Z_MIN}`}>
                      {o.dir === 1 ? <ArrowUp className="size-3" aria-hidden="true" /> : o.dir === -1 ? <ArrowDown className="size-3" aria-hidden="true" /> : null}
                      z {o.z > 0 ? "+" : ""}{o.z}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {ghostRow && (
          <p className="mt-2.5 flex items-center gap-1.5 text-[12px] text-ink-3">
            <span className="h-2.5 w-[3px] rounded-full bg-danger-ink" aria-hidden="true" />
            Red tick on each arc: the reading in the recorded trip week ({fmtDate(ghostRow.date)}), shown in snapshot review only.
          </p>
        )}
        <WeekStrip eq={eq} week={week} onWeek={onWeek} goldMode={goldMode} revealGold={revealGold} />
      </CardContent>
    </Card>
  );
}

/** Week-by-week matcher state. Picks the review week for gauges, differential and the AI investigator. */
function WeekStrip({ eq, week, onWeek, goldMode, revealGold }: { eq: Equipment; week: number; onWeek: (w: number) => void; goldMode: string; revealGold: boolean }) {
  const timeline = useMemo(() => lockOn(eq, goldMode), [eq, goldMode]);
  if (!timeline.length) return null;
  return (
    <div className="mt-5">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="text-[13.5px] font-semibold text-ink">Review week</h3>
        <span className="text-[12px] text-ink-3">Every section below reads only data up to the selected week.</span>
      </div>
      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <div className="flex min-w-max gap-1" role="group" aria-label="Leading hypothesis by week">
          {timeline.map((t) => {
            const st = eq.history[t.week].status;
            const z = statusZone(st);
            const state = revealGold ? t.state : t.leading.length === 1 ? "unique" : t.leading.length ? "tied" : "abstain";
            const on = t.week === week;
            return (
              <button key={t.week} type="button" aria-pressed={on} onClick={() => onWeek(t.week)}
                title={`Week ${t.week + 1} · ${fmtDate(t.date)} · ${st} · leading: ${t.leading.join(", ") || "abstain"}`}
                aria-label={`Week ${t.week + 1}, ${fmtDate(t.date)}, recorded ${st}, leading ${t.leading.join(", ") || "none, abstains"}`}
                className={cn(
                  "group relative flex w-11 flex-col items-center gap-1.5 rounded-lg border px-1 pb-1.5 pt-2 transition-[background-color,border-color] duration-150",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  on ? "border-line-hot bg-accent-soft" : "border-transparent hover:border-line hover:bg-fg/[0.04]",
                )}>
                <StateMark state={state} />
                <span className={cn("text-[12px] font-medium tabular-nums", on ? "text-ink-hi" : "text-ink-3 group-hover:text-ink")}>{t.week + 1}</span>
                <span className={cn("h-[3px] w-6 rounded-full", z === "ok" ? "bg-fg/[0.12]" : ZONE[z].dot)} aria-hidden="true" />
              </button>
            );
          })}
        </div>
      </div>
      <ul className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-ink-3">
        <li className="flex items-center gap-1.5"><StateMark state="unique" /> one leading cause</li>
        <li className="flex items-center gap-1.5"><StateMark state="tied" /> tied</li>
        <li className="flex items-center gap-1.5"><StateMark state="abstain" /> abstains (too few symptoms)</li>
        {revealGold && <li className="flex items-center gap-1.5"><StateMark state="wrong" /> leading cause differs from the RCA</li>}
        <li className="flex items-center gap-1.5"><span className="h-[3px] w-4 rounded-full bg-caution" aria-hidden="true" /> recorded ALARM week</li>
      </ul>
    </div>
  );
}

/** Drawn state marks (no glyphs): filled = one leading cause, half = tied, ring = abstain, cross = differs from RCA. */
export function StateMark({ state }: { state: "unique" | "tied" | "abstain" | "wrong" }) {
  if (state === "wrong") return (
    <svg viewBox="0 0 10 10" className="size-2.5 text-danger" aria-hidden="true"><path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
  );
  return (
    <svg viewBox="0 0 10 10" className={cn("size-2.5", state === "abstain" ? "text-ink-4" : "text-accent")} aria-hidden="true">
      {state === "unique" && <circle cx="5" cy="5" r="4" fill="currentColor" />}
      {state === "tied" && <><circle cx="5" cy="5" r="3.4" fill="none" stroke="currentColor" strokeWidth="1.3" /><path d="M5 1.6a3.4 3.4 0 0 1 0 6.8z" fill="currentColor" /></>}
      {state === "abstain" && <circle cx="5" cy="5" r="3" fill="none" stroke="currentColor" strokeWidth="1.3" />}
    </svg>
  );
}
