import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import {
  AlarmClock, ArrowRight, Banknote, Check, Clock, Database, FolderOpen, Gauge as GaugeIcon, LayoutGrid, ListChecks, RotateCcw, ShieldAlert, Tags, TrendingUp, X, Zap, Factory, Layers,
} from "lucide-react";
import { EMAP, REVIEW_DATE, SNAP, VALIDATION } from "../domain/data";
import { ALL, applyFilter, fmtDate, groupSum, kpis, usd, usdM, type Filter } from "../domain/kpis";
import { buildQueue, CATEGORIES } from "../domain/queue";
import { useDemo } from "../domain/store";
import { go, hashQuery } from "../App";
import { useDrawer, Note } from "../components/ui";
import { LineChart, PairedBars } from "../components/Charts";
import DemoPath, { ROLES, type RoleId } from "../components/DemoPath";
import FleetPanel from "../components/FleetPanel";
import { fleetReadings } from "../domain/fleet";
import { shortName } from "../domain/names";
import { FORECAST } from "../domain/conditionForecast";
import { estimateEnergy } from "../domain/energyEstimate";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { MiniBars, ShareBar, StatTile, periodDelta } from "@/components/ui/stat-tile";
import { Badge, type Tone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Donut, Legend, MeterRow, RadialMeter, STATUS_HEX, type Slice } from "@/components/ui/chart";
import { WidgetGrid, normalizeLayout, type Widget, type WidgetLayout } from "@/components/ui/widget-grid";
import { TagChip } from "@/components/shell/Shell";
import { cn } from "@/lib/utils";

