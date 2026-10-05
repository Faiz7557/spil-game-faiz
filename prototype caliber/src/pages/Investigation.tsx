// The "mesin doctor": read top-down like a diagnosis. Where the asset stands against its limits, the window to
// act (forecast with its backtest), ranked causes with evidence for/against and the cheapest check, then the
// cited AI brief. Symptom reading and a forecast window with a linear baseline; never a failure prediction.
import { Suspense, lazy, useMemo, useState } from "react";
import { Activity, ArrowRight, EyeOff, History, Lock, ScanSearch, Sparkles, Timer } from "lucide-react";
import { SectionTabs, openSectionTab } from "@/components/ui/section-tabs";
import { BRIEFS, SNAP, equipmentByTag, incidentById } from "../domain/data";
import { firstDiagnosableWeek } from "../domain/diagnosis";
import { fmtDate } from "../domain/kpis";
import { go } from "../App";
import { Note, useDrawer } from "../components/ui";
import { WeeklyCharts } from "./Issues";
import DifferentialPanel from "../components/DifferentialPanel";
import ForecastPanel from "../components/ForecastPanel";
import goldJson from "../data/diagnosis_gold.json";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TagChip } from "@/components/shell/Shell";
import { ConditionNow } from "./investigation/ConditionNow";
import { BriefView } from "./investigation/BriefView";
import { Checklist, ChecksScore, StatusStrip } from "./investigation/Checkup";
import { buildCheckup } from "../domain/checkup";
import { REVIEW_DATE } from "../domain/data";
import { useDemo } from "../domain/store";

type Mode = "snapshot_review" | "masked_diagnostic" | "strict_replay";
const MODES: { id: Mode; label: string }[] = [
  { id: "snapshot_review", label: "Snapshot review" },
  { id: "masked_diagnostic", label: "Masked diagnostic test" },
  { id: "strict_replay", label: "Strict historical replay" },
];
// three.js loads only when an investigation opens.
const MachineView = lazy(() => import("../components/three/MachineView"));
const GOLD = (goldJson as { cases: Record<string, { mode: string }> }).cases;

export default function Investigation({ tag }: { tag: string }) {
  // Keyed by tag so the review week and run state reset when the case changes.
  return <InvestigationCase key={tag} tag={tag} />;
}

