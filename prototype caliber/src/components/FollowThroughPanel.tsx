// prototype/src/components/FollowThroughPanel.tsx
import { Activity, GitBranch } from "lucide-react";
import { SNAP, equipmentByTag, rcaByTag } from "../domain/data";
import { effectiveness, sisterAssets } from "../domain/followThrough";
import { Note } from "./ui";
import { TagChip } from "@/components/shell/Shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, type Tone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MeterRow, RadialMeter, STATUS_HEX } from "@/components/ui/chart";

const VERDICT: Record<string, [string, "" | "warn" | "danger" | "ok", string]> = {
  no_trip: ["No trip in the record.", "", "No trip"],
  no_post_data: ["No readings after the trip yet.", "warn", "No post-trip data"],
  not_recovered: ["Not recovered: at least one signal is still outside its baseline band.", "danger", "Not recovered"],
  recovered_window_short: ["Condition recovered, but the observation window is shorter than required.", "warn", "Window too short"],
  recovered: ["Condition recovered over the full observation window.", "ok", "Recovered"],
};
const BADGE: Record<string, Tone> = { "": "neutral", warn: "warn", danger: "danger", ok: "ok" };
const HEX: Record<string, string> = { "": STATUS_HEX.muted, warn: STATUS_HEX.warn, danger: STATUS_HEX.danger, ok: STATUS_HEX.ok };

export default function FollowThroughPanel({ tag, onCreate }: { tag: string; onCreate: (title: string, ref: string, rationale: string) => void }) {
  const eq = equipmentByTag(tag)!;
  const e = effectiveness(eq, rcaByTag(tag));
  const sisters = sisterAssets(SNAP, tag);
  const [text, tone, short] = VERDICT[e.verdict];
  return (
    <div className="tw grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
      <Card>
        <CardHeader action={<Badge tone={BADGE[tone]} dot>{short}</Badge>}>
          <CardTitle icon={Activity}>Did the fix work?</CardTitle>
          <CardDescription>Recorded condition readings after the trip, compared with each signal's pre-trip baseline band.</CardDescription>
        </CardHeader>
        <CardContent className="pt-3">
          <div className="flex flex-wrap items-center gap-4">
            <RadialMeter value={e.weeksObserved} max={e.required} color={HEX[tone]} size={112}
              label={<>{e.weeksObserved}<span className="text-[13px] font-normal text-ink-3">/{e.required}</span></>} sub="weeks observed" />
            <div className="min-w-0 flex-[1_1_240px]">
              <Note tone={tone}>{text} {e.weeksObserved} of {e.required} weeks observed after the trip on {e.tripDate ?? "n/a"}. {e.openSourceActions} source action{e.openSourceActions === 1 ? "" : "s"} not recorded Closed. Condition recovery alone never marks an action verified.</Note>
            </div>
          </div>
          {e.signals.length > 0 && (
            <div className="mt-4">
              <div className="mb-1 flex items-baseline justify-between px-2 text-[12px] text-ink-3"><span>Signal · weeks inside baseline band</span><span>Latest · z</span></div>
              {e.signals.map((s) => (
                <MeterRow key={s.param} value={s.okWeeks} max={s.postWeeks || 1} color={s.ok ? STATUS_HEX.ok : STATUS_HEX.danger}
                  label={<span className="inline-flex items-center gap-2">{s.param}{!s.ok && <Badge tone="danger">Out</Badge>}</span>}
                  display={<>{s.okWeeks}/{s.postWeeks} wk</>}
                  hint={<>Latest {s.latest} {s.unit} · z {s.latestZ}</>} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader action={<span className="text-[12px] tabular-nums text-ink-3">{sisters.length} found</span>}>
          <CardTitle icon={GitBranch}>Where else could it happen?</CardTitle>
          <CardDescription>Sister assets named in the RCA, or register records with the same type and component.</CardDescription>
        </CardHeader>
        <CardContent className="pt-3">
          {!sisters.length ? <p className="text-[13px] text-ink-3">No sister asset named in the RCA and no same type+component record in the register.</p> : (
            <ul className="divide-y divide-line">
              {sisters.map((s, i) => (
                <li key={i} className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2 py-3 first:pt-0">
                  <div className="min-w-0 flex-[1_1_220px]">
                    <div className="flex flex-wrap items-center gap-2">
                      {s.tag ? <TagChip tag={s.tag} /> : <Badge>Fleet</Badge>}
                      <span className="text-[13px] text-ink">{s.scope}</span>
                    </div>
                    <div className="mt-1 text-[12px] text-ink-3">{s.reason} · {s.ref}</div>
                  </div>
                  <Button size="sm" onClick={() => onCreate(`Sister-asset check: ${s.tag ?? s.scope}`, s.ref, s.reason)}>Create check action</Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
