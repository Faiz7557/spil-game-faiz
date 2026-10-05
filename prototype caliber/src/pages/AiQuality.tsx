import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Activity, CircleCheck, CircleDollarSign, ClipboardList, ShieldCheck, Timer, Ban } from "lucide-react";
import analytics from "../data/analytics.json";
import { SNAP } from "../domain/data";
import { api } from "../lib/api";
import { LIVE } from "../lib/supabase";
import { useLoad } from "../lib/live";
import { Empty, Note } from "../components/ui";
import { PageHeader, SectionLabel } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatTile } from "@/components/ui/stat-tile";
import { Badge } from "@/components/ui/badge";
import { Donut, Legend, rechartsTip, STATUS_HEX, TrackColumns } from "@/components/ui/chart";

interface Row { feature: string; runs: number; total_cost: number; avg_cost: number; p50_latency_ms: number; refusals: number; guard: { supported: number; partial: number; unsupported: number; not_required: number } | null }

const FEATURE: Record<string, string> = {
  rca_auditor: "RCA auditor", copilot: "Copilot + Evidence Guard", evidence_reader: "Closure evidence reader",
  rca_draft: "RCA backlog drafts", pattern_label: "Failure-family labels", anomaly_explain: "Anomaly explanation",
};
const name = (f: string) => FEATURE[f] ?? f;
const SHORT: Record<string, string> = { rca_auditor: "Auditor", copilot: "Copilot", evidence_reader: "Evidence", rca_draft: "Drafts", pattern_label: "Families", anomaly_explain: "Anomaly" };
const short = (f: string) => SHORT[f] ?? f;
const GUARD = [
  { key: "supported", label: "Supported", color: STATUS_HEX.ok },
  { key: "partial", label: "Partly supported", color: STATUS_HEX.warn },
  { key: "unsupported", label: "Unsupported", color: STATUS_HEX.danger },
] as const;

/** Evaluations recorded in evaluation/runs. Status is updated by hand when a run is added; "not run" is the honest default. */
const EVALS: { feature: string; measure: string; result: string; status: "recorded" | "not_run" }[] = [
  { feature: "Data pipeline", measure: "Reproduction checks against the design audit", result: "23 of 23 pass", status: "recorded" },
  { feature: "KO-3201 brief (recorded run)", measure: "Factual statements supported by the cited excerpt", result: "15 of 15", status: "recorded" },
  { feature: "Anomaly detection", measure: "Series flagged before their shutdown", result: `${Object.values(analytics.anomalies).filter((e) => (e as { lead_hours: number | null }[]).some((x) => x.lead_hours !== null)).length} of ${SNAP.hourly.length} (KO-3201: 46 h ahead; PM-4405B missed)`, status: "recorded" },
  { feature: "RCA auditor", measure: "Hand-found KO-3201 conflicts found (CF-01 to CF-05)", result: "3 of 5 (CF-03, CF-04 missed) · prompt injection passed", status: "recorded" },
  { feature: "Copilot", measure: "Reference questions passed (G01, G03–G05, G09, savings)", result: "6 of 6 (first run 5 of 6, before the hourly tool)", status: "recorded" },
  { feature: "Evidence reader", measure: "Synthetic fixtures handled as expected", result: "3 of 4 (all kinds right; one extra warning)", status: "recorded" },
  { feature: "Failure families", measure: "Families judged coherent by a human reviewer", result: "Review pending", status: "not_run" },
];

