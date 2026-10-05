import { useMemo, useState } from "react";
import {
  Activity, ArrowRight, CircleAlert, Clock, Database, FileText, GitCompareArrows, Layers, ListChecks, ShieldAlert, Sparkles, TriangleAlert,
} from "lucide-react";
import analytics from "../data/analytics.json";
import { api } from "../lib/api";
import { LIVE } from "../lib/supabase";
import { errorText, useLoad } from "../lib/live";
import { cn } from "@/lib/utils";
import { plainName } from "../domain/names";
import { SectionTabs, openSectionTab } from "@/components/ui/section-tabs";
import { EMAP, REVIEW_DATE, SNAP, equipmentByTag, hourlyByTag, incidentById, rcaByTag } from "../domain/data";
import { fmtDate, usd } from "../domain/kpis";
import { actionDue, buildQueue, CATEGORIES, type ActionDue, type CategoryId, type QueueItem } from "../domain/queue";
import { coverageFor } from "../domain/coverage";
import { buildTank, type TankItem } from "../domain/tank";
import { DEMO_USER, nowIso, update, useDemo } from "../domain/store";
import type { Conflict, Equipment, Hourly } from "../domain/types";
import { go } from "../App";
import { Cite, Note, TypeBadge, useDrawer } from "../components/ui";
import { LineChart, type Band } from "../components/Charts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { ShareBar, StatTile } from "@/components/ui/stat-tile";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Donut, Legend, RadialMeter, STATUS_HEX, TrackColumns, type Slice } from "@/components/ui/chart";
import { TagChip } from "@/components/shell/Shell";
import { CAT_HEX, CAT_TONE, CoverageChecklist, CoverageSegments, Dot, Figure, RankKeys, SubHead, preRiskTone } from "./issues/kit";

const DUE_LABEL: Record<string, [string, string]> = {
  closed: ["Closed (source)", "b-ok"],
  plan_passed: ["Plan date passed — confirm status", "b-warn"],
  not_due: ["Not yet due", "b-info"],
  no_status_plan_passed: ["No status recorded · plan date passed", "b-danger"],
  no_status_not_due: ["No status recorded", "b-info"],
};
export const dueBadge = (d: string) => <span className={`badge ${DUE_LABEL[d][1]}`}>{DUE_LABEL[d][0]}</span>;

const DUE_HEX: Record<ActionDue, string> = {
  no_status_plan_passed: STATUS_HEX.danger, plan_passed: STATUS_HEX.warn, not_due: STATUS_HEX.info, no_status_not_due: STATUS_HEX.muted, closed: STATUS_HEX.ok,
};
const PRE_RISK = ["I", "II", "III", "IV"];
const catOf = (id: CategoryId) => CATEGORIES.find((c) => c.id === id)!;

