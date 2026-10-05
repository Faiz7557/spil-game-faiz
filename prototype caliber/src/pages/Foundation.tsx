import { useMemo, useState, type ReactNode } from "react";
import { BookOpen, Boxes, ChevronRight, CircleCheck, CircleX, Database, LayoutDashboard, ListChecks, ShieldCheck, TriangleAlert, Workflow } from "lucide-react";
import { SNAP, VALIDATION } from "../domain/data";
import { useDrawer } from "../components/ui";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShareBar, StatTile } from "@/components/ui/stat-tile";
import { Badge } from "@/components/ui/badge";
import { SectionTabs, openSectionTab } from "@/components/ui/section-tabs";
import { MeterRow, STATUS_HEX } from "@/components/ui/chart";


const SOURCES = [
  { id: "L3", name: "Incident Database", detail: "380 rows · 12 plants · 23 fields", ids: ["L3"] },
  { id: "E", name: "Equipment Performance", detail: "5 assets × 26 weekly readings, limits, KPIs", ids: ["E1", "E2", "E3", "E4", "E5"] },
  { id: "P", name: "Production Data (PI)", detail: "5 × 720 hourly rows · rate, current, run status", ids: ["P1", "P2", "P3", "P4", "P5"] },
  { id: "R", name: "RCA / Downtime decks", detail: "5 × 11 slides · chronology, 4P/4M, CAPA", ids: ["R1", "R2", "R3", "R4", "R5"] },
];
const GATES: [string, string][] = [
  ["Identity", "source + serial key; AR 'n/a' never joins"],
  ["Unit", "unit is part of the parameter identity"],
  ["Time", "observed, available, ingested, review kept apart"],
  ["Financial", "k US$ converted once; actual ≠ potential"],
  ["Status", "source, CAPA and simulation status separate"],
  ["Conflict", "shown and owned, never voted away"],
];
const ENTITIES = ["Asset (plant + tag)", "Incident", "Observation (value, unit, time)", "Threshold (value, version, effective date)", "Evidence (observed / documented / proposed / simulated)", "Action + verification rule", "Review event (append-only)"];
const VIEWS = [
  { name: "Executive overview", kq: "KQ2", who: "Management" },
  { name: "Problem Tank", kq: "KQ3", who: "Reliability, Operations" },
  { name: "Investigation", kq: "KQ3", who: "Reliability engineer" },
  { name: "Actions & Verification", kq: "KQ3", who: "Planner, discipline owner" },
];

const RATIONALIZATION = [
  ["Management", "Monthly loss and status reports", "Executive overview", "Loss definitions (actual vs potential), period, scope, status"],
  ["Operations / Production", "PI trends, shift reports", "Evidence (hourly PI)", "Asset context, unit, timestamp, run status"],
  ["Reliability / Maintenance", "Incident register, RCA decks, CAPA trackers", "Problem Tank → Investigation → Actions", "One issue ID, evidence links, owner, verification rule"],
  ["Energy", "Meter and utility reports", "Energy panel", "Proxy vs metered energy clearly separated; meter boundary"],
  ["HSE", "Emission reports", "Coverage panel", "Shown as 'Not available' until factors and boundary exist"],
];

const KPIS: [string, string, string, string][] = [
  ["Recorded actual loss", "SUM(Act. Loss k US$) × 1,000", "L3", "Management"],
  ["Recorded potential loss", "SUM(Pot. Loss k US$) × 1,000 — source estimate", "L3", "Management"],
  ["Open-status records", "COUNT(status ∈ 4 open statuses)", "L3", "Reliability"],
  ["RCA due-date review", "open AND RCA due < review date", "L3", "Reliability"],
  ["Action plan-date review", "source action not Closed AND plan date < review date", "R1–R5", "Planner"],
  ["Availability (per asset)", "(period h − downtime h) / period h", "E1–E5", "Operations"],
  ["MTBF / MTTR (per asset)", "period h / failures · downtime / failures", "E1–E5", "Reliability"],
  ["Verified completion", "actions with rule-matching evidence + reviewer approval", "PlantPulse", "Reliability"],
  ["Current-based demand proxy", "motor current A vs training median; not kWh", "P1–P5", "Energy"],
];

