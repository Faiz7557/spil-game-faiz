import { Activity, ArrowUpRight } from "lucide-react";
import { Gauge, gaugeZone } from "@/components/ui/gauge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, type Tone } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { SNAP } from "../domain/data";
import { fleetReadings } from "../domain/fleet";
import { fmtDate } from "../domain/kpis";
import { useDrawer } from "./ui";
import { plainName } from "../domain/names";

const num = (v: number) => (Math.abs(v) >= 100 ? v.toFixed(0) : Math.abs(v) >= 10 ? v.toFixed(1) : v.toFixed(2));
const ZONE_TONE: Record<string, Tone> = { ok: "ok", alarm: "warn", trip: "danger" };
const WEEK_FILL: Record<string, string> = { NORMAL: "bg-ok/70", ALARM: "bg-caution", TRIP: "bg-danger" };

/**
 * Condition of the five fully documented assets: the lead parameter against its own alarm and trip limits
 * (needle = last weekly route, red tick = worst week), plus every weekly route status as a strip.
 */
export default function FleetPanel() {
  const fleet = fleetReadings(SNAP.equipment);
  const open = useDrawer();
  return (
    <Card className="h-full" aria-labelledby="fleet-h">
      <CardHeader action={<span className="flex items-center gap-3 text-[11.5px] text-ink-3"><Key c="bg-ok/70" l="Normal" /><Key c="bg-caution" l="Alarm" /><Key c="bg-danger" l="Trip" /></span>}>
        <CardTitle id="fleet-h" icon={Activity}>Condition at the last weekly route</CardTitle>
        <CardDescription>Lead parameter against its own limits. Red marker: worst week.</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {fleet.map((f) => {
            const zone = gaugeZone(f.latest.value, f.param.alarm, f.param.trip, f.param.direction);
            const eq = SNAP.equipment.find((e) => e.tag === f.tag)!;
            return (
              <li key={f.tag} className={cn("group relative flex flex-col rounded-xl border border-line bg-fg/[0.025] p-3.5 transition-colors hover:border-line-strong",
                zone === "trip" && "shadow-[inset_0_1px_0_rgb(var(--danger-rgb)/0.35)]", zone === "alarm" && "shadow-[inset_0_1px_0_rgb(var(--caution-rgb)/0.35)]")}>
                <div className="flex items-start justify-between gap-2">
                  <a href={`#/queue/${f.tag}`} className="min-w-0 rounded-md">
                    <span className="flex items-center gap-1 text-[14px] font-semibold leading-snug text-ink-hi">{plainName(f.tag)}<ArrowUpRight className="size-3.5 shrink-0 text-ink-4 transition-colors group-hover:text-accent-ink" aria-hidden="true" /></span>
                    <span className="mt-0.5 block font-mono text-[11.5px] text-ink-3">{f.tag}</span>
                  </a>
                  <Badge tone={ZONE_TONE[zone]} dot pulse={zone !== "ok"}>{f.latest.status}</Badge>
                </div>
                <Gauge className="mx-auto mt-2 max-w-[180px]" value={f.latest.value} alarm={f.param.alarm} trip={f.param.trip} direction={f.param.direction} ghost={f.worst.value}
                  label={`${f.tag} ${f.param.name}: ${num(f.latest.value)} ${f.param.unit}; worst ${num(f.worst.value)}; alarm ${f.param.alarm}, trip ${f.param.trip}`} />
                <div className="relative -mt-[3.3rem] text-center leading-none">
                  <span className="block text-[22px] font-semibold leading-none tracking-[-0.03em] tabular-nums text-ink-hi">{num(f.latest.value)}</span>
                  <span className="mt-1 block text-[11px] text-ink-3">{f.param.unit}</span>
                  <span className="mt-2 block truncate text-[11.5px] text-ink-3">{f.param.name}</span>
                </div>
                <div className="mt-3" role="img" aria-label={`${f.tag} weekly route status, ${eq.history.length} weeks: ${eq.history.filter((h) => h.status === "TRIP").length} trip, ${eq.history.filter((h) => h.status === "ALARM").length} alarm`}>
                  <div className="flex h-2 gap-[2px]">
                    {eq.history.map((h) => (
                      <span key={h.week} title={`Week ${h.week} · ${fmtDate(h.date)} · ${h.status}`} className={cn("flex-1 rounded-[2px] first:rounded-l-full last:rounded-r-full", WEEK_FILL[h.status] ?? "bg-fg/10")} />
                    ))}
                  </div>
                  <div className="mt-1 flex justify-between text-[10.5px] text-ink-4"><span>{fmtDate(eq.history[0].date)}</span><span>{eq.history.length} weekly routes</span></div>
                </div>
                <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 border-t border-dashed border-line-strong pt-2.5 text-[12px]">
                  <dt className="text-ink-3">Last route</dt>
                  <dd className="m-0 text-right tabular-nums">
                    <button type="button" className="cite" onClick={() => open({ kind: "evidence", id: `${eq.source}:hist:${f.latest.date}` })}>{fmtDate(f.latest.date)}</button>
                  </dd>
                  <dt className="text-ink-3">Worst week</dt>
                  <dd className="m-0 text-right tabular-nums text-danger-ink">{num(f.worst.value)} · {fmtDate(f.worst.date)}</dd>
                  <dt className="text-ink-3">Alarm / trip</dt>
                  <dd className="m-0 text-right tabular-nums text-ink-2">{f.param.alarm} / {f.param.trip}</dd>
                </dl>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

function Key({ c, l }: { c: string; l: string }) {
  return <span className="flex items-center gap-1.5"><span className={cn("h-2 w-3 rounded-[2px]", c)} aria-hidden="true" />{l}</span>;
}