function LiveRuns({ rows }: { rows: Row[] }) {
  const runs = rows.reduce((s, r) => s + r.runs, 0);
  const total = rows.reduce((s, r) => s + r.total_cost, 0);
  const refusals = rows.reduce((s, r) => s + r.refusals, 0);
  const guard = GUARD.map((g) => ({ ...g, value: rows.reduce((s, r) => s + (r.guard?.[g.key] ?? 0), 0) }));
  const guarded = guard.reduce((s, g) => s + g.value, 0);
  const supported = guard[0].value;
  const guardRows = rows.filter((r) => r.guard && r.guard.supported + r.guard.partial + r.guard.unsupported > 0)
    .map((r) => ({ name: name(r.feature), supported: r.guard!.supported, partial: r.guard!.partial, unsupported: r.guard!.unsupported }));

  return (
    <>
      <div className="tw grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile accent="var(--series-1)" label="Model calls" icon={Activity} value={runs.toLocaleString()} context={`${rows.length} feature${rows.length === 1 ? "" : "s"} · last 30 days`} />
        <StatTile accent="var(--series-2)" label="Total cost" icon={CircleDollarSign} value={`US$${total.toFixed(2)}`} context={runs ? `US$${(total / runs).toFixed(3)} per call on average` : undefined} />
        <StatTile label="Guard: supported sentences" icon={ShieldCheck} tone={guarded ? (supported === guarded ? "ok" : undefined) : undefined}
          value={guarded ? `${supported} of ${guarded}` : "—"} context={guarded ? `${guard[1].value} partly · ${guard[2].value} unsupported` : "No guarded sentences yet"} />
        <StatTile accent="var(--series-3)" label="Refusals" icon={Ban} value={refusals} context="Across all features, last 30 days" />
      </div>

      <div className="tw mt-4 grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle icon={CircleDollarSign}>Average cost per call</CardTitle>
            <CardDescription>US$ per run, by feature.</CardDescription>
          </CardHeader>
          <CardContent>
            <TrackColumns height={220} unit="US$ avg" fmt={(v) => v.toFixed(3)} xLabel={short}
              data={rows.map((r) => ({ key: r.feature, value: r.avg_cost, note: `${name(r.feature)} · ${r.runs} runs · US$${r.total_cost.toFixed(2)} total` }))} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle icon={Timer}>Median latency</CardTitle>
            <CardDescription>Seconds per call (p50), by feature.</CardDescription>
          </CardHeader>
          <CardContent>
            <TrackColumns height={220} unit="s" fmt={(v) => v.toFixed(1)} xLabel={short}
              data={rows.map((r) => ({ key: r.feature, value: r.p50_latency_ms / 1000, note: `${name(r.feature)} · ${r.refusals} refusal${r.refusals === 1 ? "" : "s"}` }))} />
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle icon={ShieldCheck}>Evidence Guard verdicts</CardTitle>
          <CardDescription>Sentences checked against the excerpt they cite.</CardDescription>
        </CardHeader>
        <CardContent>
          {!guarded ? <Empty title="No guarded sentences yet">Ask the copilot a question; each sentence it writes is checked and counted here.</Empty> : (
            <div className="flex flex-col items-center gap-6 md:flex-row md:items-start">
              <Donut size={168} data={guard.map((g) => ({ key: g.key, label: g.label, value: g.value, color: g.color }))}
                center={{ value: `${Math.round((supported / guarded) * 100)}%`, label: "supported" }} />
              <div className="w-full min-w-0 flex-1">
                <div style={{ height: Math.max(120, guardRows.length * 44 + 30) }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={guardRows} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 0 }} barCategoryGap="30%">
                      <CartesianGrid horizontal={false} />
                      <XAxis type="number" tickLine={false} axisLine={false} allowDecimals={false} />
                      <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} width={150} />
                      <Tooltip cursor={false} content={rechartsTip({ fmt: (v) => `${v} sentence${v === 1 ? "" : "s"}` })} />
                      {GUARD.map((g, i) => (
                        <Bar key={g.key} dataKey={g.key} name={g.label} stackId="g" fill={g.color} maxBarSize={18}
                          radius={i === GUARD.length - 1 ? [0, 4, 4, 0] : i === 0 ? [4, 0, 0, 4] : 0} isAnimationActive animationDuration={600} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <Legend className="mt-3" items={GUARD.map((g) => ({ label: g.label, color: g.color, swatch: "bar" as const }))} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle icon={ClipboardList}>By feature</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto pt-2">
          <table className="table">
            <thead><tr><th>Feature</th><th className="r">Runs</th><th className="r">Avg cost</th><th className="r">Median latency</th><th className="r">Refusals</th><th style={{ width: "30%" }}>Evidence Guard verdicts (sentences)</th></tr></thead>
            <tbody>{rows.map((f) => {
              const g = f.guard; const t = g ? g.supported + g.partial + g.unsupported : 0;
              return (
                <tr key={f.feature}>
                  <td><b>{name(f.feature)}</b></td><td className="r num">{f.runs}</td><td className="r num">US${f.avg_cost.toFixed(3)}</td>
                  <td className="r num">{(f.p50_latency_ms / 1000).toFixed(1)} s</td><td className="r num">{f.refusals}</td>
                  <td>{g && t ? (
                    <div>
                      <div className="flex h-1.5 overflow-hidden rounded-full bg-fg/[0.07]" role="img" aria-label={`${g.supported} supported, ${g.partial} partly, ${g.unsupported} unsupported`}>
                        <span style={{ width: `${(100 * g.supported) / t}%`, background: "var(--ok)" }} />
                        <span style={{ width: `${(100 * g.partial) / t}%`, background: "var(--caution)" }} />
                        <span style={{ width: `${(100 * g.unsupported) / t}%`, background: "var(--danger)" }} />
                      </div>
                      <div className="tiny muted" style={{ marginTop: 4 }}>{g.supported} supported · {g.partial} partly · {g.unsupported} unsupported</div>
                    </div>) : <span className="muted tiny">Not applicable</span>}</td>
                </tr>);
            })}</tbody>
          </table>
        </CardContent>
      </Card>
    </>
  );
}

export default function AiQuality() {
  const live = useLoad(() => api<{ since: string; features: Row[] }>("/api/admin/ai-quality"), [], LIVE);
  const rows = live.data?.features ?? [];
  const recorded = EVALS.filter((e) => e.status === "recorded").length;
  return (
    <>
      <PageHeader title="AI quality"
        description="Every model call logged with cost, latency and validation. Results stay internal until independently reviewed." />

      <SectionLabel right={rows.length > 0 ? <span className="text-[12px] text-ink-3">{rows.reduce((s, r) => s + r.runs, 0)} runs · US${rows.reduce((s, r) => s + r.total_cost, 0).toFixed(2)} total</span> : undefined}>
        Live runs · last 30 days
      </SectionLabel>
      {!LIVE ? <Note tone="warn">Run logs live in the hosted database. This offline demo makes no AI calls.</Note>
        : live.status === "loading" ? <div className="skeleton-block" />
          : live.status === "error" ? <Note tone="danger">{live.error}</Note>
            : !rows.length ? <Card><CardContent><Empty title="No AI runs in the last 30 days">Audit an RCA or ask the copilot; each call appears here with its cost.</Empty></CardContent></Card>
              : <LiveRuns rows={rows} />}

      <Card className="mt-6">
        <CardHeader action={<Badge tone="neutral">{recorded} of {EVALS.length} recorded</Badge>}>
          <CardTitle icon={CircleCheck}>Evaluations</CardTitle>
          <CardDescription>Internal · results saved in evaluation/runs/</CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          <ul className="divide-y divide-line">
            {EVALS.map((e) => (
              <li key={e.feature} className="grid gap-x-4 gap-y-1 py-3 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.3fr)_minmax(0,1.1fr)] md:items-center">
                <span className="text-[13.5px] font-medium text-ink-hi">{e.feature}</span>
                <span className="text-[13px] leading-snug text-ink-2">{e.measure}</span>
                <span className="md:text-right">
                  {e.status === "recorded"
                    ? <span className="text-[13px] font-medium tabular-nums text-ink">{e.result}</span>
                    : <Badge>Not run yet · {e.result}</Badge>}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </>
  );
}