function InvestigationCase({ tag }: { tag: string }) {
  const [mode, setMode] = useState<Mode>("snapshot_review");
  const eq = equipmentByTag(tag)!;
  const first = useMemo(() => firstDiagnosableWeek(eq), [eq]);
  const tripIdx = eq.history.findIndex((h) => h.status === "TRIP");
  const [week, setWeek] = useState(first ?? Math.max(0, (tripIdx >= 0 ? tripIdx : eq.history.length) - 1));
  const brief = BRIEFS.find((b) => b.mode === mode && b.run_id.includes(tag.replace("-", "").toLowerCase()));
  const strict = mode === "strict_replay";
  const revealGold = mode === "snapshot_review";
  const [active, setActive] = useState<number | null>(null);
  const demo = useDemo();
  const verified = demo.actions.some((a) => a.caseTag === tag && a.state === "verified");
  const rca = SNAP.rca.find((r) => r.tag === tag);
  const checks = useMemo(() => buildCheckup(eq, rca, week, REVIEW_DATE, verified), [eq, rca, week, verified]);
  const pastPlan = checks.filter((c) => c.group === "follow-through" && c.state === "fail").length;


  return (
    <>
      <PageHeader
        title={<>Investigation <TagChip tag={tag} size="md" /></>}
        badges={<Badge tone="neutral" className="b-proposed">Symptom reading, not failure prediction</Badge>}
        description="Checkup, condition against limits, the window to act, ranked causes and a cited brief."
        actions={
          <div className="max-w-full overflow-x-auto">
            <div className="seg" role="group" aria-label="Investigation mode">
              {MODES.map((m) => <button key={m.id} type="button" className="whitespace-nowrap" aria-pressed={mode === m.id} onClick={() => setMode(m.id)}>{m.label}</button>)}
            </div>
          </div>
        } />
      <ModeRules mode={mode} />

      {strict ? <><StrictReplay tag={tag} /><div className="mt-6"><SimilarIncidents tag={tag} masked /></div></> : (
        <>
          <StatusStrip eq={eq} week={week} pastPlan={pastPlan} />
          <div className="tw grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)_300px]">
            <Checklist checks={checks} active={active} onActive={setActive} tag={tag} />
            <Suspense fallback={<div className="skeleton-block h-[480px]" />}>
              <MachineView eq={eq} week={week} onWeek={setWeek} canReplay={revealGold} active={active} onActive={setActive} />
            </Suspense>
            <div className="lg:col-span-2 xl:col-span-1"><ChecksScore checks={checks} actionsHref={`#/actions/${tag}?tab=source`} tag={tag} /></div>
          </div>
          <AiTeaser brief={brief} />
          <SectionTabs label="Investigation sections" className="mt-6" tabs={[
            { id: "condition", label: "Condition", icon: Activity, render: () => <ConditionNow eq={eq} week={week} onWeek={setWeek} goldMode={GOLD[tag]?.mode ?? ""} revealGold={revealGold} /> },
            { id: "window", label: "Window to act", icon: Timer, render: () => <ForecastPanel tag={tag} /> },
            { id: "causes", label: "Causes & AI investigator", icon: ScanSearch, render: () => <DifferentialPanel tag={tag} revealGold={revealGold} week={week} onWeekChange={setWeek} showWeekPicker={false} /> },
            { id: "brief", label: "AI brief", icon: Sparkles, badge: brief ? "cited" : undefined, badgeTone: "ai", render: () => (
              <section id="brief" aria-label="Cited AI brief">
                {brief ? <BriefView brief={brief} tag={tag} key={brief.run_id} /> : (
                  <Card className="border-dashed">
                    <CardHeader>
                      <CardTitle icon={Sparkles} className="[&>svg]:text-ai">No AI brief for {tag} yet</CardTitle>
                      <CardDescription>Only KO-3201 has a recorded, reviewed run in this prototype. The rest of the workflow works without it.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-wrap gap-2 pt-3">
                      <Button onClick={() => go("queue", tag)}>Open evidence</Button>
                      <Button variant="primary" onClick={() => go("investigation", "KO-3201", { tab: "brief" })}>See the KO-3201 brief <ArrowRight aria-hidden="true" /></Button>
                    </CardContent>
                  </Card>
                )}
              </section>
            ) },
            { id: "similar", label: "Similar records", icon: History, render: () => <SimilarIncidents tag={tag} masked={mode !== "snapshot_review"} /> },
          ]} />
        </>
      )}
    </>
  );
}

/** One line of the AI's work on the board, so the brief and the investigator are visible without scrolling. */
function AiTeaser({ brief }: { brief: (typeof BRIEFS)[number] | undefined }) {
  const lead = brief?.brief.shows[0]?.text;
  const r = brief?.review;
  return (
    <div className="tw mt-4 flex flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl border border-ai/30 bg-ai/[0.06] px-5 py-3.5">
      <Sparkles className="size-5 shrink-0 text-ai" strokeWidth={1.7} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-medium text-ai-ink">{brief ? "AI brief · every sentence cites its source" : "AI brief"}</p>
        <p className="mt-0.5 line-clamp-1 text-[13.5px] text-ink">{lead ?? "No reviewed brief for this machine yet. The ranked causes and the investigator still work."}</p>
      </div>
      {r && <span className="shrink-0 rounded-full bg-ok/12 px-2.5 py-1 text-[12px] font-medium text-ok-ink tabular-nums">{r.supported_by_cited_evidence} of {r.factual_statements_checked} claims supported</span>}
      <div className="flex shrink-0 gap-2">
        <Button size="sm" onClick={() => openSectionTab("causes")}><ScanSearch aria-hidden="true" />Causes & investigator</Button>
        {brief && <Button size="sm" variant="primary" onClick={() => openSectionTab("brief")}>Open AI brief <ArrowRight aria-hidden="true" /></Button>}
      </div>
    </div>
  );
}

function ModeRules({ mode }: { mode: Mode }) {
  const t = {
    snapshot_review: ["Uses the target RCA", "summarises findings and open follow-up as of the review date."],
    masked_diagnostic: ["RCA, failure date and post-failure data hidden", "hypotheses only, from data up to the cutoff."],
    strict_replay: ["Only evidence known by the cutoff", "files without a publication time are excluded."],
  }[mode];
  const Icon = mode === "masked_diagnostic" ? EyeOff : mode === "strict_replay" ? History : Lock;
  return (
    <div className="tw mb-4 flex items-start gap-3 rounded-xl border border-line bg-fg/[0.025] px-4 py-3 text-[13px] leading-relaxed text-ink-2">
      <Icon className="mt-0.5 size-4 shrink-0 text-ink-3" aria-hidden="true" />
      <div><b className="font-semibold text-ink">{MODES.find((m) => m.id === mode)!.label}.</b> {t[0]}; {t[1]}</div>
    </div>
  );
}