const ADDITIONAL: [string, string][] = [
  ["Master asset list + criticality", "Prioritise and roll out fixes across the fleet; the register is not an inventory"],
  ["Work order / action event log", "Real acknowledgement, execution and verification times"],
  ["Approved SOP and threshold versions", "Read historical alarms against the limit in force at the time"],
  ["Energy meters (kW/kWh) and boundaries", "Absolute energy forecast and specific energy consumption"],
  ["Approved emission factors", "Traceable emission estimates for HSE"],
];

const SOURCE_COUNT = SOURCES.reduce((s, x) => s + x.ids.length, 0);
/** "R1–R5" → "R1" so the chip opens the first file of the family; "PlantPulse" is computed in-app and has no file. */
const firstSourceId = (s: string) => (/^[A-Z]\d/.test(s) ? s.split("–")[0] : null);

function MapColumn({ step, title, children }: { step: number; title: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex items-center gap-2 pb-1 text-[12.5px] font-medium text-ink-2">
        <span className="grid size-5 place-items-center rounded-full border border-line-strong text-[11px] tabular-nums text-ink-3">{step}</span>
        {title}
      </div>
      {children}
    </div>
  );
}
function Flow() {
  return (
    <div className="hidden items-center justify-center text-ink-4 xl:flex" aria-hidden="true">
      <ChevronRight className="size-4" />
    </div>
  );
}