export default function Issues({ tag }: { tag: string }) {
  const demo = useDemo();
  const open = useDrawer();
  const [sel, setSel] = useState<string | null>(null);
  const [cat, setCat] = useState<CategoryId | "all">("all");
  const [limit, setLimit] = useState(12);
  const [hoverStrip, setHoverStrip] = useState<TankItem | null>(null);
  const pending = new Set(demo.actions.filter((a) => a.state === "ready_for_verification").map((a) => a.caseTag));
  const unresolved = EMAP.conflicts.filter((c) => (demo.conflictDecisions[c.id]?.state ?? c.state) === "unresolved").length;
  const queue = buildQueue(SNAP.equipment, SNAP.rca, SNAP.incidents, REVIEW_DATE, pending, { "KO-3201": unresolved });
  const tank = useMemo(() => buildTank(SNAP.incidents, SNAP.meta.open_statuses, REVIEW_DATE, new Set(SNAP.equipment.map((e) => e.linked_incident!))), []);
  const coverage = useMemo(() => new Map(tank.map((t) => [t.incident.id, coverageFor(t.incident, SNAP)])), [tank]);
  const longTail = tank.filter((t) => !t.detailed && (cat === "all" || t.category === cat));
  const selected = sel ? tank.find((t) => t.incident.id === sel) : null;
  const duePassed = tank.filter((t) => t.rcaDuePassed).length;
  const catSlices: Slice[] = CATEGORIES.map((c) => ({ key: c.id, label: c.label, value: tank.filter((t) => t.category === c.id).length, color: CAT_HEX[c.id] }));
  const preRisk = PRE_RISK.map((r) => ({ key: r, value: tank.filter((t) => t.incident.pre_risk === r).length, color: STATUS_HEX[preRiskTone(r) === "danger" ? "danger" : "info"], note: r === "I" || r === "II" ? "Higher register Pre-Risk" : "Lower register Pre-Risk" }));
  const pickCase = (t: string) => { setSel(null); go("queue", t, { view: "evidence" }); openSectionTab("evidence", "view"); };
  const pickTank = (t: TankItem) => (t.detailed ? pickCase(t.incident.tag) : (setSel(t.incident.id), openSectionTab("evidence", "view")));
  const pickCat = (c: CategoryId | "all") => { setCat(c); setLimit(12); };
  const define = (title: string, how: string, note: string) => open({
    kind: "info", title,
    body: <div className="stack"><dl className="kv"><dt>How it is counted</dt><dd>{how}</dd><dt>Source</dt><dd><button className="cite" onClick={() => open({ kind: "source", id: "L3", loc: "Incident Database" })}>L3</button> Incident Database, status as recorded in the snapshot</dd></dl><Note>{note}</Note></div>,
  });

  return (
    <div className="tw">
      <PageHeader
        title="Problem Tank"
        badges={<Badge tone="accent">KQ3</Badge>}
        description={<>All {tank.length} open records, ranked by lifecycle, Pre-Risk, class and RCA due date. Recorded values only, no invented risk score.</>}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile accent="var(--series-1)" label="Open-status records" value={tank.length} icon={Layers} context="In the tank, ranked · recorded status"
          visual={<CategoryBar slices={catSlices} />}
          onClick={() => define("Open-status records", `Register records whose status is one of: ${SNAP.meta.open_statuses.join(", ")}.`, "The status is the register's own value at snapshot time. There is no change log, so it may have moved since.")} />
        <StatTile accent="var(--series-2)" label="Full evidence packages" value={<>{queue.length}<span className="text-[15px] font-medium text-ink-3"> / {tank.length}</span></>} icon={Database}
          context="Condition history, hourly PI and RCA deck"
          visual={<ShareBar value={queue.length} max={tank.length} label={`${queue.length} of ${tank.length} open records carry a full evidence package`} />}
          onClick={() => define("Full evidence packages", "Open records linked to an asset with weekly condition history, an hourly PI file and an RCA deck in the bundle.", "The rest of the tank carries register metadata only; no cause or CAPA is assumed for those.")} />
        <StatTile label="RCA due date passed" value={duePassed} tone={duePassed ? "danger" : undefined} icon={Clock}
          context={`Open records with RCA due before ${fmtDate(REVIEW_DATE)}`}
          onClick={() => define("RCA due date passed", `Open-status records whose recorded RCA due date is earlier than the review date ${fmtDate(REVIEW_DATE)}.`, "A passed date means the status needs confirming with the PIC, not that the RCA is late: the snapshot cannot tell.")} />
        <StatTile label="Unresolved source conflicts" value={unresolved} tone={unresolved ? "warn" : undefined} icon={GitCompareArrows}
          context="KO-3201 curated review · owner decides, not AI"
          onClick={() => define("Unresolved source conflicts", "Curated conflicts for KO-3201 still marked unresolved, including any decisions recorded in this demo session.", "The curated conflict review exists only for KO-3201 in this prototype. Other cases make no \"no conflicts\" claim.")} />
      </div>

      <Card className="mt-4">
        <CardHeader action={cat !== "all" ? <Button size="sm" variant="ghost" onClick={() => pickCat("all")}>Clear filter</Button> : undefined}>
          <CardTitle icon={Activity}>How the tank is made up</CardTitle>
          <CardDescription>Pick a slice to filter the tank.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-center">
          <div className="flex flex-wrap items-center gap-4">
            <Donut data={catSlices} size={148} thickness={15} center={{ value: tank.length, label: "open records" }} onPick={(k) => pickCat(k as CategoryId)} activeKey={cat === "all" ? undefined : cat} />
            <ul className="flex flex-col gap-1 text-[12.5px]">
              {catSlices.filter((s) => s.value).map((s) => (
                <li key={s.key}><button className={cn("flex items-center gap-2 rounded-md px-1.5 py-0.5 text-ink-2 hover:bg-fg/[0.04] hover:text-ink", cat === s.key && "bg-accent-soft text-ink-hi")} onClick={() => pickCat(s.key as CategoryId)}>
                  <span className="size-2 rounded-full" style={{ background: s.color }} aria-hidden="true" />{s.label}<span className="tabular-nums text-ink-3">{s.value}</span></button></li>
              ))}
            </ul>
          </div>
          <div>
            <div className="mb-1 flex items-baseline justify-between text-[12.5px]"><span className="font-medium text-ink-2">Register Pre-Risk</span><span className="text-ink-3">records</span></div>
            <TrackColumns data={preRisk} height={150} unit="records" xLabel={(k) => `Pre-Risk ${k}`} />
          </div>
          <div className="min-w-0 lg:col-span-2">
            <div className="mb-2 flex items-baseline justify-between text-[12.5px]"><span className="font-medium text-ink-2">Priority strip · rank 1 to {tank.length}</span><span className="text-ink-3">left = review first</span></div>
            <div className="flex h-10 gap-px overflow-hidden rounded-md" role="img" aria-label={`${tank.length} open records in rank order, coloured by lifecycle category`} onMouseLeave={() => setHoverStrip(null)}>
              {tank.map((t) => {
                const on = (selected ? selected.incident.id === t.incident.id : t.detailed && t.incident.tag === tag);
                return (
                  <button key={t.incident.id} tabIndex={-1} aria-hidden="true" onMouseEnter={() => setHoverStrip(t)} onClick={() => pickTank(t)}
                    className={cn("min-w-0 flex-1 rounded-[1px] transition-[opacity,transform] duration-150 hover:scale-y-110",
                      cat !== "all" && t.category !== cat && "opacity-25")}
                    style={{ backgroundColor: on ? "#fff" : CAT_HEX[t.category], backgroundImage: t.detailed || on ? undefined : "linear-gradient(rgb(var(--ground-rgb)/0.4),rgb(var(--ground-rgb)/0.4))" }} />
                );
              })}
            </div>
            <div className="mt-2 min-h-[36px] text-[12.5px] leading-snug">
              {hoverStrip ? (
                <><span className="font-mono text-ink-hi">#{tank.indexOf(hoverStrip) + 1} {hoverStrip.incident.tag}</span> <span className="text-ink-3">· {hoverStrip.incident.plant} · {catOf(hoverStrip.category).label} · Pre-Risk {hoverStrip.incident.pre_risk}{hoverStrip.detailed ? " · full evidence package" : ""}</span>
                  <div className="truncate text-ink-3">{hoverStrip.incident.title}</div></>
              ) : <span className="text-ink-3">Bright cells carry a full evidence package; dimmed cells are register metadata only; the white cell is the one open now. Click a cell to open it.</span>}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mt-6">
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <h2 className="text-[15px] font-semibold text-ink-hi">Full evidence packages</h2>
          <span className="text-[12.5px] text-ink-3">{queue.length} cases · pick one to open its evidence</span>
        </div>
        <div className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-2 xl:grid xl:grid-cols-5 xl:overflow-visible">
          {queue.map((q, n) => <CaseTag key={q.tag} q={q} rank={n + 1} pressed={!sel && q.tag === tag} onPick={() => pickCase(q.tag)} />)}
        </div>
      </div>

      <SectionTabs param="view" label="Problem Tank sections" className="mt-4" tabs={[
        { id: "evidence", label: `Evidence · ${selected ? selected.incident.tag : tag}`, icon: ShieldAlert, render: () => (selected
          ? <TankDetail item={selected} rank={tank.indexOf(selected) + 1} total={tank.length} onBack={() => setSel(null)} />
          : <CaseEvidence key={tag} tag={tag} item={queue.find((q) => q.tag === tag)} rank={queue.findIndex((q) => q.tag === tag) + 1} total={queue.length} />) },
        { id: "tank", label: "Rest of the tank", icon: Layers, badge: longTail.length, render: () => (
            <Card>
              <CardHeader action={<span className="text-[12px] text-ink-3">{longTail.length} records · metadata only</span>}>
                <CardTitle as="h3" icon={Layers}>Rest of the tank</CardTitle>
              </CardHeader>
              <CardContent className="pt-3">
                <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by lifecycle category">
                  <button className={cn("chip", cat === "all" && "on")} aria-pressed={cat === "all"} onClick={() => pickCat("all")}>All</button>
                  {CATEGORIES.map((c) => {
                    const n = tank.filter((t) => !t.detailed && t.category === c.id).length;
                    return n ? (
                      <button key={c.id} className={cn("chip", cat === c.id && "on")} aria-pressed={cat === c.id} title={c.hint} onClick={() => pickCat(c.id)}>
                        <Dot tone={CAT_TONE[c.id]} />{c.label}<span className="tabular-nums text-ink-3">{n}</span>
                      </button>
                    ) : null;
                  })}
                </div>
                <ul className="mt-3 flex flex-col gap-1">
                  {longTail.slice(0, limit).map((t) => {
                    const c = coverage.get(t.incident.id)!;
                    const on = sel === t.incident.id;
                    return (
                      <li key={t.incident.id}>
                        <button aria-pressed={on} onClick={() => { setSel(t.incident.id); openSectionTab("evidence", "view"); }}
                          className={cn("group grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-2.5 gap-y-1 rounded-lg border px-2.5 py-2 text-left transition-colors duration-150",
                            on ? "border-line-hot bg-accent-soft shadow-[0_0_0_1px_var(--line-hot)]" : "border-transparent hover:border-line hover:bg-fg/[0.035]")}>
                          <Dot tone={CAT_TONE[t.category]} className="mt-1.5" />
                          <span className="min-w-0">
                            <span className="flex items-baseline gap-2"><span className="font-mono text-[13px] font-medium text-ink-hi">{t.incident.tag}</span><span className="text-[12px] text-ink-3">{t.incident.plant} · #{tank.indexOf(t) + 1}</span></span>
                            <span className="mt-0.5 block truncate text-[12.5px] text-ink-2 group-hover:text-ink">{t.incident.title}</span>
                            <span className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11.5px] text-ink-3">
                              <span>{catOf(t.category).label}</span>
                              {t.daysPastDue !== null && <span className="text-danger-ink">RCA due passed {t.daysPastDue} d</span>}
                              <span className="inline-flex items-center gap-1.5"><CoverageSegments c={c} />coverage {Math.round(c.score * 100)}%</span>
                              {c.dqFlag && <span className="inline-flex items-center gap-1 text-caution-ink"><TriangleAlert className="size-3" aria-hidden="true" />data question</span>}
                            </span>
                          </span>
                          <Badge tone={preRiskTone(t.incident.pre_risk)}>Pre-Risk {t.incident.pre_risk}</Badge>
                        </button>
                      </li>
                    );
                  })}
                </ul>
                {longTail.length === 0 && <p className="py-6 text-center text-[13px] text-ink-3">No metadata-only records in this category. Pick another category or All.</p>}
                {longTail.length > limit && <Button size="sm" className="mt-3 w-full" onClick={() => setLimit(limit + 25)}>Show 25 more</Button>}
              </CardContent>
            </Card>
          ) },
        { id: "register", label: "Register", icon: Database, badge: SNAP.incidents.length, render: () => <Register /> },
      ]} />
    </div>
  );
}

