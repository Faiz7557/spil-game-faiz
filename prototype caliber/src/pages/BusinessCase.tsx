import { useMemo, useState, type ElementType } from "react";
import { Eraser, ShieldCheck, Users, Wallet, Calculator, FlaskConical } from "lucide-react";
import { REVIEW_DATE, SNAP } from "../domain/data";
import { EXAMPLE_SCENARIO, breakEvenRecurrences, computeCase, type CaseInputs } from "../domain/businessCase";
import { fmtDate, kpis, usd } from "../domain/kpis";
import { api } from "../lib/api";
import { LIVE } from "../lib/supabase";
import { useLoad } from "../lib/live";
import { Note } from "../components/ui";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, type Tone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MeterRow, RadialMeter, SERIES } from "@/components/ui/chart";
import { cn } from "@/lib/utils";
import { BreakEvenChart } from "./value/BreakEvenChart";

type Draft = Partial<Record<keyof CaseInputs, number>>;
type Group = "Labour" | "Reliability" | "Cost";
const FIELDS: { key: keyof CaseInputs; label: string; group: Group; unit: string; hint?: string }[] = [
  { key: "rcaPerYear", label: "RCAs prepared per year", group: "Labour", unit: "count" },
  { key: "hoursPerRcaBaseline", label: "Engineer hours per RCA today", group: "Labour", unit: "h" },
  { key: "hoursPerRcaWithTool", label: "Hours per RCA with PlantPulse", group: "Labour", unit: "h", hint: "Measure with the task protocol in evaluation/results.md §C. Leave empty until measured." },
  { key: "loadedCostPerHour", label: "Loaded engineer cost", group: "Labour", unit: "US$/h" },
  { key: "adoption", label: "Adoption fraction", group: "Labour", unit: "0–1", hint: "Measured in the pilot. Leave empty until then." },
  { key: "avoidedRecurrences", label: "Recurrences avoided per year", group: "Reliability", unit: "count" },
  { key: "avgRecordedLossPerRecurrence", label: "Loss per recurrence (agreed basis)", group: "Reliability", unit: "US$" },
  { key: "avoidableShare", label: "Share attributable to PlantPulse", group: "Reliability", unit: "0–1" },
  { key: "platformCostPerYear", label: "Hosting and licences per year", group: "Cost", unit: "US$" },
  { key: "aiCostPerTask", label: "AI cost per task", group: "Cost", unit: "US$" },
  { key: "aiTasksPerYear", label: "AI tasks per year", group: "Cost", unit: "count" },
  { key: "integrationOneOff", label: "Integration (one-off)", group: "Cost", unit: "US$" },
];
const GROUPS: { g: Group; note: string; icon: ElementType }[] = [
  { g: "Labour", note: "Time saved preparing RCAs.", icon: Users },
  { g: "Reliability", note: "Repeat failures avoided because actions were verified, not just closed.", icon: ShieldCheck },
  { g: "Cost", note: "What running PlantPulse costs.", icon: Wallet },
];
const NEEDS = {
  labour: ["rcaPerYear", "hoursPerRcaBaseline", "hoursPerRcaWithTool", "loadedCostPerHour", "adoption"],
  reliability: ["avoidedRecurrences", "avgRecordedLossPerRecurrence", "avoidableShare"],
  running: ["platformCostPerYear", "aiCostPerTask", "aiTasksPerYear"],
} satisfies Record<string, (keyof CaseInputs)[]>;

/** Where an example value comes from, as a status the reader can scan: measured, from the dataset, or assumed. */
function provenance(source: string): { label: string; tone: Tone } {
  if (source.startsWith("Measured")) return { label: "Measured", tone: "ok" };
  if (source.startsWith("Dataset")) return { label: "Dataset", tone: "info" };
  return { label: "Assumption", tone: "sim" };
}