function StrictReplay({ tag }: { tag: string }) {
  const eq = equipmentByTag(tag)!;
  const cutoff = SNAP.equipment.find((e) => e.tag === tag)!.history.find((h) => h.status === "TRIP")!.date;
  const before = eq.history.filter((h) => h.date < cutoff).slice(-1)[0].date;
  return (
    <div className="tw grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]">
      <Card>
        <CardHeader>
          <CardTitle>Dated sensor readings up to {fmtDate(before)}</CardTitle>
          <CardDescription>The file has no availability time, so this is not proof of what the plant knew then.</CardDescription>
        </CardHeader>
        <CardContent className="pt-3"><WeeklyCharts eq={eq} cutoff={before} /></CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle as="h2">Excluded from this replay</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-3 pt-3">
          <ul className="flex flex-col">
            {Object.values(SNAP.sources).filter((s) => s.kind !== "booklet" && s.kind !== "casebook").map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-line py-2 text-[13px] last:border-0">
                <span className="min-w-0"><b className="font-mono text-[12px] text-ink">{s.id}</b> <span className="text-ink-2">{s.file_name}</span></span>
                <Badge tone="warn">available_at unknown</Badge>
              </li>
            ))}
          </ul>
          <Note tone="warn">No AI brief and no similar-RCA lookup run in this mode. Incident date is not RCA publication date, and no RCA from after the cutoff may be used as earlier knowledge. Result: <b>No verified comparable RCA available</b>.</Note>
        </CardContent>
      </Card>
    </div>
  );
}

function SimilarIncidents({ tag, masked }: { tag: string; masked: boolean }) {
  const open = useDrawer();
  const eq = equipmentByTag(tag)!;
  const target = incidentById(eq.linked_incident!)!;
  // Masked: only the equipment type known before investigation. Snapshot: type + recorded component.
  const pool = SNAP.incidents.filter((i) => i.id !== target.id && i.eq_type === target.eq_type &&
    (masked || i.component.toLowerCase().includes(target.component.split(" ").pop()!.toLowerCase())));
  const withRca = new Set(SNAP.equipment.map((e) => e.linked_incident));
  const shown = [...pool].sort((a, b) => b.occurred.localeCompare(a.occurred)).slice(0, 6);
  return (
    <Card id="similar" className="mt-8 scroll-mt-4">
      <CardHeader action={<span className="text-[12px] text-ink-3">{pool.length} candidates</span>}>
        <CardTitle icon={ScanSearch}>Similar incidents in the register</CardTitle>
        <CardDescription>
          Filter: equipment type {target.eq_type}{masked ? "" : ` + component “${target.component.split(" ").pop()}”`} · target excluded · {pool.length} candidates
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 pt-3">
        <Note tone="warn"><b>No verified comparable RCA available.</b> None of these records has an RCA package in the dataset. Similar type or component makes a record a candidate for review, not evidence of the same cause.</Note>
        {shown.length ? (
          <div className="overflow-x-auto">
            <table className="table min-w-[640px]">
              <thead><tr><th>Tag</th><th>Plant</th><th>Occurred</th><th>Title</th><th>Component</th><th>RCA</th></tr></thead>
              <tbody>
                {shown.map((i) => (
                  <tr key={i.id} className="cursor-pointer" tabIndex={0} aria-label={`Open register record ${i.tag}, ${i.occurred}`}
                    onClick={() => open({ kind: "incident", id: i.id })}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open({ kind: "incident", id: i.id }); } }}>
                    <td><TagChip tag={i.tag} /></td><td>{i.plant}</td><td className="num tabular-nums">{i.occurred}</td><td className="small">{i.title}</td><td className="small">{i.component}</td>
                    <td className="tiny muted">{withRca.has(i.id) ? "Available" : "Detailed RCA unavailable"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="text-[13px] text-ink-3">No candidates match this filter.</p>}
      </CardContent>
    </Card>
  );
}