/** Thin stacked bar of the category split, for the headline tile. */
function CategoryBar({ slices }: { slices: Slice[] }) {
  const total = slices.reduce((s, x) => s + x.value, 0) || 1;
  return (
    <div className="flex h-2 w-full gap-[2px] overflow-hidden rounded-full" aria-hidden="true">
      {slices.filter((s) => s.value).map((s) => <span key={s.key} style={{ width: `${(s.value / total) * 100}%`, background: s.color }} />)}
    </div>
  );
}

/** A full-evidence case rendered as the equipment tag: category band, punched grommet, tag number, why it ranks. */
function CaseTag({ q, rank, pressed, onPick }: { q: QueueItem; rank: number; pressed: boolean; onPick: () => void }) {
  const c = catOf(q.category);
  const late = q.passedCount + q.noStatusCount;
  const total = (rcaByTag(q.tag)?.actions.length ?? 0) + (rcaByTag(q.tag)?.preventive.length ?? 0);
  return (
    <button type="button" aria-pressed={pressed} onClick={onPick}
      className={cn("group relative flex min-w-[250px] snap-start flex-col overflow-hidden rounded-xl border p-4 text-left transition-[border-color,transform,box-shadow] duration-200 ease-out-soft xl:min-w-0",
        "[background:var(--glass),var(--panel)] shadow-[var(--shadow)] hover:-translate-y-0.5",
        pressed ? "border-line-hot shadow-[0_0_0_1px_var(--line-hot),var(--shadow)]" : "border-line hover:border-line-strong")}>
      <span className="absolute inset-x-0 top-0 h-[3px]" style={{ background: CAT_HEX[q.category] }} aria-hidden="true" />
      <span className="flex items-center justify-between gap-2 text-[11.5px]">
        <span className="flex items-center gap-1.5 font-medium text-ink-2"><span className="size-2 rounded-full" style={{ background: CAT_HEX[q.category] }} />{c.label}</span>
        <span className={cn("grid size-6 place-items-center rounded-full text-[11px] font-semibold tabular-nums", pressed ? "bg-accent text-white" : "bg-fg/[0.07] text-ink-2")}>{rank}</span>
      </span>
      <span className="mt-3 line-clamp-2 text-[15px] font-semibold leading-snug text-ink-hi">{plainName(q.tag)}</span>
      <span className="mt-1 text-[12px] text-ink-3"><span className="font-mono">{q.tag}</span> · {q.incident.plant} · {q.criticality}</span>
      <span className="mt-4 flex gap-0.5" aria-hidden="true">
        {Array.from({ length: Math.max(total, 1) }, (_, i) => <span key={i} className={cn("h-1.5 flex-1 rounded-full", i < late ? "bg-danger" : "bg-fg/10")} />)}
      </span>
      <span className="mt-1.5 flex items-center justify-between text-[12px]">
        {late > 0 ? <span className="font-medium text-danger-ink tabular-nums">{late} of {total} actions past plan</span> : <span className="text-ok-ink">All actions on plan</span>}
        {pressed && <span className="font-medium text-accent-ink">Viewing</span>}
      </span>
    </button>
  );
}