// three.js loads with the overview only, and only once the site card nears the viewport.
const PlantSite = lazy(() => import("../components/three/PlantSite"));
const PLANTS = [...new Set(SNAP.incidents.map((i) => i.plant))].sort();
const YEARS = ["2024", "2025", "2026"];
const compactUsd = (v: number) => (v >= 1e6 ? `US$${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `US$${Math.round(v / 1e3)}k` : `US$${Math.round(v)}`);

/** Widget order per role. Every role sees every widget; the role decides what comes first. */
const PRESETS: Record<RoleId, string[]> = {
  manager: ["site", "trend", "status", "plants", "queue", "fleet", "coverage", "foundation", "assets", "energy", "start"],
  engineer: ["site", "queue", "fleet", "status", "trend", "plants", "assets", "coverage", "foundation", "energy", "start"],
  planner: ["site", "queue", "status", "fleet", "assets", "trend", "plants", "coverage", "foundation", "energy", "start"],
  data: ["site", "coverage", "foundation", "status", "trend", "plants", "energy", "assets", "fleet", "queue", "start"],
};
const KPI_ORDER: Record<RoleId, string[]> = {
  manager: ["actual", "potential", "open", "rca", "downtime"],
  engineer: ["rca", "open", "downtime", "actual", "potential"],
  planner: ["rca", "open", "downtime", "actual", "potential"],
  data: ["open", "actual", "potential", "downtime", "rca"],
};
const STORE_KEY = "plantpulse.overview.v3";
interface Saved { role: RoleId; layouts: Partial<Record<RoleId, WidgetLayout>> }
const readSaved = (): Saved => {
  try { const s = JSON.parse(localStorage.getItem(STORE_KEY) ?? ""); if (s && s.role) return s; } catch { /* first visit or storage blocked */ }
  return { role: "manager", layouts: {} };
};

export default function Overview() {
  // A link can open the overview filtered to one plant: #/overview/TAG?plant=ZCU
  const [f, setF] = useState<Filter>(() => { const pl = hashQuery().get("plant"); return { plant: pl && PLANTS.includes(pl) ? pl : ALL, year: ALL }; });
  const [saved, setSaved] = useState<Saved>(readSaved);
  const [editing, setEditing] = useState(false);
  const open = useDrawer();
  const demo = useDemo();
  const rows = useMemo(() => applyFilter(SNAP.incidents, f), [f]);
  const k = kpis(rows, SNAP.meta.open_statuses, REVIEW_DATE);
  const byPlant = groupSum(rows, "plant");
  const pending = new Set(demo.actions.filter((a) => a.state === "ready_for_verification").map((a) => a.caseTag));
  const queue = buildQueue(SNAP.equipment, SNAP.rca, SNAP.incidents, REVIEW_DATE, pending, { "KO-3201": EMAP.conflicts.filter((c) => c.state === "unresolved").length });
  const filtered = f.plant !== ALL || f.year !== ALL;
  const role = saved.role;

  useEffect(() => { try { localStorage.setItem(STORE_KEY, JSON.stringify(saved)); } catch { /* storage blocked: layout lasts this visit */ } }, [saved]);
  useEffect(() => {
    if (!editing) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !(e.target as HTMLElement)?.closest?.("[aria-pressed], [role='button']")) setEditing(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editing]);

  /** Recorded figures per calendar month of occurrence, zero-filled so gaps read as gaps. */
  const months = useMemo(() => {
    if (!rows.length) return [];
    const m = new Map<string, { actual: number; potential: number; downtime: number; open: number; n: number }>();
    for (const r of rows) {
      const key = r.occurred.slice(0, 7);
      const g = m.get(key) ?? { actual: 0, potential: 0, downtime: 0, open: 0, n: 0 };
      g.actual += r.actual_usd; g.potential += r.potential_usd; g.downtime += r.downtime_h ?? 0; g.n += 1;
      if (SNAP.meta.open_statuses.includes(r.status)) g.open += 1;
      m.set(key, g);
    }
    const keys = [...m.keys()].sort();
    const out: { month: string; actual: number; potential: number; downtime: number; open: number; n: number }[] = [];
    let [y, mo] = keys[0].split("-").map(Number);
    const [ly, lm] = keys[keys.length - 1].split("-").map(Number);
    while (y < ly || (y === ly && mo <= lm)) {
      const key = `${y}-${String(mo).padStart(2, "0")}`;
      out.push({ month: key, ...(m.get(key) ?? { actual: 0, potential: 0, downtime: 0, open: 0, n: 0 }) });
      mo += 1; if (mo > 12) { mo = 1; y += 1; }
    }
    return out;
  }, [rows]);

  const define = (title: string, formula: string, note: string) => open({
    kind: "info", title,
    body: (
      <div className="stack">
        <dl className="kv">
          <dt>Formula</dt><dd className="mono">{formula}</dd>
          <dt>Filter</dt><dd>Plant: {f.plant === ALL ? "all" : f.plant} · Year: {f.year === ALL ? "all" : f.year}</dd>
          <dt>Denominator</dt><dd>{k.n} of {SNAP.incidents.length} register records</dd>
          <dt>Source</dt><dd><button className="cite" onClick={() => open({ kind: "source", id: "L3", loc: "Incident Database · rows 4–383" })}>L3</button> Incident Database</dd>
        </dl>
        <Note>{note}</Note>
      </div>
    ),
  });

  // Headline tiles. Bars show the last 12 months of occurrence; the chip compares the last three months with the
  // three before them, recorded values only. Snapshot counts get a share instead of a change.
  const last12 = months.slice(-12);
  const tiles: Record<string, JSX.Element> = {
    actual: <StatTile key="actual" icon={Banknote} accent="var(--series-1)" label="Recorded actual loss" value={usdM(k.actual)}
      delta={periodDelta(months.map((m) => m.actual))} context={`${k.n} records`}
      visual={<MiniBars values={last12.map((m) => m.actual)} color="var(--series-1)" label="Recorded actual loss, last 12 months" />}
      onClick={() => define("Recorded actual loss", "SUM(Act. Loss (k US$)) × 1,000", "Loss already recorded against incidents. Not a verified financial figure for the company.")} />,
    potential: <StatTile key="potential" icon={TrendingUp} accent="var(--series-2)" label="Recorded potential loss" value={usdM(k.potential)}
      delta={periodDelta(months.map((m) => m.potential))} context="source estimate"
      visual={<MiniBars values={last12.map((m) => m.potential)} color="var(--series-2)" label="Recorded potential loss, last 12 months" />}
      onClick={() => define("Recorded potential loss", "SUM(Pot. Loss (k US$)) × 1,000", "A source estimate. The register gives no probability, so it is not an expected loss and is never added to actual loss as if it had happened.")} />,
    downtime: <StatTile key="downtime" icon={Clock} accent="var(--series-3)" label="Recorded downtime" value={<>{k.downtime.toLocaleString("en-US")}<span className="ml-1 text-[15px] font-medium text-ink-3">h</span></>}
      delta={periodDelta(months.map((m) => m.downtime))} context={`${k.n} records`}
      visual={<MiniBars values={last12.map((m) => m.downtime)} color="var(--series-3)" label="Recorded downtime, last 12 months" />}
      onClick={() => define("Downtime", "SUM(Downtime (hrs))", "Hours recorded per incident. Different plants and periods; not an availability figure.")} />,
    open: <StatTile key="open" icon={FolderOpen} accent="var(--caution)" label="Open-status records" value={<>{k.open}<span className="ml-1.5 text-[15px] font-medium text-ink-3">of {k.n}</span></>}
      chip={`${Math.round((k.open / Math.max(k.n, 1)) * 100)}%`} context={`${usdM(k.openActual)} actual loss behind them`}
      visual={<ShareBar value={k.open} max={k.n} color="var(--caution)" label={`${k.open} of ${k.n} records open`} />}
      onClick={() => define("Open-status records", "COUNT(status ∈ NEW REGISTERED, RCA PROCESS, CA/PA EXECUTION, MONITORING RESULT)", "A snapshot count, not a live backlog. Open does not mean ignored.")} />,
    rca: <StatTile key="rca" icon={AlarmClock} tone={k.rcaDuePassed ? "danger" : undefined} label="RCA due date passed" value={k.rcaDuePassed}
      chip={`${Math.round((k.rcaDuePassed / Math.max(k.open, 1)) * 100)}% of open`} context="needs status confirmation"
      visual={<ShareBar value={k.rcaDuePassed} max={k.open} color="var(--danger)" label={`${k.rcaDuePassed} of ${k.open} open records past RCA due date`} />}
      onClick={() => define("RCA due date passed", `COUNT(open status AND RCA Due Date < ${REVIEW_DATE})`, "A date flag for review. RCA due date is not the CAPA plan date, so this is not a count of overdue actions.")} />,
  };

  /** Per-plant figures for the site view: the year filter applies, the plant filter does not (it is the selection). */
  const siteStats = useMemo(() => PLANTS.map((plant) => {
    const pr = applyFilter(SNAP.incidents, { plant, year: f.year });
    const kk = kpis(pr, SNAP.meta.open_statuses, REVIEW_DATE);
    return { plant, n: kk.n, open: kk.open, actual: kk.actual, rcaDuePassed: kk.rcaDuePassed };
  }), [f.year]);
  const sitePins = useMemo(() => fleetReadings(SNAP.equipment).map((r) => ({ tag: r.tag, name: shortName(r.tag), status: r.latest.status, plant: /\(([^)]+)\)/.exec(r.plant)?.[1] ?? "" })), []);

  const widgets: Widget[] = [
    { id: "site", title: "Site at a glance", span: "full", render: () => (
      <Suspense fallback={<div className="skeleton-block h-[520px]" />}>
        <PlantSite stats={siteStats} pins={sitePins} selected={f.plant === ALL ? null : f.plant}
          onPick={(pl) => setF({ ...f, plant: f.plant === pl ? ALL : pl })} onPin={(tag) => go("investigation", tag)} />
      </Suspense>
    ) },
    { id: "start", title: "Start here", span: "full", render: () => <DemoPath role={role} /> },
    { id: "trend", title: "Loss over time", span: "two-thirds", render: () => <TrendWidget months={months} /> },
    { id: "status", title: "Register status", span: "third", render: () => <StatusWidget rows={rows} total={k.n} /> },
    { id: "plants", title: "Loss by plant", span: "half", render: () => (
      <Card className="h-full">
        <CardHeader action={<span className="text-[12px] text-ink-3">{byPlant.length} plant{byPlant.length === 1 ? "" : "s"}</span>}>
          <CardTitle icon={Factory}>Recorded loss by plant</CardTitle>
          <CardDescription>Select a plant to filter the page.</CardDescription>
        </CardHeader>
        <CardContent>
          <PairedBars rows={byPlant.map((g) => ({ key: g.key, a: g.actual, b: g.potential }))} fmt={usdM} active={f.plant === ALL ? undefined : f.plant}
            legend={["Actual (recorded)", "Potential (source estimate)"]} onPick={(p) => setF({ ...f, plant: f.plant === p ? ALL : p })} />
        </CardContent>
      </Card>
    ) },
    { id: "queue", title: "Review queue", span: "half", render: () => <QueueWidget queue={queue} /> },
    { id: "fleet", title: "Asset condition", span: "full", render: () => <FleetPanel /> },
    { id: "coverage", title: "Data coverage", span: "third", render: () => <CoveragePanel /> },
    { id: "foundation", title: "Data foundation", span: "third", render: () => <FoundationWidget /> },
    { id: "assets", title: "Monitored assets", span: "full", render: () => <AssetBoard /> },
    { id: "energy", title: "Energy proxy", span: "full", render: () => <EnergyPanel /> },
  ];
  const ids = widgets.map((w) => w.id);
  const layout = normalizeLayout(saved.layouts[role] ?? { order: PRESETS[role], hidden: [] }, ids);
  const setLayout = (l: WidgetLayout) => setSaved((s) => ({ ...s, layouts: { ...s.layouts, [role]: l } }));
  const customised = !!saved.layouts[role];

  return (
    <>
      <PageHeader
        title="Executive overview" badges={<Badge tone="accent">KQ2</Badge>}
        description={<>{k.n} records · {k.plants} plants · {fmtDate(k.firstDate)} – {fmtDate(k.lastDate)}. Recorded values, not live plant status.</>}
        actions={
          <>
            <label className="field"><span>Plant</span>
              <select className="input" value={f.plant} onChange={(e) => setF({ ...f, plant: e.target.value })}>
                <option value={ALL}>All 12 plants</option>
                {PLANTS.map((p) => <option key={p}>{p}</option>)}
              </select>
            </label>
            <label className="field"><span>Year occurred</span>
              <select className="input" value={f.year} onChange={(e) => setF({ ...f, year: e.target.value })}>
                <option value={ALL}>2024 – 2026</option>
                {YEARS.map((y) => <option key={y}>{y}</option>)}
              </select>
            </label>
            {filtered && <Button variant="ghost" onClick={() => setF({ plant: ALL, year: ALL })}><X /> Clear</Button>}
          </>
        } />

      <div className="tw mb-5 flex flex-wrap items-center gap-3">
        <span className="text-[12.5px] text-ink-3">View as</span>
        <div className="seg" role="group" aria-label="Dashboard view for role">
          {ROLES.map((r) => (
            <button key={r.id} type="button" aria-pressed={role === r.id} onClick={() => { setSaved((s) => ({ ...s, role: r.id })); }}
              className="inline-flex items-center gap-1.5"><r.icon className="size-3.5" aria-hidden="true" />{r.role}</button>
          ))}
        </div>
        <span className="flex-1" />
        {filtered && <Badge tone="accent" dot>Filtered: {f.plant === ALL ? "all plants" : f.plant} · {f.year === ALL ? "all years" : f.year}</Badge>}
        {customised && !editing && (
          <Button variant="ghost" size="sm" onClick={() => setSaved((s) => { const l = { ...s.layouts }; delete l[role]; return { ...s, layouts: l }; })}>
            <RotateCcw /> Reset layout
          </Button>
        )}
        <Button variant={editing ? "primary" : "default"} size="sm" onClick={() => setEditing((e) => !e)} aria-pressed={editing}>
          {editing ? <><Check /> Done</> : <><LayoutGrid /> Customize</>}
        </Button>
      </div>

      {editing && (
        <div className="tw mb-4 flex items-center gap-2 rounded-xl border border-line-hot bg-accent-soft px-4 py-2.5 text-[13px] text-ink [animation:pp-pop_180ms_cubic-bezier(0.16,1,0.3,1)]">
          <LayoutGrid className="size-4 shrink-0 text-accent-ink" aria-hidden="true" />
          Drag a widget by its handle to reorder, or hide what you don't use. The layout is saved for the {ROLES.find((r) => r.id === role)!.role.toLowerCase()} view in this browser.
        </div>
      )}

      <section aria-label="Headline figures" className="tw mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {KPI_ORDER[role].map((id) => tiles[id])}
      </section>

      <WidgetGrid widgets={widgets} layout={layout} onChange={setLayout} editing={editing} />
    </>
  );
}

/* ---------- widgets ---------- */

/** Phones fit about four month labels on the axis, desktops about nine. */
const narrowChart = () => typeof matchMedia !== "undefined" && matchMedia("(max-width: 640px)").matches;

function TrendWidget({ months }: { months: { month: string; actual: number; potential: number; n: number }[] }) {
  const [mode, setMode] = useState<"loss" | "count">("loss");
  const label = (m: string) => new Date(`${m}-01T00:00:00Z`).toLocaleDateString("en-GB", { month: "short", year: "2-digit", timeZone: "UTC" });
  const peak = months.reduce((p, m, i) => (m.actual > (months[p]?.actual ?? -1) ? i : p), 0);
  return (
    <Card className="h-full">
      <CardHeader action={
        <div className="seg" role="group" aria-label="Measure">
          <button type="button" aria-pressed={mode === "loss"} onClick={() => setMode("loss")}>Loss</button>
          <button type="button" aria-pressed={mode === "count"} onClick={() => setMode("count")}>Records</button>
        </div>
      }>
        <CardTitle icon={TrendingUp}>{mode === "loss" ? "Recorded loss by month of occurrence" : "Records by month of occurrence"}</CardTitle>
        <CardDescription>
          {mode === "loss" ? <>Actual loss as recorded; potential loss is the source's estimate, drawn dashed and never added to actual. Peak month: <b className="font-medium text-ink">{months[peak] ? label(months[peak].month) : "n/a"}</b>.</>
            : "How many incidents the register records per month. A recording pattern, not a failure rate."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {months.length < 2 ? <p className="py-10 text-center text-[13px] text-ink-3">Too few months in this filter to draw a trend.</p> : mode === "loss" ? (
          <LineChart title="Recorded loss by month" unit="US$" height={250} x={months.map((m) => label(m.month))}
            series={[
              { name: "Actual (recorded)", color: "var(--series-1)", values: months.map((m) => m.actual), fill: true },
              { name: "Potential (source estimate)", color: "var(--series-2)", values: months.map((m) => m.potential), dash: "5 4", width: 1.6 },
            ]}
            fmt={compactUsd} yPad={0.02} xTick={(l, i) => (i % Math.max(1, Math.ceil(months.length / (narrowChart() ? 4 : 9))) === 0 ? l : null)} />
        ) : (
          <LineChart title="Records by month" unit="records" height={250} x={months.map((m) => label(m.month))}
            series={[{ name: "Records", color: "var(--series-3)", values: months.map((m) => m.n), fill: true }]}
            fmt={(v) => v.toFixed(0)} yPad={0.02} xTick={(l, i) => (i % Math.max(1, Math.ceil(months.length / (narrowChart() ? 4 : 9))) === 0 ? l : null)} />
        )}
      </CardContent>
    </Card>
  );
}

const STATUS_COLOR: Record<string, string> = {
  "NEW REGISTERED": "var(--accent)", "RCA PROCESS": "var(--series-2)", "CA/PA EXECUTION": "var(--series-3)", "MONITORING RESULT": "var(--series-4)",
  "RISK CLOSED": "var(--ink-4)", "RISK CANCELED": "var(--ink-5)",
};

const STATUS_LABEL: Record<string, string> = { "NEW REGISTERED": "New registered", "RCA PROCESS": "RCA process", "CA/PA EXECUTION": "CA/PA execution", "MONITORING RESULT": "Monitoring result", "RISK CLOSED": "Risk closed", "RISK CANCELED": "Risk canceled" };

function StatusWidget({ rows, total }: { rows: { status: string }[]; total: number }) {
  const [focus, setFocus] = useState<string | undefined>();
  const statuses = SNAP.meta.open_statuses.concat(["RISK CLOSED", "RISK CANCELED"]);
  const data: Slice[] = statuses.map((s) => ({ key: s, label: STATUS_LABEL[s] ?? s, value: rows.filter((r) => r.status === s).length, color: STATUS_COLOR[s] ?? "var(--ink-4)" }));
  const openN = data.filter((d) => SNAP.meta.open_statuses.includes(d.key)).reduce((a, d) => a + d.value, 0);
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle icon={ListChecks}>Register status</CardTitle>
        <CardDescription>Where the {total} records sit in the source's own workflow.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4 sm:flex-row xl:flex-col 2xl:flex-row">
        <Donut data={data} size={164} thickness={16} center={{ value: openN, label: "open records" }} activeKey={focus} onPick={(key) => setFocus(focus === key ? undefined : key)} />
        <ul className="w-full min-w-0 flex-1 space-y-0.5">
          {data.map((d) => {
            const isOpen = SNAP.meta.open_statuses.includes(d.key);
            return (
              <li key={d.key}>
                <button type="button" onClick={() => setFocus(focus === d.key ? undefined : d.key)}
                  className={cn("flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-[12.5px] transition-colors hover:bg-fg/[0.04]", focus && focus !== d.key && "opacity-50", focus === d.key && "bg-fg/[0.05]")}>
                  <span className="size-2 shrink-0 rounded-full" style={{ background: d.color }} aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate text-ink-2">{d.label}</span>
                  {isOpen && <span className="text-[10.5px] text-ink-4">open</span>}
                  <span className="w-8 text-right font-medium tabular-nums text-ink-hi">{d.value}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

const CAT_TONE: Record<string, Tone> = { operational: "danger", investigation: "info", followup: "warn", pending: "ai", planned: "neutral" };

function QueueWidget({ queue }: { queue: ReturnType<typeof buildQueue> }) {
  return (
    <Card className="h-full">
      <CardHeader action={<Button size="sm" onClick={() => go("queue")}>Open Problem Tank <ArrowRight /></Button>}>
        <CardTitle icon={Tags}>Review queue</CardTitle>
        <CardDescription>{queue.length} cases with full RCA packages, ordered by category, criticality, earliest passed plan date. No dollar risk score.</CardDescription>
      </CardHeader>
      <CardContent className="pt-3">
        <ol className="space-y-2">
          {queue.slice(0, 4).map((q, i) => {
            const cat = CATEGORIES.find((c) => c.id === q.category)!;
            const actions = q.rca.actions.length + q.rca.preventive.length;
            const late = q.passedCount + q.noStatusCount;
            return (
              <li key={q.tag}>
                <button type="button" onClick={() => go("queue", q.tag)}
                  className="group flex w-full items-center gap-3 rounded-xl border border-line bg-fg/[0.02] px-3 py-2.5 text-left transition-[border-color,background-color] hover:border-line-strong hover:bg-fg/[0.045]">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-fg/[0.06] text-[12px] font-semibold tabular-nums text-ink-2">{i + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <TagChip tag={q.tag} />
                      <Badge tone={CAT_TONE[q.category]} dot pulse={q.category === "followup"}>{cat.label}</Badge>
                    </span>
                    <span className="mt-1 block truncate text-[12.5px] text-ink-3">{q.equipment.name.replace(` ${q.tag}`, "")} · {q.incident.plant} · class {q.incident.eq_class} · {q.criticality}</span>
                  </span>
                  <span className="hidden w-[118px] shrink-0 sm:block" title={`${late} of ${actions} source actions past plan date without a Closed status`}>
                    <span className="flex justify-between text-[11px] text-ink-3"><span>past plan date</span><span className="tabular-nums text-ink-2">{late}/{actions}</span></span>
                    <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-fg/[0.07]"><span className="block h-full rounded-full bg-caution" style={{ width: `${(late / Math.max(actions, 1)) * 100}%` }} /></span>
                  </span>
                  <ArrowRight className="size-4 shrink-0 text-ink-4 transition-[transform,color] group-hover:translate-x-0.5 group-hover:text-ink-hi" aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}

function FoundationWidget() {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle icon={Database}>Data foundation</CardTitle>
        <CardDescription>Every headline figure is reproduced from source.</CardDescription>
      </CardHeader>
      <CardContent className="flex items-center gap-5">
        <RadialMeter value={VALIDATION.passed} max={VALIDATION.total} size={112} color={VALIDATION.passed === VALIDATION.total ? STATUS_HEX.ok : STATUS_HEX.warn}
          label={<>{VALIDATION.passed}<span className="text-[13px] text-ink-3">/{VALIDATION.total}</span></>} sub="checks pass" />
        <div className="min-w-0 flex-1 space-y-3">
          <p className="text-[13px] leading-snug text-ink-2">Every headline figure here is reproduced from the source files by an automated check before a snapshot is published.</p>
          <Button size="sm" onClick={() => go("foundation")}>Open data foundation <ArrowRight /></Button>
        </div>
      </CardContent>
    </Card>
  );
}

function CoveragePanel() {
  const rows: [string, string, "ok" | "warn" | "danger", string, number][] = [
    ["Incident register", "380 records · 12 plants · 2024–2026", "ok", "Not a log of status changes, not an asset inventory", 100],
    ["Condition monitoring", "5 assets × 26 weekly readings", "warn", "Five selected cases; not plant availability", 5 / 380 * 100],
    ["Production (hourly PI)", "5 series × 720 h, five different months", "warn", "Periods differ; never summed as plant output", 5 / 380 * 100],
    ["RCA packages", "5 of 380 incidents", "warn", "Others show 'Detailed RCA unavailable'", 5 / 380 * 100],
    ["Energy", "Motor current (A) only", "warn", "Current-based proxy; meter integration required", 0],
    ["Emissions", "Not available", "danger", "No emission factors or boundary in the dataset", 0],
  ];
  const color = { ok: STATUS_HEX.ok, warn: STATUS_HEX.warn, danger: STATUS_HEX.danger };
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle icon={Layers}>Data coverage</CardTitle>
        <CardDescription>Share of the 380 records each source covers.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-1 pt-3">
        {rows.map(([a, b, tone, c, pct]) => (
          <MeterRow key={a} label={<span className="flex items-center gap-2"><span className="size-1.5 rounded-full" style={{ background: color[tone] }} aria-hidden="true" />{a}</span>}
            value={Math.max(pct, tone === "danger" ? 0 : 1.2)} max={100} color={color[tone]} display={<span className="text-[11.5px] font-normal text-ink-3">{b}</span>} hint={c} />
        ))}
      </CardContent>
    </Card>
  );
}

const MOTOR_TAGS = ["PU-2101B", "KO-3201", "PM-4405B", "BL-5702"];
const BASELINES: [string, string, string][] = [
  ["last_value", "Last value held", "var(--series-1)"],
  ["repeat_24h", "Repeat last 24 h", "var(--series-2)"],
  ["repeat_168h", "Repeat last 168 h", "var(--series-3)"],
];

function EnergyPanel() {
  const [tag, setTag] = useState("PU-2101B");
  const open = useDrawer();
  const [volt, setVolt] = useState("");
  const [pf, setPf] = useState("");
  const [ef, setEf] = useState("");
  const h = SNAP.hourly.find((x) => x.tag_prefix === tag.replace("-", ""))!;
  const fc = h.forecast;
  const ctx = 72; // show the last 3 days of reference data before the cutoff
  const amp = h.series[fc.target];
  const start = fc.train_hours - ctx;
  const x = h.t.slice(start);
  const actual = amp.slice(start);
  const pad = (p: number[]) => Array<number | null>(ctx).fill(null).concat(p);
  const offIdx = h.run.slice(start).map((r, i) => (r === "OFF" ? i : -1)).filter((i) => i >= 0);
  const cf = FORECAST.energy[h.tag_prefix];
  const num = (v: string) => (v.trim() === "" || Number.isNaN(Number(v)) ? null : Number(v));
  const est = estimateEnergy(amp.slice(fc.train_hours), h.run.slice(fc.train_hours), { voltageV: num(volt), powerFactor: num(pf), efKgPerKwh: num(ef) });
  const bands = offIdx.length ? [{ from: offIdx[0], to: offIdx[offIdx.length - 1], label: "RUN_STATUS OFF (current still non-zero)" }] : [];
  const best = Math.min(...BASELINES.map(([k]) => fc.wape_pct[k]));
  return (
    <Card>
      <CardHeader action={
        <div className="seg" role="group" aria-label="Equipment">
          {MOTOR_TAGS.map((t) => <button key={t} type="button" aria-pressed={tag === t} onClick={() => setTag(t)} className="font-mono">{t}</button>)}
          <button type="button" disabled className="font-mono" title="HE-3301 is a heat exchanger whose PI file carries a 'MOTOR AMPERE' tag; excluded until the asset mapping is explained.">HE-3301</button>
        </div>
      }>
        <CardTitle icon={Zap}>Energy forecasting concept: current-based proxy, not metered kWh</CardTitle>
        <CardDescription>Input power needs voltage, current and power factor (P = √3·V·I·PF). Only current is in the dataset, so this forecasts motor current (A). Absolute energy mode: <b className="font-medium text-ink">meter integration required</b>.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,1fr)]">
        <div className="min-w-0">
          <LineChart title={`${tag} motor current forecast`} unit="A" height={250} x={x}
            series={[
              { name: "Actual current", color: "var(--ink)", values: actual, width: 1.6 },
              ...BASELINES.map(([k, label, color]) => ({ name: label, color, values: pad(fc.predictions[k]), dash: "5 3", width: 1.6 })),
              ...(cf ? [{ name: "Chronos-2 P50 (plant-rate covariate)", color: "var(--series-4)", values: pad(cf.p50), width: 1.6 }] : []),
            ]}
            marks={[{ i: ctx - 1, label: "cutoff", color: "var(--accent)" }]}
            bands={bands}
            xTick={(l, i) => (i % 48 === 0 ? l.slice(5, 10) : null)} />
          <p className="mt-2 text-[12px] text-ink-3">
            Reference: first {fc.train_hours} h of the file. Test: last {fc.test_hours} h from {fc.test_start.slice(0, 16)}. Baselines use only data before the cutoff and no future run status.
          </p>
        </div>
        <div className="space-y-4">
          <div className="space-y-1">
            <div className="flex items-baseline justify-between px-2 text-[11.5px] text-ink-3"><span>Baseline (no tuning)</span><span>WAPE · MAE (A)</span></div>
            {BASELINES.map(([k, label], i) => (
              <MeterRow key={k} label={<span className="flex items-center gap-2"><span className="w-3 border-t-2 border-dashed" style={{ borderColor: ["var(--accent)", "var(--series-2)", "var(--series-3)"][i] }} aria-hidden="true" />{label}{fc.wape_pct[k] === best && <Badge tone="ok">lowest</Badge>}</span>}
                value={fc.wape_pct[k]} max={Math.max(...BASELINES.map(([b]) => fc.wape_pct[b]), cf?.wape_pct ?? 0)} color={["var(--accent)", "var(--series-2)", "var(--series-3)"][i]}
                display={<>{fc.wape_pct[k].toFixed(2)}% <span className="font-normal text-ink-3">· {fc.mae_A[k].toFixed(2)}</span></>} />
            ))}
            {cf && <MeterRow label={<span className="flex items-center gap-2"><span className="h-[3px] w-3 rounded-full bg-[var(--series-4)]" aria-hidden="true" />Chronos-2 (zero-shot)</span>}
              value={cf.wape_pct} max={Math.max(...BASELINES.map(([b]) => fc.wape_pct[b]), cf.wape_pct)} color="var(--series-4)" display={<>{cf.wape_pct.toFixed(2)}% <span className="font-normal text-ink-3">· n/a</span></>} />}
          </div>
          {fc.test_off_hours > 0
            ? <Note tone="warn">The test window includes {fc.test_off_hours} h with run status OFF. Error rises sharply when shutdowns fall in the window.</Note>
            : <Note>No OFF hours in this test window.</Note>}
          <Note>These are development diagnostics on one supplied series. They are not evidence of energy accuracy, and the best baseline differs by equipment. A model would be chosen on a validation window before a final test.</Note>
          <div className="rounded-xl border border-line bg-fg/[0.02] p-3.5">
            <b className="text-[13px] font-medium text-ink-hi">Estimate energy and emissions</b>
            <div className="mt-2.5 grid grid-cols-3 gap-2">
              <label className="field"><span>Voltage (V)</span><input className="input" type="number" min="0" value={volt} onChange={(e) => setVolt(e.target.value)} /></label>
              <label className="field"><span>Power factor</span><input className="input" type="number" min="0" max="1" step="0.01" value={pf} onChange={(e) => setPf(e.target.value)} /></label>
              <label className="field"><span>kg CO₂/kWh</span><input className="input" type="number" min="0" step="0.001" value={ef} onChange={(e) => setEf(e.target.value)} /></label>
            </div>
            <p className="mt-2 text-[11.5px] text-ink-3">Use the approved grid factor (e.g. the latest ESDM/Gatrik factor for the Jawa–Madura–Bali grid). PlantPulse does not pre-fill it.</p>
            {est.kwh !== null
              ? <p className="mt-2 text-[13px] text-ink-2"><b className="text-[18px] font-semibold text-ink-hi">{est.kwh.toFixed(0)} kWh</b>{est.tco2 !== null && <> · <b className="text-[18px] font-semibold text-ink-hi">{est.tco2.toFixed(2)} t CO₂</b></>} over the {fc.test_hours} h test window (running hours only). Estimate from company inputs, not metered.</p>
              : <p className="mt-2 text-[12.5px] text-ink-3">Enter voltage and power factor to see an estimate for the test window. Metered kWh still needs meter integration.</p>}
          </div>
          <Button size="sm" onClick={() => open({ kind: "source", id: h.source, loc: `Sheet2 · ${fc.target}, RUN_STATUS` })}>Source {h.source} · {h.off_with_nonzero_amp}/{h.off_rows} OFF rows carry current</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function AssetBoard() {
  const kpi = (e: (typeof SNAP.equipment)[number], prefix: string) => e.summary.find((s) => s.kpi.startsWith(prefix))?.value as number;
  return (
    <Card>
      <CardHeader>
        <CardTitle icon={GaugeIcon}>Monitored assets: production, downtime and condition</CardTitle>
        <CardDescription>Five monitored assets, each over its own 26-week window.</CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto pt-3">
        <table className="table min-w-[860px]">
          <thead><tr><th>Asset</th><th>Last reading</th><th>Availability</th><th className="r">MTBF</th><th className="r">MTTR</th><th>PM compliance</th><th className="r">Production loss</th><th className="r">Recorded loss</th><th /></tr></thead>
          <tbody>
            {SNAP.equipment.map((e) => {
              const last = e.history[e.history.length - 1];
              const avail = kpi(e, "Availability"), pm = kpi(e, "PM Compliance");
              return (
                <tr key={e.tag}>
                  <td><span className="font-mono font-semibold text-ink-hi">{e.tag}</span><div className="tiny muted">{e.type} · {e.plant_unit}</div></td>
                  <td><Badge tone={last.status === "NORMAL" ? "ok" : last.status === "TRIP" ? "danger" : "warn"} dot>{last.status}</Badge><div className="tiny muted mt-1">{fmtDate(last.date)} · {Math.round((Date.parse(REVIEW_DATE) - Date.parse(last.date)) / 86400000)} d old</div></td>
                  <td className="min-w-[130px]"><InlineMeter value={avail} suffix="%" digits={2} color={STATUS_HEX.accent} /></td>
                  <td className="r num">{kpi(e, "MTBF").toLocaleString("en-US")} h</td>
                  <td className="r num">{kpi(e, "MTTR")} h</td>
                  <td className="min-w-[120px]"><InlineMeter value={pm} suffix="%" color={pm >= 90 ? STATUS_HEX.ok : STATUS_HEX.warn} /></td>
                  <td className="r num">{kpi(e, "Production Loss").toLocaleString("en-US")} t</td>
                  <td className="r num">{usd(kpi(e, "Estimated Loss") * 1000)}</td>
                  <td><Button size="sm" variant="ghost" onClick={() => go("queue", e.tag)}>Evidence <ArrowRight /></Button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="mt-3 flex items-start gap-2 text-[12px] text-ink-3"><ShieldAlert className="mt-px size-3.5 shrink-0" aria-hidden="true" />Source: Performance Summary and Condition History sheets (E1–E5). One failure per asset per window, so MTBF equals the window length; it is not a fleet reliability estimate.</p>
        <Legend className="mt-2" items={[{ label: "Availability (recorded)", color: STATUS_HEX.accent, swatch: "bar" }, { label: "PM compliance ≥ 90%", color: STATUS_HEX.ok, swatch: "bar" }, { label: "below 90%", color: STATUS_HEX.warn, swatch: "bar" }]} />
      </CardContent>
    </Card>
  );
}

function InlineMeter({ value, suffix = "", digits = 0, color }: { value: number; suffix?: string; digits?: number; color: string }) {
  return (
    <div className="tw flex items-center gap-2">
      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-fg/[0.07]"><span className="block h-full rounded-full" style={{ width: `${Math.min(100, value)}%`, background: color }} /></span>
      <span className="w-[52px] text-right font-medium tabular-nums text-ink-hi">{value.toFixed(digits)}{suffix}</span>
    </div>
  );
}