export default function BusinessCase() {
  const [d, setD] = useState<Draft>({});
  const [example, setExample] = useState(false);
  const measured = useLoad(async () => {
    const r = await api<{ features: { feature: string; runs: number; avg_cost: number }[] }>("/api/admin/ai-quality");
    const runs = r.features.reduce((s, f) => s + f.runs, 0);
    return runs ? { avg: r.features.reduce((s, f) => s + f.avg_cost * f.runs, 0) / runs, runs } : null;
  }, [], LIVE);
  const k = kpis(SNAP.incidents, SNAP.meta.open_statuses, REVIEW_DATE);
  const result = useMemo(() => computeCase(d as CaseInputs), [d]);
  const missing = (keys: (keyof CaseInputs)[]) => keys.filter((x) => result.missing.includes(x));
  const label = (key: keyof CaseInputs) => FIELDS.find((f) => f.key === key)!.label.toLowerCase();
  const needs = (keys: (keyof CaseInputs)[]) => {
    const m = missing(keys);
    return <span className="block text-[14px] font-medium leading-snug text-ink-3" title={`Needs ${m.map(label).join(", ")}`}>
      Waiting for {m.length} input{m.length === 1 ? "" : "s"}
      <span className="mt-1 block text-[12px] font-normal text-ink-4">{m.slice(0, 3).map(label).join(" · ")}{m.length > 3 ? ` · +${m.length - 3} more` : ""}</span>
    </span>;
  };
  const value = (v: number | null, keys: (keyof CaseInputs)[]) => v === null ? needs(keys) : <span className="tabular-nums">{usd(Math.round(v))}</span>;
  const filled = FIELDS.length - result.missing.length;
  const complete = result.missing.length === 0;
  const breakEven = complete ? breakEvenRecurrences(d as CaseInputs) : null;
  const meterMax = Math.max(result.labourBenefit ?? 0, result.reliabilityBenefit ?? 0, result.runningCost ?? 0, 1);

  const loadExample = () => { setExample(true); setD(Object.fromEntries(Object.entries(EXAMPLE_SCENARIO).map(([key, v]) => [key, v.value]))); };
  const set = (key: keyof CaseInputs, raw: string) => { setExample(false); setD({ ...d, [key]: raw === "" ? undefined : Number(raw) }); };

  return (
    <>
      <PageHeader title="Business case"
        badges={example ? <Badge tone="sim">Example scenario</Badge> : undefined}
        description={<>Break-even from your own inputs. Values marked <i>Assumption</i> are not measured.</>}
        actions={<>
          <Button variant="primary" size="sm" onClick={loadExample}><FlaskConical className="size-3.5" aria-hidden="true" />Load example scenario</Button>
          <Button size="sm" disabled={!filled} onClick={() => { setExample(false); setD({}); }}><Eraser className="size-3.5" aria-hidden="true" />Clear inputs</Button>
        </>} />

      {example && <div className="mb-4"><Note tone="sim">Example scenario: assumptions, not measured results.</Note></div>}

      <div className="tw grid items-start gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(380px,1fr)]">
        {/* inputs */}
        <div className="flex min-w-0 flex-col gap-4">
          {GROUPS.map(({ g, note, icon }) => {
            const fields = FIELDS.filter((f) => f.group === g);
            const done = fields.filter((f) => !result.missing.includes(f.key)).length;
            return (
              <Card key={g} as="section" aria-labelledby={`bc-${g}`}>
                <CardHeader action={<Badge tone={done === fields.length ? "ok" : "neutral"} dot={done === fields.length}>{done} of {fields.length} entered</Badge>}>
                  <CardTitle icon={icon} id={`bc-${g}`}>{g}</CardTitle>
                  <CardDescription>{note}</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
                  {fields.map((f) => {
                    const src = example ? EXAMPLE_SCENARIO[f.key].source : null;
                    const prov = src ? provenance(src) : null;
                    return (
                      <label key={f.key} className="flex min-w-0 flex-col gap-1.5">
                        <span className="flex items-baseline justify-between gap-2 text-[13px] font-medium text-ink-2">
                          <span className="min-w-0">{f.label}</span>
                          <span className="shrink-0 text-[11.5px] font-normal text-ink-3">{f.unit}</span>
                        </span>
                        <input className="input num" type="number" inputMode="decimal" step="any" min={0} max={f.unit === "0–1" ? 1 : undefined}
                          value={d[f.key] ?? ""} onChange={(e) => set(f.key, e.target.value)} />
                        {src && prov && (
                          <span className="flex items-start gap-1.5 text-[11.5px] leading-snug text-ink-3">
                            <Badge tone={prov.tone} className="shrink-0">{prov.label}</Badge><span className="pt-px">{src}</span>
                          </span>
                        )}
                        {f.key === "rcaPerYear" && <span className="text-[11.5px] leading-snug text-ink-3">Dataset context: {k.n} records from {fmtDate(k.firstDate)} to {fmtDate(k.lastDate)}; {k.rcaDuePassed} open records past RCA due on {fmtDate(REVIEW_DATE)}.</span>}
                        {f.key === "aiCostPerTask" && measured.data && (
                          <Button variant="ghost" size="sm" className="self-start" onClick={() => setD({ ...d, aiCostPerTask: Number(measured.data!.avg.toFixed(4)) })}>
                            Use measured average: US${measured.data.avg.toFixed(3)} over {measured.data.runs} runs
                          </Button>)}
                        {f.hint && <span className="text-[11.5px] leading-snug text-ink-3">{f.hint}</span>}
                      </label>
                    );
                  })}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* result */}
        <aside className="flex min-w-0 flex-col gap-3 xl:sticky xl:top-4" aria-label="Result">
          <Card>
            <CardHeader action={<Badge tone={complete ? "accent" : "neutral"}>{filled} of {FIELDS.length} inputs entered</Badge>}>
              <CardTitle icon={Calculator}>Result</CardTitle>
              <CardDescription>From your inputs only. Not a measured saving.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <div className="flex items-end justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-[12.5px] text-ink-3">Annual net</div>
                  <div className={cn("mt-1.5 text-[28px] font-semibold leading-none tracking-[-0.035em]",
                    result.annualNet === null ? "" : result.annualNet >= 0 ? "text-ink-hi" : "text-danger-ink")}>
                    {value(result.annualNet, [...NEEDS.labour, ...NEEDS.reliability, ...NEEDS.running])}
                  </div>
                </div>
                {!complete && <RadialMeter value={filled} max={FIELDS.length} size={84} label={`${filled}/${FIELDS.length}`} sub="inputs" />}
              </div>

              <div className="flex flex-col gap-1 rounded-xl border border-line bg-[rgb(var(--well-rgb)/0.35)] p-2">
                <MeterRow label="Labour benefit / yr" value={result.labourBenefit ?? 0} max={meterMax} color={SERIES[0]}
                  display={result.labourBenefit === null ? <span className="text-[12px] font-normal text-ink-3">needs {missing(NEEDS.labour).length} input{missing(NEEDS.labour).length > 1 ? "s" : ""}</span> : usd(Math.round(result.labourBenefit))} />
                <MeterRow label="Reliability benefit / yr" value={result.reliabilityBenefit ?? 0} max={meterMax} color={SERIES[2]}
                  display={result.reliabilityBenefit === null ? <span className="text-[12px] font-normal text-ink-3">needs {missing(NEEDS.reliability).length} input{missing(NEEDS.reliability).length > 1 ? "s" : ""}</span> : usd(Math.round(result.reliabilityBenefit))} />
                <MeterRow label="Running cost / yr" value={result.runningCost ?? 0} max={meterMax} color={SERIES[1]}
                  display={result.runningCost === null ? <span className="text-[12px] font-normal text-ink-3">needs {missing(NEEDS.running).length} input{missing(NEEDS.running).length > 1 ? "s" : ""}</span> : <>−{usd(Math.round(result.runningCost))}</>} />
              </div>

              <dl className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-line px-3.5 py-3">
                  <dt className="text-[12px] text-ink-3">Year-1 net</dt>
                  <dd className="mt-1.5 text-[17px] font-semibold tracking-[-0.02em] text-ink-hi">{value(result.netYear1, FIELDS.map((f) => f.key))}</dd>
                </div>
                <div className="rounded-xl border border-line px-3.5 py-3">
                  <dt className="text-[12px] text-ink-3">Payback</dt>
                  <dd className="mt-1.5 text-[17px] font-semibold tracking-[-0.02em] text-ink-hi">
                    {result.paybackMonths === null
                      ? <span className={cn("text-[12.5px] font-normal", result.missing.length ? "text-caution-ink" : "text-danger-ink")}>{result.missing.length ? "Not computable yet" : "Does not pay back"}</span>
                      : <span className="tabular-nums">{result.paybackMonths.toFixed(1)} months</span>}
                  </dd>
                </div>
              </dl>

              {complete && result.labourBenefit !== null && result.reliabilityBenefit !== null && result.runningCost !== null ? (
                <div>
                  <h3 className="mb-2 text-[13px] font-medium text-ink-2">Cumulative value vs cost</h3>
                  <BreakEvenChart labour={result.labourBenefit} reliability={result.reliabilityBenefit} running={result.runningCost}
                    oneOff={d.integrationOneOff ?? 0} paybackMonths={result.paybackMonths} />
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-line-strong px-4 py-5 text-center text-[13px] leading-relaxed text-ink-3">
                  The break-even chart appears when all {FIELDS.length} inputs are entered. Nothing is filled in for you.
                </div>
              )}

              {(breakEven !== null || !!result.runningCost) && (
                <div className="flex flex-col gap-2 border-t border-line pt-4 text-[13px] leading-relaxed text-ink-2">
                  {breakEven !== null && <p>Break-even: about <b className="text-ink-hi tabular-nums">{breakEven.toFixed(1)}</b> average incidents avoided per year.</p>}
                  {result.runningCost ? <p>One KO-3201-class event (US$1,584,000 recorded) equals <b className="text-ink-hi tabular-nums">{(1584000 / result.runningCost).toFixed(1)}</b> years of running cost.</p> : null}
                </div>
              )}
            </CardContent>
          </Card>
          <Note>Recorded loss in the dataset is production loss × product price, not contribution margin. Agree the economic basis with finance before using the reliability benefit.</Note>
          <Note tone="warn">No time-saving, downtime or savings figure has been measured yet. This calculator is for the company's own numbers during a pilot.</Note>
        </aside>
      </div>
    </>
  );
}

