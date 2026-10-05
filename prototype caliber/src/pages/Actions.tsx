import { useEffect, useState } from "react";
import { BellRing, CalendarX2, ClipboardList, ListChecks, Repeat, ScrollText, Sparkles } from "lucide-react";
import { SectionTabs, openSectionTab } from "@/components/ui/section-tabs";
import { ActionList } from "./actions/ActionList";
import { PlanCalendar } from "./actions/PlanCalendar";
import { PipelineChart, SourceStatusChart } from "./actions/ActionCharts";
import { BRIEFS, REVIEW_DATE, rcaByTag } from "../domain/data";
import { fmtDate } from "../domain/kpis";
import { actionDue } from "../domain/queue";
import { DEMO_USER, nowIso, refreshActions, update, useDemo } from "../domain/store";
import { api } from "../lib/api";
import { LIVE } from "../lib/supabase";
import { errorText } from "../lib/live";
import FollowThroughPanel from "../components/FollowThroughPanel";
import RemindersPanel from "../components/RemindersPanel";
import { SENSOR_RULE, type SimAction, type VerificationRule } from "../domain/actionTransitions";
import type { RcaAction } from "../domain/types";
import { Cite, Empty, Note } from "../components/ui";
import { TagChip } from "@/components/shell/Shell";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, toneDot } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ManagerView, ReviewLog } from "./actions/SidePanels";
import { DUE, DueBadge } from "./actions/due";

const GENERIC_RULE: VerificationRule = {
  required: ["work_order", "installation_record"],
  notSufficient: { condition_normal: "Shows the machine recovered. Recovery is not evidence the action was done." },
  effectivenessRequired: false,
  effectivenessCriteria: "",
};

const newId = () => "SIM-" + Math.random().toString(36).slice(2, 7).toUpperCase();

/** Live: the server creates the action and logs it. Offline: a browser-only simulation. */
export async function createAction(partial: Partial<SimAction> & { caseTag: string; title: string }) {
  if (LIVE) {
    await api("/api/actions", { body: { caseTag: partial.caseTag, title: partial.title, sourceActionRef: partial.sourceActionRef ?? null,
      sourceRefs: partial.sourceRefs ?? [], rationale: partial.rationale ?? "", scope: partial.scope ?? "", rule: partial.rule ?? GENERIC_RULE } });
    await refreshActions(partial.caseTag);
    return;
  }
  const a: SimAction = {
    id: newId(), sourceActionRef: null, sourceRefs: [], rationale: "", owner: "", ownerRole: "", due: "", scope: "",
    dependency: "", state: "draft", evidence: [], rule: GENERIC_RULE, reviewer: "", effectivenessResult: "", executionNote: "",
    log: [{ at: nowIso(), actor: DEMO_USER, from: null, to: "draft", decision: "Created", reason: "Draft created in the demo", evidenceRefs: [] }],
    createdAt: nowIso(), ...partial,
  };
  update((s) => ({ ...s, actions: [a, ...s.actions] }));
}