export default function Foundation() {
  const open = useDrawer();
  const allPass = VALIDATION.passed === VALIDATION.total;
  return (
    <>
      <PageHeader title="Data foundation" badges={<Badge tone="accent">KQ1</Badge>}
        description="Every number traces back through this map to a file, sheet and row." />

      <div className="tw grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile accent="var(--series-1)" label="Source files" icon={Database} value={SOURCE_COUNT} context={`${SOURCES.length} source families, each fingerprinted`}
          onClick={() => open({ kind: "source", id: "L3" })} />
        <StatTile label="Reproduction checks" icon={ListChecks} tone={allPass ? "ok" : "danger"}
          value={<>{VALIDATION.passed}<span className="text-[18px] font-medium text-ink-3"> / {VALIDATION.total}</span></>}
          context={allPass ? "All pass against the design audit" : `${VALIDATION.total - VALIDATION.passed} fail against the design audit`}
          visual={<ShareBar value={VALIDATION.passed} max={VALIDATION.total} color={allPass ? "var(--ok)" : "var(--danger)"} label={`${VALIDATION.passed} of ${VALIDATION.total} checks pass`} />}
          onClick={() => openSectionTab("checks")} />
        <StatTile accent="var(--series-2)" label="Quality gates" icon={ShieldCheck} value={GATES.length} context="A failed gate creates a verification task" />
        <StatTile accent="var(--series-3)" label="KPI definitions" icon={BookOpen} value={KPIS.length} context="One definition per KPI, shared by every function" onClick={() => openSectionTab("kpis")} />
      </div>

      <SectionTabs label="Foundation sections" className="mt-6" tabs={[
        { id: "map", label: "Data path", icon: Workflow, render: () => (
      <Card>
        <CardHeader>
          <CardTitle icon={Workflow}>Data source map</CardTitle>
          <CardDescription>A failed gate creates a task; nothing is silently dropped.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_16px_minmax(0,1fr)_16px_minmax(0,1fr)_16px_minmax(0,1fr)] xl:gap-2">
          <MapColumn step={1} title="Sources">
            {SOURCES.map((s) => (
              <button key={s.id} type="button" onClick={() => open({ kind: "source", id: s.ids[0] })}
                className="group rounded-lg border border-line bg-fg/[0.025] px-3 py-2.5 text-left transition-colors duration-150 hover:border-line-hot hover:bg-accent-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <div className="text-[13px] font-medium text-ink group-hover:text-ink-hi">{s.name}</div>
                <div className="mt-0.5 text-[11.5px] leading-snug text-ink-3">{s.detail}</div>
                <div className="mt-2 flex flex-wrap gap-1">{s.ids.map((i) => <span key={i} className="cite">{i}</span>)}</div>
              </button>
            ))}
          </MapColumn>
          <Flow />
          <MapColumn step={2} title="Quality gates">
            {GATES.map(([g, t]) => (
              <div key={g} className="flex items-start gap-2 rounded-lg border border-line bg-fg/[0.02] px-3 py-2">
                <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-ink-3" aria-hidden="true" />
                <div className="text-[12.5px] leading-snug text-ink-2"><span className="font-medium text-ink">{g}</span> — {t}</div>
              </div>
            ))}
          </MapColumn>
          <Flow />
          <MapColumn step={3} title="Governed entities">
            {ENTITIES.map((e) => (
              <div key={e} className="flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-[12.5px] leading-snug text-ink-2">
                <Boxes className="size-3.5 shrink-0 text-ink-3" aria-hidden="true" />{e}
              </div>
            ))}
          </MapColumn>
          <Flow />
          <MapColumn step={4} title="Views">
            {VIEWS.map((v) => (
              <div key={v.name} className="rounded-lg border border-line-strong bg-fg/[0.035] px-3 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-[13px] font-medium text-ink"><LayoutDashboard className="size-3.5 text-ink-3" aria-hidden="true" />{v.name}</span>
                  <Badge tone="accent">{v.kq}</Badge>
                </div>
                <div className="mt-1 text-[11.5px] text-ink-3">{v.who}</div>
              </div>
            ))}
          </MapColumn>
        </CardContent>
      </Card>

        ) },
        { id: "kpis", label: "KPI dictionary", icon: BookOpen, badge: KPIS.length, render: () => (
          <Card>
            <CardHeader>
              <CardTitle icon={BookOpen}>KPI dictionary</CardTitle>
              <CardDescription>One definition per KPI, shared by every function.</CardDescription>
            </CardHeader>
            <CardContent className="pt-3">
              <ul className="divide-y divide-line">
                {KPIS.map(([name, formula, src, owner]) => {
                  const sid = firstSourceId(src);
                  return (
                    <li key={name} className="grid gap-x-4 gap-y-1.5 py-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_auto] md:items-center">
                      <div className="text-[13.5px] font-medium text-ink-hi">{name}</div>
                      <code className="block rounded-md border border-line bg-[rgb(var(--well-rgb)/0.45)] px-2.5 py-1.5 font-mono text-[12px] leading-snug text-ink-2">{formula}</code>
                      <div className="flex items-center gap-2 md:justify-end">
                        {sid ? <button type="button" className="cite" onClick={() => open({ kind: "source", id: sid })}>{src}</button>
                          : <Badge>{src}</Badge>}
                        <span className="text-[12px] text-ink-3">{owner}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        ) },

        { id: "checks", label: "Reproduction checks", icon: ListChecks, badge: `${VALIDATION.passed}/${VALIDATION.total}`, render: () => <ReproductionChecks /> },
        { id: "quality", label: "Data quality", icon: TriangleAlert, render: () => <DataQuality /> },

        { id: "views", label: "Rationalization", icon: LayoutDashboard, render: () => (
          <Card>
            <CardHeader>
              <CardTitle icon={LayoutDashboard}>Dashboard rationalization</CardTitle>
              <CardDescription>Mapped from the needs named in the casebook.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto pt-2">
              <table className="table">
                <thead><tr><th>Function</th><th>Separate today</th><th>PlantPulse view</th><th>Standardised</th></tr></thead>
                <tbody>{RATIONALIZATION.map((r) => <tr key={r[0]}>{r.map((c, i) => <td key={i} className={i ? "small" : ""}>{i === 0 ? <b>{c}</b> : c}</td>)}</tr>)}</tbody>
              </table>
            </CardContent>
          </Card>
        ) },

        { id: "pilot", label: "Pilot requests", icon: Database, render: () => (
          <Card>
            <CardHeader>
              <CardTitle icon={Database}>Additional sources a pilot should request</CardTitle>
              <CardDescription>Each one unlocks a specific decision.</CardDescription>
            </CardHeader>
            <CardContent className="pt-3">
              <ul className="divide-y divide-line">
                {ADDITIONAL.map(([a, b]) => (
                  <li key={a} className="grid gap-1 py-3 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.4fr)] md:gap-4">
                    <span className="text-[13.5px] font-medium text-ink-hi">{a}</span>
                    <span className="text-[13px] leading-snug text-ink-2">{b}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ) },
      ]} />
    </>
  );
}

function ReproductionChecks() {
  const gates = useMemo(() => {
    const m = new Map<string, { pass: number; total: number }>();
    for (const c of VALIDATION.checks) {
      const g = m.get(c.gate) ?? { pass: 0, total: 0 };
      g.total++; if (c.pass) g.pass++;
      m.set(c.gate, g);
    }
    return [...m.entries()];
  }, []);
  const [gate, setGate] = useState<string | null>(null);
  const rows = gate ? VALIDATION.checks.filter((c) => c.gate === gate) : VALIDATION.checks;
  return (
    <div className="tw grid gap-4 xl:grid-cols-[minmax(260px,0.7fr)_minmax(0,1.6fr)]">
      <Card>
        <CardHeader action={<Badge tone={VALIDATION.passed === VALIDATION.total ? "ok" : "danger"} dot>{VALIDATION.passed} of {VALIDATION.total} pass</Badge>}>
          <CardTitle icon={ListChecks}>By gate</CardTitle>
          <CardDescription>Expected values come from the design audit.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-0.5 pt-3">
          {gates.map(([g, v]) => (
            <MeterRow key={g} label={g} value={v.pass} max={v.total} active={gate === g}
              color={v.pass === v.total ? STATUS_HEX.ok : STATUS_HEX.danger} display={`${v.pass} of ${v.total}`}
              onClick={() => setGate(gate === g ? null : g)} />
          ))}
          {gate && <button type="button" className="mt-2 self-start text-[12.5px] text-accent-ink hover:underline" onClick={() => setGate(null)}>Show all gates</button>}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle icon={ShieldCheck}>Reproduction checks{gate && <span className="font-normal text-ink-3"> · {gate}</span>}</CardTitle>
        </CardHeader>
        <CardContent className="pt-3">
          <div className="scroll-y" style={{ maxHeight: 440 }}>
            <table className="table">
              <thead><tr><th>ID</th><th>Check</th><th className="r">Result</th></tr></thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id}>
                    <td className="mono">{c.id}</td>
                    <td><span className="badge" style={{ marginRight: 6 }}>{c.gate}</span>{c.description}
                      <div className="tiny muted mono">{JSON.stringify(c.actual)}</div></td>
                    <td className="r">{c.pass
                      ? <Badge tone="ok"><CircleCheck aria-hidden="true" />pass</Badge>
                      : <Badge tone="danger"><CircleX aria-hidden="true" />fail</Badge>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DataQuality() {
  const findings: [string, string][] = [
    ["Identity", `${SNAP.meta.ar_placeholder_count} rows use AR 'n/a' and two AR numbers repeat. Incidents are keyed by source + serial; AR is an attribute, never a join key.`],
    ["Identity", "All 380 (plant, tag) pairs are distinct, so the register cannot show recurrence on the same asset."],
    ["Units", "KO-3201 weekly vibration is in micron; the hourly PI tag is labelled MM/S. The two are never overlaid or converted."],
    ["Threshold version", "KO-3201's RCA cites a 60 micron alert; Equipment Info lists 45 micron with no effective date."],
    ["RCA vs sensor", "KO-3201's RCA rates oil supply pressure 'normal, 1.8 barg'; the weekly record shows 1.078 barg in the trip week."],
    ["Time", "No file carries a publication time. Snapshot review is allowed; strict historical replay cannot treat these files as known at the time."],
    ["Run status", "All 85 hourly OFF rows still carry non-zero current. Values are kept as recorded and flagged."],
    ["Asset mapping", "HE-3301 (heat exchanger) has a 'MOTOR AMPERE' PI tag. Excluded from the motor-energy demo."],
  ];
  return (
    <Card>
      <CardHeader>
        <CardTitle icon={TriangleAlert}>Data quality found in the supplied files</CardTitle>
        <CardDescription>Each finding became a rule, a badge or a conflict record.</CardDescription>
      </CardHeader>
      <CardContent className="pt-3">
        <ul className="grid gap-2 md:grid-cols-2">
          {findings.map(([g, t]) => (

              <li key={t} className="flex flex-col gap-1.5 rounded-lg border border-line px-3.5 py-3">
                <Badge tone="warn" className="self-start"><TriangleAlert aria-hidden="true" />{g}</Badge>
                <p className="text-[13px] leading-relaxed text-ink-2">{t}</p>
              </li>

          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