function TankDetail({ item, rank, total, onBack }: { item: TankItem; rank: number; total: number; onBack: () => void }) {
  const open = useDrawer();
  const i = item.incident;
  const c = coverageFor(i, SNAP);
  const [next, ...rest] = item.guidance;
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader action={<>
          <Button size="sm" onClick={() => open({ kind: "incident", id: i.id })}><FileText className="size-3.5" aria-hidden="true" /> Register row {i.src.row}</Button>
          <Button size="sm" variant="ghost" onClick={onBack}>Back to full-evidence case</Button>
        </>}>
          <div className="flex flex-wrap items-center gap-2"><TagChip tag={i.tag} size="md" /><span className="text-[13px] text-ink-3">{i.plant}</span>
            <Badge tone={CAT_TONE[item.category]} dot>{catOf(item.category).label}</Badge><Badge tone="neutral">Rank {rank} of {total}</Badge></div>
          <CardTitle className="mt-2">{i.title}</CardTitle>
          <CardDescription>Register metadata only. Detailed RCA unavailable; no cause or CAPA is assumed.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-3">
            <Figure label="Occurred (recorded)" value={fmtDate(i.occurred)} sub={`${i.downtime_h} h downtime`} />
            <Figure label="Recorded loss" value={<>{usd(i.actual_usd)} <span className="text-[12px] font-normal text-ink-3">actual</span></>} sub={`${usd(i.potential_usd)} potential (source estimate)`} />
            <Figure label="Register status" value={i.status} sub={<>RCA due {fmtDate(i.rca_due)} · PIC {i.pic_rca}</>} />
          </div>

          <SubHead right={<span className="text-[11.5px] text-ink-3">first key that differs decides the order</span>}>Why it ranks here</SubHead>
          <RankKeys keys={[
            { k: "Category", v: catOf(item.category).label, tone: CAT_TONE[item.category] },
            { k: "Pre-Risk", v: i.pre_risk, tone: preRiskTone(i.pre_risk) },
            { k: "Risk score", v: i.risk_score },
            { k: "Class", v: i.eq_class },
            { k: "RCA due", v: fmtDate(i.rca_due), tone: item.rcaDuePassed ? "danger" : undefined },
          ]} />
          <ul className="mt-3 flex flex-col gap-1 text-[13px] text-ink-2">
            {item.reasons.map((r) => <li key={r} className="flex gap-2"><span className="mt-[7px] size-1 shrink-0 rounded-full bg-ink-3" aria-hidden="true" />{r}</li>)}
          </ul>

          <SubHead>Next action</SubHead>
          {next && (
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-line-hot bg-accent-soft px-3 py-2.5">
              <ArrowRight className="size-4 shrink-0 text-accent-ink" aria-hidden="true" />
              <span className="min-w-0 flex-1 text-[13.5px] text-ink-hi">{next}</span>
              {item.rcaDuePassed && <Button size="sm" variant="primary" onClick={() => go("backlog", undefined, { inc: i.id })}><Sparkles className="size-3.5" aria-hidden="true" /> RCA starter</Button>}
            </div>
          )}
          {rest.length > 0 && (
            <ol className="mt-2 flex flex-col gap-1.5 text-[13px] text-ink-2">
              {rest.map((g, n) => <li key={g} className="flex gap-2.5"><span className="grid size-5 shrink-0 place-items-center rounded-full border border-line text-[11px] tabular-nums text-ink-3">{n + 2}</span>{g}</li>)}
            </ol>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle as="h3" icon={ListChecks}>Evidence coverage {Math.round(c.score * 100)}%</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <RadialMeter value={c.score * 100} max={100} size={104} color={c.score === 1 ? STATUS_HEX.ok : STATUS_HEX.warn} sub="of 4 items" />
          <div className="min-w-0 flex-1">
            <CoverageChecklist c={c} />
            <p className="mt-3 text-[13px] text-ink-2">Next request: <b className="text-ink-hi">{c.nextRequest}</b></p>
            {c.candidates.length > 0 && <p className="mt-2 text-[13px] text-ink-2">Candidate failure modes from the register alone (type + component, no sensor evidence): {c.candidates.map((id) => <span key={id} className="badge b-proposed" style={{ marginRight: 4 }}>{id}</span>)}</p>}
            {c.family === null && <p className="mt-2 text-[12.5px] text-ink-3">No failure-mode library for equipment type {i.eq_type} yet; PlantPulse does not suggest causes.</p>}
            {c.dqFlag && <div className="mt-3"><Note tone="warn">Data-quality question: {c.dqFlag}</Note></div>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CaseEvidence({ tag, item, rank, total }: { tag: string; item?: QueueItem; rank: number; total: number }) {
  const eq = equipmentByTag(tag)!;
  const inc = incidentById(eq.linked_incident!)!;
  const rca = rcaByTag(tag)!;
  const open = useDrawer();
  const last = eq.history[eq.history.length - 1];
  const stale = Math.round((Date.parse(REVIEW_DATE) - Date.parse(last.date)) / 86400000);
  const curated = EMAP.case === tag;
  const actions = [...rca.actions, ...rca.preventive];
  const dueCounts = (Object.keys(DUE_HEX) as ActionDue[]).map((d) => ({ key: d, label: DUE_LABEL[d][0], value: actions.filter((a) => actionDue(a, REVIEW_DATE) === d).length, color: DUE_HEX[d] }));
  const late = dueCounts.filter((d) => d.key === "plan_passed" || d.key === "no_status_plan_passed").reduce((s, d) => s + d.value, 0);
  const cov = coverageFor(inc, SNAP);
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader action={<>
          <Button size="sm" onClick={() => open({ kind: "incident", id: inc.id })}><FileText className="size-3.5" aria-hidden="true" /> Register row {inc.src.row}</Button>
          <Button size="sm" variant="primary" onClick={() => go("investigation", tag)}>Investigate <ArrowRight className="size-3.5" aria-hidden="true" /></Button>
        </>}>
          <div className="flex flex-wrap items-center gap-2">
            <TagChip tag={tag} size="md" />
            {item && <Badge tone={CAT_TONE[item.category]} dot pulse={item.category === "followup" || item.category === "operational"}>{catOf(item.category).label}</Badge>}
            {rank > 0 && <Badge tone="neutral">Rank {rank} of {total}</Badge>}
          </div>
          <CardTitle className="mt-2">{eq.name}</CardTitle>
          <CardDescription>{eq.type} · {eq.plant_unit} · Class {eq.eq_class} · criticality {eq.criticality} · {eq.monitoring}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-3">
            <Figure label="Incident (recorded)" value={fmtDate(inc.occurred)} sub={`${inc.impact} · ${inc.downtime_h} h downtime`} />
            <Figure label="Recorded loss" value={<>{usd(inc.actual_usd)} <span className="text-[12px] font-normal text-ink-3">actual</span></>} sub={`${usd(inc.potential_usd)} potential (source estimate)`} />
            <Figure label="Register status" value={inc.status} sub={<>RCA due {fmtDate(inc.rca_due)} · PIC {inc.pic_rca}</>} />
          </div>
          <div className="mt-3">
            <Note tone="warn" icon={<Clock className="size-4" aria-hidden="true" />}>Last condition reading: <b>{fmtDate(last.date)}</b>, {stale} days before the review date. It describes the asset then, not today. Staleness thresholds for operations are agreed with the data owner in a pilot.</Note>
          </div>

          {item && (
            <div className="mt-1 grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto]">
              <div className="min-w-0">
                <SubHead right={<span className="text-[11.5px] text-ink-3">first key that differs decides the order</span>}>Why it ranks here</SubHead>
                <RankKeys keys={[
                  { k: "Category", v: catOf(item.category).label, tone: CAT_TONE[item.category] },
                  { k: "Criticality", v: item.criticality ?? "unknown" },
                  { k: "Earliest passed plan", v: fmtDate(item.earliestPassed), tone: item.earliestPassed ? "warn" : undefined },
                  { k: "Incident ID", v: <span className="font-mono text-[12px]">{inc.id}</span> },
                ]} />
                <ul className="mt-3 flex flex-col gap-1 text-[13px] text-ink-2">
                  {item.reasons.map((r) => <li key={r} className="flex gap-2"><span className="mt-[7px] size-1 shrink-0 rounded-full bg-ink-3" aria-hidden="true" />{r}</li>)}
                </ul>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-[12.5px] text-ink-3">
                  <CoverageSegments c={cov} /> Evidence coverage {Math.round(cov.score * 100)}% · {cov.nextRequest}
                </div>
              </div>
              <div className="flex flex-col items-center gap-2 lg:pt-5">
                <Donut data={dueCounts} size={132} thickness={13} center={{ value: late, label: "source actions past plan" }} />
                <Legend className="max-w-[220px] justify-center gap-x-3 text-[11.5px]" items={dueCounts.filter((d) => d.value).map((d) => ({ label: `${d.label} · ${d.value}`, color: d.color, swatch: "dot" as const }))} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="condition">
        <TabsList aria-label="Case evidence">
          <TabsTrigger value="condition"><Activity aria-hidden="true" />Condition</TabsTrigger>
          <TabsTrigger value="hourly"><Clock aria-hidden="true" />Hourly PI</TabsTrigger>
          <TabsTrigger value="actions"><ListChecks aria-hidden="true" />Source actions{late > 0 && <span className="ml-0.5 rounded-full bg-caution-soft px-1.5 text-[11px] tabular-nums text-caution-ink">{late}</span>}</TabsTrigger>
          <TabsTrigger value="sources"><FileText aria-hidden="true" />Sources{curated && <> &amp; conflicts</>}</TabsTrigger>
        </TabsList>

        <TabsContent value="condition">
          <Card>
            <CardHeader action={<button className="cite" onClick={() => open({ kind: "source", id: eq.source, loc: "Condition History · rows 2–27" })}>{eq.source}</button>}>
              <CardTitle as="h3" icon={Activity}>Weekly condition history</CardTitle>
              <CardDescription>One chart per parameter, with its recorded limits.</CardDescription>
            </CardHeader>
            <CardContent>
              <WeeklyCharts eq={eq} />
              <div className="mt-3"><Note>Replay check: a 6-week linear trend first flagged on <b>{fmtDate(eq.linear_flag?.date)}</b> ({eq.linear_flag?.parameter}). The source's first ALARM label was <b>{fmtDate(eq.first_alarm)}</b>. The trend did not come earlier than the alarm in any of the five series, so no early-warning claim is made.</Note></div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hourly"><HourlyPanel tag={tag} /></TabsContent>

        <TabsContent value="actions">
          <Card>
            <CardHeader action={<button className="cite" onClick={() => open({ kind: "source", id: rca.source, loc: "slides 9–10" })}>{rca.source}</button>}>
              <CardTitle as="h3" icon={ListChecks}>Source actions (RCA)</CardTitle>
              <CardDescription>As recorded in the deck. Missing status is never shown as closed.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="table">
                  <thead><tr><th>Action</th><th>Type</th><th>PIC</th><th>Plan date</th><th>Source status</th><th>Due state on {fmtDate(REVIEW_DATE)}</th></tr></thead>
                  <tbody>
                    {actions.map((a) => (
                      <tr key={a.text}><td>{a.text}</td><td className="tiny">{a.kind}</td><td>{a.pic}</td><td className="num">{fmtDate(a.plan_date)}</td>
                        <td>{a.status ?? <span className="muted">not recorded</span>}</td><td>{dueBadge(actionDue(a, REVIEW_DATE))}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sources" className="flex flex-col gap-4">
          {LIVE ? <LiveConflicts tag={tag} /> : curated && <Conflicts />}
          <Card>
            <CardHeader><CardTitle as="h3" icon={FileText}>Source cards</CardTitle></CardHeader>
            <CardContent>
              {curated ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {EMAP.evidence.map((e) => (
                    <button key={e.id} onClick={() => open({ kind: "evidence", id: e.id })}
                      className="rounded-lg border border-line bg-fg/[0.02] p-3 text-left transition-colors duration-150 hover:border-line-strong hover:bg-fg/[0.045] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      <div className="flex items-center justify-between gap-2"><span className="font-mono text-[12px] text-ink-2">{e.id}</span><TypeBadge type={e.type} /></div>
                      <b className="mt-1.5 block text-[13.5px] font-medium text-ink-hi">{e.title}</b>
                      <span className="mt-0.5 block text-[12px] text-ink-3">{e.source} · {e.loc}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <Note tone="warn">The curated evidence register and conflict review exist only for KO-3201 in this prototype. For {tag}, the extracted sources are linked below, but no conflict review has been done, so no "no conflicts" claim is made.</Note>
                  <div className="flex flex-wrap gap-2">
                    {[inc.src.source, eq.source, hourlyByTag(tag)!.source, rca.source].map((s) => (
                      <Button key={s} size="sm" onClick={() => open({ kind: "source", id: s })}><FileText className="size-3.5" aria-hidden="true" /> {s} · {SNAP.sources[s].file_name}</Button>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export function WeeklyCharts({ eq, cutoff }: { eq: Equipment; cutoff?: string }) {
  const hist = cutoff ? eq.history.filter((h) => h.date <= cutoff) : eq.history;
  const x = hist.map((h) => h.date);
  const idx = (d: string | undefined) => x.indexOf(d ?? "");
  const marks = [
    { i: idx(eq.first_alarm), label: "1st ALARM label", color: "var(--caution)" },
    ...(cutoff ? [] : [{ i: idx(eq.trip_date), label: "TRIP", color: "var(--danger)" }]),
  ].filter((m) => m.i >= 0);
  return (
    <div className="grid g-2">
      {eq.params.map((p, j) => (
        <div key={p.name}>
          <div className="small" style={{ fontWeight: 600 }}>{p.name} <span className="muted">({p.unit})</span></div>
          <LineChart title={`${eq.tag} ${p.name}`} unit={p.unit} height={170} x={x}
            series={[{ name: p.name, color: "var(--series-1)", values: hist.map((h) => h.values[j]) }]}
            refs={[{ y: p.alarm, label: `alarm ${p.alarm}`, color: "var(--caution)" }, { y: p.trip, label: `trip ${p.trip}`, color: "var(--danger)" }]}
            marks={marks} fmt={(v) => (Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(2).replace(/\.?0+$/, ""))}
            xTick={(l, i) => (i % 5 === 0 ? l.slice(5) : null)} />
        </div>
      ))}
    </div>
  );
}

function HourlyPanel({ tag }: { tag: string }) {
  const h = hourlyByTag(tag)!;
  const open = useDrawer();
  const numeric = Object.keys(h.series);
  const [col, setCol] = useState(numeric.find((c) => c.endsWith("_VIB")) ?? numeric[0]);
  const meta = h.pi_tags.find((t) => t.name === col)!;
  const offIdx = h.run.map((r, i) => (r === "OFF" ? i : -1)).filter((i) => i >= 0);
  const anomalies = useAnomalies(h.tag_prefix);
  const at = (iso: string) => h.t.findIndex((t) => t.slice(0, 13) === iso.replace("T", " ").slice(0, 13));
  const bands: Band[] = [
    ...(offIdx.length ? [{ from: offIdx[0], to: offIdx[offIdx.length - 1], label: "OFF" }] : []),
    ...anomalies.events.map((e) => ({ from: Math.max(0, at(e.start_at)), to: Math.max(0, at(e.end_at)), label: "Anomaly", tone: "anomaly" as const })).filter((b) => b.to >= b.from),
  ];
  const offShare = h.run.length ? Math.round((offIdx.length / h.run.length) * 100) : 0;
  return (
    <Card>
      <CardHeader action={<>
        <select className="input" value={col} onChange={(e) => setCol(e.target.value)} aria-label="PI tag">
          {numeric.map((c) => <option key={c} value={c}>{h.pi_tags.find((t) => t.name === c)?.description ?? c}</option>)}
        </select>
        <button className="cite" onClick={() => open({ kind: "source", id: h.source, loc: `Sheet2 · ${col}` })}>{h.source}</button>
      </>}>
        <CardTitle as="h3" icon={Clock}>Hourly PI data</CardTitle>
        <CardDescription>{meta.description} · PI unit <b className="text-ink">{meta.unit}</b> · {h.t[0].slice(0, 10)} to {h.t[h.t.length - 1].slice(0, 10)}. Shown on its own axis; never overlaid on the weekly series.</CardDescription>
      </CardHeader>
      <CardContent>
        <RunStrip run={h.run} t={h.t} offShare={offShare} />
        <div className="mt-3">
          <LineChart title={`${tag} ${col}`} unit={meta.unit} height={190} x={h.t.map((t) => t.slice(0, 16))}
            series={[{ name: meta.description, color: "var(--series-1)", values: h.series[col], width: 1.3 }]} bands={bands}
            xTick={(l, i) => (i % 120 === 0 ? l.slice(5, 10) : null)} />
        </div>
        {tag === "KO-3201" && col.endsWith("_VIB") && (
          <div className="mt-3"><Note tone="warn" icon={<GitCompareArrows className="size-4" aria-hidden="true" />}>This series stays near 29 until 26 Apr while the weekly record reads 71.7 micron on 22 Apr. See <Cite id="CF-02" /> and <Cite id="CF-06" />.</Note></div>
        )}
        <AnomalyEvents tag={tag} h={h} state={anomalies} />
        {h.off_with_nonzero_amp > 0 && <p className="mt-2 text-[12px] text-ink-3">{h.off_with_nonzero_amp} of {h.off_rows} OFF hours still carry non-zero current. Kept as recorded.</p>}
      </CardContent>
    </Card>
  );
}

/** The recorded run status as a timeline strip: one cell per hour, RUNNING vs OFF. Recorded, not live. */
function RunStrip({ run, t, offShare }: { run: string[]; t: string[]; offShare: number }) {
  const segs: { state: string; from: number; to: number }[] = [];
  run.forEach((r, i) => { const s = segs[segs.length - 1]; if (s && s.state === r) s.to = i; else segs.push({ state: r, from: i, to: i }); });
  return (
    <div>
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2 text-[12px]">
        <span className="flex items-center gap-3 text-ink-2">
          <span className="font-medium">Recorded run status</span>
          <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-ok" aria-hidden="true" />ON (running)</span>
          <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-danger" aria-hidden="true" />OFF · {offShare}% of hours</span>
        </span>
        <span className="text-ink-3">from the file, not live</span>
      </div>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-fg/[0.06]" role="img" aria-label={`Run status over ${run.length} recorded hours, OFF ${offShare}% of hours`}>
        {segs.map((s) => (
          <span key={s.from} title={`${s.state} · ${t[s.from].slice(0, 16)} to ${t[s.to].slice(0, 16)}`}
            className={cn("h-full", s.state === "OFF" ? "bg-danger" : s.state === "ON" ? "bg-ok/70" : "bg-ink-4")}
            style={{ width: `${((s.to - s.from + 1) / run.length) * 100}%` }} />
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[11px] tabular-nums text-ink-3"><span>{t[0].slice(0, 10)}</span><span>{t[t.length - 1].slice(0, 10)}</span></div>
    </div>
  );
}

function ConflictStateBadge({ state, sim }: { state: string; sim?: boolean }) {
  if (state === "unresolved") return <span className="badge b-conflict">Unresolved</span>;
  if (state === "rule_applied") return <span className="badge b-info">Rule applied</span>;
  if (state === "resolved") return sim ? <span className="badge b-simulated">Resolved (simulation)</span> : <span className="badge b-ok">Resolved</span>;
  return null;
}

function Conflicts() {
  const demo = useDemo();
  const open = useDrawer();
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({ authority: "", reason: "" });
  const save = (c: Conflict, state: "resolved" | "unresolved") => {
    if (!form.reason.trim() || (state === "resolved" && !form.authority.trim())) return;
    update((s) => ({
      ...s,
      conflictDecisions: { ...s.conflictDecisions, [c.id]: { state, authority: form.authority, reason: form.reason, at: nowIso() } },
      events: [...s.events, { at: nowIso(), actor: DEMO_USER, subject: `${c.id} ${c.topic}`, decision: state === "resolved" ? `Resolved — authoritative: ${form.authority}` : "Kept unresolved", reason: form.reason }],
    }));
    setEditing(null); setForm({ authority: "", reason: "" });
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle as="h3" icon={GitCompareArrows}>Source conflicts</CardTitle>
        <CardDescription>An owner picks the authoritative source, or leaves it open.</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col gap-2">
          {EMAP.conflicts.map((c) => {
            const d = demo.conflictDecisions[c.id];
            const state: string = d?.state ?? c.state;
            return (
              <li key={c.id} className={cn("rounded-lg border px-3 py-2.5", state === "unresolved" ? "border-[rgb(var(--danger-rgb)/0.3)] bg-danger-soft/40" : "border-line bg-fg/[0.02]")}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">{state === "unresolved" && <CircleAlert className="size-4 shrink-0 text-danger" aria-hidden="true" />}<button className="cite" onClick={() => open({ kind: "evidence", id: c.id })}>{c.id}</button><b className="text-[13.5px] font-medium text-ink-hi">{c.topic}</b></div>
                  <div className="flex items-center gap-2">
                    <ConflictStateBadge state={state} sim />
                    {c.state !== "rule_applied" && <Button size="sm" variant="ghost" aria-expanded={editing === c.id} onClick={() => setEditing(editing === c.id ? null : c.id)}>Record decision</Button>}
                  </div>
                </div>
                <div className="mt-2 grid gap-2 text-[13px] text-ink-2 sm:grid-cols-2">
                  <div><Cite id={c.a.evidence} /> {c.a.says}</div>
                  <div><Cite id={c.b.evidence} /> {c.b.says}</div>
                </div>
                <p className="mt-1.5 text-[12px] text-ink-3">{c.note} Owner: {c.owner_role}.</p>
                {d && <p className="mt-1.5 text-[12px] text-ink-2"><span className="badge b-simulated">Simulation</span> {d.state === "resolved" ? `Authoritative: ${d.authority}. ` : ""}Reason: {d.reason}</p>}
                {editing === c.id && (
                  <div className="note sim" style={{ marginTop: 8, display: "block" }}>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <label className="field"><span>Authoritative source and version</span><input className="input" value={form.authority} onChange={(e) => setForm({ ...form, authority: e.target.value })} placeholder="e.g. E2 Equipment Info, MOC-xxx effective date" /></label>
                      <label className="field"><span>Reason (required)</span><input className="input" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></label>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button size="sm" variant="primary" disabled={!form.reason.trim() || !form.authority.trim()} onClick={() => save(c, "resolved")}>Mark resolved</Button>
                      <Button size="sm" disabled={!form.reason.trim()} onClick={() => save(c, "unresolved")}>Keep unresolved</Button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

function Register() {
  const [q, setQ] = useState("");
  const [onlyOpen, setOnlyOpen] = useState(false);
  const [duePassed, setDuePassed] = useState(false);
  const [limit, setLimit] = useState(60);
  const open = useDrawer();
  const detailed = new Set(SNAP.equipment.map((e) => e.linked_incident));
  const rows = useMemo(() => SNAP.incidents.filter((r) => {
    const isOpen = SNAP.meta.open_statuses.includes(r.status);
    if (onlyOpen && !isOpen) return false;
    if (duePassed && !(isOpen && r.rca_due && r.rca_due < REVIEW_DATE)) return false;
    if (!q) return true;
    const s = q.toLowerCase();
    return [r.tag, r.plant, r.title, r.component, r.eq_type, r.ar_raw].some((v) => String(v).toLowerCase().includes(s));
  }), [q, onlyOpen, duePassed]);
  return (
    <Card>
      <CardHeader action={<span className="text-[12.5px] tabular-nums text-ink-3">{rows.length} of {SNAP.incidents.length} records</span>}>
        <CardTitle as="h3" icon={Database}>Incident register</CardTitle>
        <CardDescription>Click a row to open its record.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <input className="input" style={{ flex: "1 1 220px" }} placeholder="Search tag, plant, component, AR…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search the register" />
          <label className="chk"><input type="checkbox" checked={onlyOpen} onChange={(e) => setOnlyOpen(e.target.checked)} /> Open status only</label>
          <label className="chk"><input type="checkbox" checked={duePassed} onChange={(e) => setDuePassed(e.target.checked)} /> RCA due date passed</label>
        </div>
        <div className="mt-3"><Note>Records outside the five detailed cases show metadata only. They are not assumed to have a verified cause or CAPA.</Note></div>
        <div className="mt-3 max-h-[560px] overflow-auto rounded-lg border border-line">
          <table className="table">
            <thead><tr><th>Tag</th><th>Plant</th><th>Occurred</th><th>Title</th><th>Status</th><th>RCA due</th><th className="r">Actual</th><th className="r">Potential</th><th>RCA package</th></tr></thead>
            <tbody>
              {rows.slice(0, limit).map((r) => {
                const passed = SNAP.meta.open_statuses.includes(r.status) && r.rca_due && r.rca_due < REVIEW_DATE;
                return (
                  <tr key={r.id} className="cursor-pointer transition-colors hover:bg-fg/[0.035]" onClick={() => open({ kind: "incident", id: r.id })}>
                    <td><span className="font-mono text-[12.5px] font-medium text-ink-hi">{r.tag}</span><div className="tiny muted mono">{r.id}</div></td><td>{r.plant}</td><td className="num">{r.occurred}</td>
                    <td className="small">{r.title}</td><td className="tiny">{r.status}</td>
                    <td className="num small">{r.rca_due ?? "—"}{passed && <div><span className="badge b-warn">confirm status</span></div>}</td>
                    <td className="r num small">{usd(r.actual_usd)}</td><td className="r num small muted">{usd(r.potential_usd)}</td>
                    <td>{detailed.has(r.id) ? <span className="badge b-ok">Available</span> : <span className="tiny muted">Detailed RCA unavailable</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {rows.length === 0 && <p className="empty">No records match these filters. Clear the search or untick a filter.</p>}
        </div>
        {rows.length > limit && <Button size="sm" className="mt-3" onClick={() => setLimit(limit + 100)}>Show 100 more</Button>}
      </CardContent>
    </Card>
  );
}

interface AnomalyEvent { id: string | null; start_at: string; end_at: string; lead_hours: number | null; peak_score: number; contributors: { tag: string; z: number }[] }
interface Explanation { what_changed: string; possible_causes: { cause: string; check: string }[]; operations_note: string }

/** Live: events written by analytics/anomaly.py. Offline: the same detector's bundled run. */
function useAnomalies(prefix: string) {
  const live = useLoad(() => api<AnomalyEvent[]>(`/api/live?kind=anomalies&tag=${encodeURIComponent(prefix)}`), [prefix], LIVE);
  const bundled = ((analytics.anomalies as Record<string, Omit<AnomalyEvent, "id">[]>)[prefix] ?? []).map((e) => ({ ...e, id: null }));
  return { events: LIVE ? live.data ?? [] : bundled, status: LIVE ? live.status : "ok", error: live.error };
}

function AnomalyEvents({ tag, h, state }: { tag: string; h: Hourly; state: ReturnType<typeof useAnomalies> }) {
  const [explained, setExplained] = useState<Record<string, Explanation>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const units = Object.fromEntries(h.pi_tags.map((t) => [t.name, t.unit]));
  const explain = async (id: string) => {
    setBusy(id); setErr("");
    try { const r = await api<Explanation>("/api/anomaly/explain", { body: { eventId: id } }); setExplained((x) => ({ ...x, [id]: r })); }
    catch (e) { setErr(errorText(e, "No explanation was produced.")); } finally { setBusy(null); }
  };
  if (state.status === "error") return <p className="mt-3 text-[12px] text-ink-3">Anomaly events could not be loaded: {state.error}</p>;
  if (!state.events.length) return (
    <p className="mt-3 text-[12px] text-ink-3">Multivariate anomaly score: no sustained abnormal window in this file{tag === "PM-4405B" ? ". The detector missed this shutdown; it is reported as a miss, not hidden." : "."}</p>
  );
  return (
    <div className="mt-3 flex flex-col gap-2">
      {state.events.map((e, k) => {
        const x = e.id ? explained[e.id] : undefined;
        return (
          <div key={e.id ?? k} className="anomaly">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <b className="flex items-center gap-2 text-[13.5px] font-medium text-ink-hi"><TriangleAlert className="size-4 text-caution" aria-hidden="true" />Abnormal from {e.start_at.replace("T", " ").slice(0, 16)}</b>
              <span className="badge b-warn">{e.lead_hours !== null ? `${e.lead_hours} h before the first OFF hour` : "No shutdown follows in this file"}</span>
            </div>
            <p className="mt-1.5 text-[12.5px] text-ink-2">
              Strongest contributors (robust z-score against the first running week): {e.contributors.slice(0, 3).map((c) => `${h.pi_tags.find((t) => t.name === c.tag)?.description ?? c.tag} ${c.z > 0 ? "+" : ""}${c.z}`).join(" · ")}.
              <span className="text-ink-3"> Peak score {e.peak_score}; flagged at 4.0 sustained 3 h.</span>
            </p>
            {x ? (
              <div className="mt-2 flex flex-col gap-2 text-[13px] text-ink-2">
                <p>{x.what_changed}</p>
                <ul className="list-plain">{x.possible_causes.map((c) => <li key={c.cause}><span className="badge b-proposed">Hypothesis</span> {c.cause} <span className="muted">Check: {c.check}</span></li>)}</ul>
                <p className="text-[12px] text-ink-3">{x.operations_note}</p>
              </div>
            ) : LIVE && e.id ? (
              <Button size="sm" variant="ai" className="mt-2" disabled={busy === e.id} onClick={() => explain(e.id!)}><Sparkles className="size-3.5" aria-hidden="true" /> {busy === e.id ? "Explaining…" : "Explain this window"}</Button>
            ) : null}
          </div>
        );
      })}
      {err && <Note tone="danger">{err}</Note>}
      <p className="text-[12px] text-ink-3">One shutdown per series: lead time is measured on this file, not a general detection claim. Units: {Object.entries(units).filter(([k]) => !k.endsWith("RUN_STATUS")).map(([k, u]) => `${k.split("_").pop()} ${u}`).join(", ")}.</p>
    </div>
  );
}

interface DbConflict { id: string; code: string; topic: string; severity: string; a: { evidence: string; says: string }; b: { evidence: string; says: string }; note: string; origin: "curated" | "rca_auditor"; state: string; owner_role: string }

/** Live registry: curated conflicts plus everything the RCA auditor found, decided through the API. */
function LiveConflicts({ tag }: { tag: string }) {
  const rows = useLoad(() => api<DbConflict[]>(`/api/live?kind=conflicts&tag=${encodeURIComponent(tag)}`), [tag], LIVE);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({ authority: "", reason: "" });
  const [msg, setMsg] = useState<{ id: string; text: string; tone: "sim" | "danger" | "ok" } | null>(null);
  const save = async (c: DbConflict, state: "resolved" | "unresolved") => {
    try {
      await api("/api/conflicts/decide", { body: { conflictId: c.id, state, authority: form.authority, reason: form.reason } });
      setEditing(null); setForm({ authority: "", reason: "" }); rows.reload();
      setMsg({ id: c.id, tone: "ok", text: "Decision recorded in the review log. Guest decisions are logged but do not change the shared registry." });
    } catch (e) { setMsg({ id: c.id, tone: "danger", text: errorText(e, "The decision was not saved.") }); }
  };
  if (rows.status === "loading") return <div className="skeleton-block" aria-label="Loading conflicts" />;
  if (rows.status === "error") return <Note tone="danger">Could not load the conflict registry: {rows.error}</Note>;
  if (!rows.data?.length) return (
    <Card>
      <CardHeader><CardTitle as="h3" icon={GitCompareArrows}>Source conflicts</CardTitle></CardHeader>
      <CardContent className="pt-2"><p className="text-[13px] text-ink-2">No conflicts recorded for {tag}. That means none were found yet, not that none exist. <a href={`#/audit/${tag}`} className="!text-accent-ink underline underline-offset-2">Run the RCA auditor</a> to check the deck against the sensor data.</p></CardContent>
    </Card>
  );
  return (
    <Card>
      <CardHeader>
        <CardTitle as="h3" icon={GitCompareArrows}>Source conflicts</CardTitle>
        <CardDescription>An owner chooses the authoritative source and records why, or leaves it open.</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col gap-2">
          {rows.data.map((c) => (
            <li key={c.id} className={cn("rounded-lg border px-3 py-2.5", c.state === "unresolved" ? "border-[rgb(var(--danger-rgb)/0.3)] bg-danger-soft/40" : "border-line bg-fg/[0.02]")}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex min-w-0 flex-wrap items-center gap-2"><span className="font-mono text-[12px] text-ink-2">{c.code}</span><b className="text-[13.5px] font-medium text-ink-hi">{c.topic}</b>{c.origin === "rca_auditor" && <span className="badge b-trail">Found by RCA auditor</span>}</div>
                <div className="flex items-center gap-2">
                  <ConflictStateBadge state={c.state} />
                  {c.state !== "rule_applied" && <Button size="sm" variant="ghost" aria-expanded={editing === c.id} onClick={() => setEditing(editing === c.id ? null : c.id)}>Record decision</Button>}
                </div>
              </div>
              <div className="mt-2 grid gap-2 text-[13px] text-ink-2 sm:grid-cols-2">
                <div><Cite id={c.a.evidence} /> {c.a.says}</div>
                <div><Cite id={c.b.evidence} /> {c.b.says}</div>
              </div>
              <p className="mt-1.5 text-[12px] text-ink-3">{c.note} Owner: {c.owner_role}.</p>
              {msg?.id === c.id && <div className="mt-2"><Note tone={msg.tone}>{msg.text}</Note></div>}
              {editing === c.id && (
                <div className="note" style={{ marginTop: 8, display: "block" }}>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <label className="field"><span>Authoritative source and version</span><input className="input" value={form.authority} onChange={(e) => setForm({ ...form, authority: e.target.value })} placeholder="e.g. E2 Equipment Info, MOC-xxx effective date" /></label>
                    <label className="field"><span>Reason (required)</span><input className="input" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></label>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button size="sm" variant="primary" disabled={form.reason.trim().length < 3 || !form.authority.trim()} onClick={() => save(c, "resolved")}>Mark resolved</Button>
                    <Button size="sm" disabled={form.reason.trim().length < 3} onClick={() => save(c, "unresolved")}>Keep unresolved</Button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