export default function Actions({ tag }: { tag: string }) {
  const demo = useDemo();
  const rca = rcaByTag(tag)!;
  const mine = demo.actions.filter((a) => a.caseTag === tag);
  const brief = BRIEFS.find((b) => b.mode === "snapshot_review" && b.run_id.includes(tag.replace("-", "").toLowerCase()));
  const draft = brief?.brief.draft_action;
  const draftUsed = draft && mine.some((a) => a.title === draft.title);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(LIVE);
  const [createErr, setCreateErr] = useState<string | null>(null);
  useEffect(() => {
    if (!LIVE) return;
    setLoading(true); setLoadErr(null);
    refreshActions(tag).catch((e) => setLoadErr(errorText(e, "Could not load actions."))).finally(() => setLoading(false));
  }, [tag]);
  const create = (partial: Parameters<typeof createAction>[0]) => {
    setCreateErr(null);
    createAction(partial).catch((e) => setCreateErr(errorText(e, "The action was not created.")));
  };

  const fromSource = (a: RcaAction) => {
    const sensor = tag === "KO-3201" && a.text.includes("water-in-oil sensor on KO-3201");
    create({
      caseTag: tag, title: `Confirm completion: ${a.text}`, sourceActionRef: `${rca.source} · ${a.kind} · ${a.rc}`,
      sourceRefs: tag === "KO-3201" ? ["EV-11"] : [], ownerRole: "Discipline owner (source PIC " + a.pic + ")",
      rationale: `Source status ${a.status ?? "not recorded"}; plan date ${fmtDate(a.plan_date)}.`, rule: sensor ? SENSOR_RULE : GENERIC_RULE,
    });
  };

  const source = [...rca.actions, ...rca.preventive];
  const dues = source.map((a) => actionDue(a, REVIEW_DATE));
  const kind = LIVE ? "tracked" : "simulated";
  const late = dues.filter((d) => d === "plan_passed" || d === "no_status_plan_passed").length;
  const overdueReminders = source.filter((_, i) => dues[i] !== "closed" && dues[i] !== "not_due" && dues[i] !== "no_status_not_due").length;
  const pickSource = (i: number) => {
    openSectionTab("source");
    setTimeout(() => document.getElementById(`src-action-${i}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 360);
  };

  const draftCard = draft && !draftUsed && (
    <div className="flex h-full flex-col p-5">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-[13px] font-medium text-ai-ink"><Sparkles className="size-4" aria-hidden="true" />Draft from the AI brief</span>
        <span className="badge b-proposed">Proposed</span>
      </div>
      <h3 className="mt-3 text-[16px] font-semibold leading-snug text-ink-hi">{draft.title}</h3>
      <p className="mt-1 text-[12.5px] text-ink-3">{draft.owner_role} {draft.refs.map((r) => <Cite key={r} id={r} />)}</p>
      <ul className="mt-3 space-y-1.5">
        {draft.required_evidence.map((r) => (
          <li key={r} className="flex items-start gap-2 text-[13px] text-ink-2"><span className="mt-1.5 size-1.5 shrink-0 rounded-full border border-ai" aria-hidden="true" />{r}</li>
        ))}
      </ul>
      <div className="mt-auto flex flex-wrap items-center gap-3 pt-4">
        <Button variant="primary" onClick={() => create({
          caseTag: tag, title: draft.title, sourceActionRef: "R2 · corrective · X1 (Install online water-in-oil sensor)", sourceRefs: draft.refs,
          ownerRole: draft.owner_role, rationale: "Root cause X1 control; source status In Progress with plan date 30 Jun 2026 passed on the review date.",
          rule: SENSOR_RULE, scope: "KO-3201 lube-oil system",
        })}>{LIVE ? "Create action" : "Create as simulated action"}</Button>
        <span className="text-[12px] text-ink-3">Starts as a draft.</span>
      </div>
    </div>
  );

  return (
    <>
      <PageHeader
        title={<>Actions & verification <TagChip tag={tag} size="md" /></>}
        badges={LIVE ? <Badge tone="accent" dot>Server-stored</Badge> : <Badge tone="sim">Simulation · this browser only</Badge>}
        description={<>An action is verified only with matching evidence and a reviewer who is not the owner.{LIVE ? "" : " Anything created here is a simulation in this browser."}</>}
      />

      <div className="tw grid gap-4 lg:grid-cols-2">
        <SourceStatusChart actions={source} dues={dues} source={rca.source} onPick={pickSource} onOpen={() => openSectionTab("source")} />
        <PipelineChart actions={mine} kind={kind} onOpen={() => openSectionTab("tracked")} />
      </div>

      {loadErr && <Note tone="danger">{loadErr}</Note>}
      {createErr && <Note tone="danger">{createErr}</Note>}

      <SectionTabs label="Action sections" className="mt-6" tabs={[
        { id: "tracked", label: LIVE ? "Tracked actions" : "Simulated actions", icon: ClipboardList, badge: mine.length || undefined, render: () => (
          loading ? <div className="skeleton-block tall" aria-label="Loading actions" />
            : mine.length === 0 && !draftCard ? (
              <Card><Empty title={`No ${kind} actions for this case yet`}>
                <p className="small">Create a verification task from an RCA action. It appears here with its owner, due date and the evidence it needs.</p>
                <Button className="mt-3" onClick={() => openSectionTab("source")}>Open RCA actions</Button>
              </Empty></Card>
            ) : <ActionList actions={mine} draft={draftCard && draft ? { title: draft.title, node: draftCard } : undefined} />
        ) },
        { id: "source", label: "RCA actions", icon: ListChecks, badge: late || undefined, badgeTone: "danger", render: () => (
          <div className="flex flex-col gap-4">
            <Card>
              <CardHeader>
                <CardTitle icon={CalendarX2}>Plan dates</CardTitle>
                <CardDescription>Each coloured day is an action's plan date. Click one to jump to it.</CardDescription>
              </CardHeader>
              <CardContent className="pt-3"><PlanCalendar actions={source} dues={dues} review={REVIEW_DATE} onPick={(i) => document.getElementById(`src-action-${i}`)?.scrollIntoView({ behavior: "smooth", block: "center" })} /></CardContent>
            </Card>
            <Card>
              <CardHeader action={<span className="text-[12px] text-ink-3">{rca.source} · read-only</span>}>
                <CardTitle>Actions in the RCA</CardTitle>
                <CardDescription>"Closed" is the source's word for execution, not proof of effectiveness.</CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <ul className="divide-y divide-line">
                  {source.map((a, i) => {
                    const due = dues[i];
                    const lateRow = due === "plan_passed" || due === "no_status_plan_passed";
                    return (
                      <li key={a.text} id={`src-action-${i}`} className="flex scroll-mt-32 flex-wrap items-center gap-x-4 gap-y-2 py-3">
                        <span className={cn("size-2 shrink-0 rounded-full", toneDot[DUE[due].tone])} aria-hidden="true" />
                        <div className="min-w-0 flex-[1_1_300px]">
                          <div className="text-[13.5px] font-medium text-ink-hi">{a.text}</div>
                          <div className="mt-0.5 text-[12px] text-ink-3">PIC {a.pic} · plan <span className={cn("tabular-nums", lateRow && "text-danger-ink")}>{fmtDate(a.plan_date)}</span></div>
                        </div>
                        <DueBadge due={due} />
                        {due !== "closed" && <Button size="sm" onClick={() => { fromSource(a); openSectionTab("tracked"); }}>Create task</Button>}
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          </div>
        ) },
        { id: "reminders", label: "Reminders", icon: BellRing, badge: overdueReminders || undefined, badgeTone: "warn", render: () => (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <RemindersPanel tag={tag} onOpenAction={pickSource} />
            <ManagerView tag={tag} />
          </div>
        ) },
        { id: "follow", label: "Follow-through", icon: Repeat, render: () => (
          <FollowThroughPanel tag={tag} onCreate={(title, ref, rationale) => { create({ caseTag: tag, title, sourceRefs: [ref], rationale }); openSectionTab("tracked"); }} />
        ) },
        { id: "log", label: "Review log", icon: ScrollText, render: () => <ReviewLog /> },
      ]} />
    </>
  );
}
