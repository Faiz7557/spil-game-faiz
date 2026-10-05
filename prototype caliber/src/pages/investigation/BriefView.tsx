// The cited AI brief: model output in violet, every claim with its citation chips, decisions recorded by an
// engineer with a reason. Run provenance, checks and the missing-source test sit beside it.
import { useState } from "react";
import { ArrowRight, Check, CircleHelp, FileSearch, Lightbulb, ListChecks, ShieldCheck, Sparkles, TriangleAlert, X } from "lucide-react";
import { EVIDENCE, equipmentByTag } from "../../domain/data";
import { fmtDate } from "../../domain/kpis";
import { DEMO_USER, nowIso, update, useDemo } from "../../domain/store";
import type { Brief, BriefItem } from "../../domain/types";
import { go } from "../../App";
import { Cite, Note } from "../../components/ui";
import { WeeklyCharts } from "../Issues";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MeterRow } from "@/components/ui/chart";
import { BorderBeam } from "@/components/ui/border-beam";
import { cn } from "@/lib/utils";

const MODE_LABEL: Record<Brief["mode"], string> = { snapshot_review: "Snapshot review", masked_diagnostic: "Masked diagnostic test" };

export function BriefView({ brief, tag }: { brief: Brief; tag: string }) {
  const [withheld, setWithheld] = useState<Set<string>>(new Set());
  const [showPerturb, setShowPerturb] = useState(false);
  const demo = useDemo();
  const eq = equipmentByTag(tag)!;
  const b = brief.brief;
  const contaminated = brief.review?.validity === "contaminated";
  const decisionKey = `${brief.run_id}:brief`;
  const briefDecision = demo.briefDecisions[decisionKey];
  const lostCount = [...b.shows, ...b.documented_findings, ...b.hypotheses, ...b.conflicts_missing, ...b.verify_next]
    .filter((it) => [...it.refs, ...(it.support ?? [])].some((r) => withheld.has(r))).length;
  const gapCount = b.conflicts_missing.length + b.abstentions.length;

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]">
      <div className="flex min-w-0 flex-col gap-4">
        {contaminated && (
          <Note tone="danger"><b>Contaminated run — not a blind test.</b> {brief.review?.validity_reason} It is shown to demonstrate the masked input contract and citation checks only, and it is excluded from any accuracy count.</Note>
        )}
        {brief.mode === "masked_diagnostic" && (
          <Card>
            <CardHeader>
              <CardTitle>Data available at cutoff · {fmtDate(brief.cutoff)}</CardTitle>
              <CardDescription>Weekly readings up to the cutoff only. TRIP marker and remarks are hidden.</CardDescription>
            </CardHeader>
            <CardContent className="pt-3"><WeeklyCharts eq={eq} cutoff={brief.cutoff!} /></CardContent>
          </Card>
        )}

        <Card className="relative border-[rgb(var(--ai-rgb)/0.32)] [background:linear-gradient(180deg,rgb(var(--ai-rgb)/0.1),rgb(var(--ai-rgb)/0.02)_34%),var(--panel)]">
          <BorderBeam colorFrom="var(--ai)" colorTo="var(--accent)" duration={16} />
          <CardHeader action={<>
            <Badge tone="ai"><Sparkles aria-hidden="true" />Model output</Badge>
            <Badge tone="neutral">{MODE_LABEL[brief.mode]}</Badge>
          </>}>
            <CardTitle icon={Sparkles} className="[&>svg]:text-ai">AI brief</CardTitle>
            <CardDescription>
              Facts, documented findings and hypotheses are kept apart. Every factual statement cites its evidence; when evidence is missing, the brief
              says so instead of guessing.
            </CardDescription>
            {lostCount > 0 && (
              <p className="mt-2 flex items-center gap-1.5 text-[12.5px] text-danger-ink"><TriangleAlert className="size-3.5" aria-hidden="true" />{lostCount} claim{lostCount === 1 ? "" : "s"} lost support from the withheld sources.</p>
            )}
          </CardHeader>
          <CardContent className="pt-3">
            <Tabs defaultValue="evidence">
              <TabsList aria-label="Brief sections">
                <TabsTrigger value="evidence"><FileSearch aria-hidden="true" />Evidence</TabsTrigger>
                <TabsTrigger value="hypotheses"><Lightbulb aria-hidden="true" />Hypotheses <Count n={b.hypotheses.length} /></TabsTrigger>
                <TabsTrigger value="gaps"><TriangleAlert aria-hidden="true" />Gaps <Count n={gapCount} /></TabsTrigger>
                <TabsTrigger value="next"><ListChecks aria-hidden="true" />Verify & act</TabsTrigger>
              </TabsList>
              <TabsContent value="evidence" forceMount className="flex flex-col gap-5 data-[state=inactive]:hidden">
                <Section title="What the available evidence shows" items={b.shows} withheld={withheld} />
                {brief.mode === "snapshot_review" && <Section title="Documented RCA findings" items={b.documented_findings} withheld={withheld} documented />}
              </TabsContent>
              <TabsContent value="hypotheses" forceMount className="data-[state=inactive]:hidden">
                <Hypotheses brief={brief} withheld={withheld} />
              </TabsContent>
              <TabsContent value="gaps" forceMount className="flex flex-col gap-5 data-[state=inactive]:hidden">
                <Section title="Conflicting or missing evidence" items={b.conflicts_missing} withheld={withheld} tone="warn" />
                <Section title="What this brief cannot tell you" items={b.abstentions} withheld={withheld} />
                {!gapCount && <p className="text-[13px] text-ink-3">The brief lists no conflicts, missing evidence or abstentions.</p>}
              </TabsContent>
              <TabsContent value="next" forceMount className="flex flex-col gap-5 data-[state=inactive]:hidden">
                <div>
                  <h3 className="text-[14px] font-semibold text-ink">What to verify next, and why</h3>
                  <ol className="mt-2.5 flex flex-col gap-2">
                    {b.verify_next.map((v, i) => (
                      <li key={v.text} className="flex gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-fg/[0.035]">
                        <span className="mt-px grid size-5 shrink-0 place-items-center rounded-md bg-ai-soft text-[11px] font-semibold tabular-nums text-ai-ink">{i + 1}</span>
                        <div className="min-w-0 text-[13.5px] leading-snug">
                          <b className="font-semibold text-ink-hi">{v.text}</b>{" "}{v.refs.map((r) => <Cite key={r} id={r} withheld={withheld} />)}
                          {v.why && <div className="mt-1 text-[12.5px] text-ink-3">{v.why}</div>}
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
                <DraftAction brief={brief} tag={tag} withheld={withheld} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <aside className="flex min-w-0 flex-col gap-4" aria-label="Run provenance and review">
        <Card>
          <CardHeader action={<Badge tone="neutral" className="b-documented_finding">Engineer review</Badge>}>
            <CardTitle as="h3">Engineer decision on this brief</CardTitle>
          </CardHeader>
          <CardContent className="pt-3">
            {briefDecision ? (
              <div className="flex flex-col items-start gap-2">
                <Badge tone={briefDecision.decision === "rejected" ? "danger" : "ok"}>{briefDecision.decision === "rejected" ? <X aria-hidden="true" /> : <Check aria-hidden="true" />}{briefDecision.decision}</Badge>
                <p className="text-[13px] text-ink-2">Reason: {briefDecision.reason}</p>
                <Badge tone="sim">Simulation · {briefDecision.at.slice(0, 16).replace("T", " ")}</Badge>
              </div>
            ) : <DecisionForm id={decisionKey} subject={`Brief ${brief.run_id}`} disabled={contaminated} disabledReason="A contaminated run cannot be approved as a finding." />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle as="h3" icon={ShieldCheck}>Checks</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-3 pt-3 text-[13px]">
            <div className="flex items-center justify-between gap-3">
              <span className="text-ink-2">Structure, allowlist, target leakage</span>
              {brief.validation.structural_pass ? <Badge tone="ok"><Check aria-hidden="true" />pass</Badge> : <Badge tone="danger"><X aria-hidden="true" />fail</Badge>}
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-ink-2">Citations checked</span><b className="font-semibold tabular-nums text-ink-hi">{brief.validation.citations_checked}</b>
            </div>
            {brief.review && (
              <MeterRow label="Claims supported by cited evidence" value={brief.review.supported_by_cited_evidence} max={brief.review.factual_statements_checked}
                color="var(--ok)" display={`${brief.review.supported_by_cited_evidence} of ${brief.review.factual_statements_checked}`} />
            )}
            {brief.review && <div className="flex flex-wrap items-center gap-2"><Badge tone="warn">Internal review</Badge><span className="text-[12px] text-ink-3">{brief.review.reviewer}</span></div>}
            <p className="text-[12px] leading-snug text-ink-3">A citation that opens is not proof that the claim is supported. Support was checked claim by claim. No independent domain review has been done yet.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader action={<Button variant="ghost" size="sm" aria-expanded={showPerturb} onClick={() => setShowPerturb(!showPerturb)}>{showPerturb ? "Hide" : "Try it"}</Button>}>
            <CardTitle as="h3">Missing-source test</CardTitle>
            <CardDescription>Withhold a source to see which claims lose their support. Withheld citations are struck through, and those claims cannot be approved.</CardDescription>
          </CardHeader>
          {showPerturb && (
            <CardContent className="flex flex-col gap-1 pt-3">
              {brief.manifest.allowed_evidence.filter((id) => !id.startsWith("CF")).map((id) => (
                <label key={id} className={cn("chk cursor-pointer rounded-lg px-2 py-1.5 transition-colors hover:bg-fg/[0.04]", withheld.has(id) && "bg-danger-soft")}>
                  <input type="checkbox" checked={withheld.has(id)} onChange={(e) => {
                    const n = new Set(withheld); e.target.checked ? n.add(id) : n.delete(id); setWithheld(n);
                  }} />
                  <span><span className="font-mono text-[12px] text-ink">{id}</span> <span className="text-ink-3">{EVIDENCE.get(id)?.title}</span></span>
                </label>
              ))}
            </CardContent>
          )}
        </Card>

        <Card>
          <CardHeader><CardTitle as="h3" icon={Sparkles}>Run provenance</CardTitle></CardHeader>
          <CardContent className="pt-3">
            <dl className="kv">
              <dt>Run</dt><dd className="mono">{brief.run_id}</dd>
              <dt>Model</dt><dd className="mono">{brief.model}</dd>
              <dt>Channel</dt><dd>{brief.channel === "authoring-session" ? "Recorded in the build session (not an API call)" : brief.channel}</dd>
              <dt>Generated</dt><dd>{brief.generated_at.slice(0, 16).replace("T", " ")}</dd>
              <dt>Cutoff</dt><dd>{brief.cutoff ? fmtDate(brief.cutoff) : "none (snapshot review)"}</dd>
              <dt>Allowed inputs</dt><dd>{brief.manifest.allowed_evidence.length} evidence items</dd>
              {brief.manifest.excluded_inputs.length > 0 && <><dt>Excluded</dt><dd className="small">{brief.manifest.excluded_inputs.join("; ")}</dd></>}
            </dl>
            <p className="mt-3 text-[12px] leading-snug text-ink-3">{brief.provenance_note}</p>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}

function Count({ n }: { n: number }) {
  return <span className="ml-0.5 rounded-full bg-fg/[0.08] px-1.5 text-[11px] tabular-nums text-ink-2">{n}</span>;
}

function Section({ title, items, withheld, documented, tone }: { title: string; items: BriefItem[]; withheld: Set<string>; documented?: boolean; tone?: "warn" }) {
  if (!items.length) return null;
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-[14px] font-semibold text-ink">
          {tone === "warn" && <TriangleAlert className="size-4 text-caution" aria-hidden="true" />}{title}
        </h3>
        {documented && <span className="badge b-documented_finding">From the RCA team, not new AI diagnosis</span>}
      </div>
      <ul className="mt-2 flex flex-col">
        {items.map((it) => {
          const lost = it.refs.some((r) => withheld.has(r));
          return (
            <li key={it.text} className={cn("rounded-lg px-2 py-2 text-[13.5px] leading-relaxed text-ink-2 transition-colors hover:bg-fg/[0.035]", lost && "bg-danger-soft/50")}>
              <span className={cn(lost && "text-ink-3 line-through")}>{it.text}</span>{" "}
              {it.refs.map((r) => <Cite key={r} id={r} withheld={withheld} />)}
              {lost && <div className="mt-1 text-[12px] text-danger-ink">Source unavailable — this claim is withheld until its evidence is restored.</div>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Hypotheses({ brief, withheld }: { brief: Brief; withheld: Set<string> }) {
  const demo = useDemo();
  const hs = brief.brief.hypotheses;
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-[14px] font-semibold text-ink">{brief.mode === "snapshot_review" ? "Open hypotheses" : "Hypotheses"}</h3>
        <span className="text-[12px] text-ink-3">No probabilities: there is no calibration data to support one.</span>
      </div>
      {!hs.length && <p className="mt-2 text-[13px] text-ink-3">No hypotheses proposed.</p>}
      <div className="mt-3 flex flex-col gap-3">
        {hs.map((h, i) => {
          const key = `${brief.run_id}:hyp:${i}`;
          const d = demo.briefDecisions[key];
          const unsupported = [...(h.support ?? []), ...h.refs].some((r) => withheld.has(r));
          return (
            <div key={h.text} className="rounded-xl border border-dashed border-[rgb(var(--ai-rgb)/0.5)] bg-[rgb(var(--ai-rgb)/0.05)] px-4 py-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Badge tone="neutral" className="b-proposed"><Lightbulb aria-hidden="true" />Hypothesis</Badge>
                {h.level && <Badge tone="neutral">{h.level}</Badge>}
              </div>
              <p className="mt-2 text-[14px] font-medium leading-snug text-ink-hi">{d?.edited ?? h.text}</p>
              <div className="mt-3 grid gap-3 text-[12.5px] sm:grid-cols-3">
                <div>
                  <div className="mb-1 flex items-center gap-1 text-ink-3"><Check className="size-3.5 text-ok" aria-hidden="true" />Supports</div>
                  {(h.support ?? []).length ? h.support!.map((r) => <Cite key={r} id={r} withheld={withheld} />) : <span className="text-ink-3">—</span>}
                </div>
                <div>
                  <div className="mb-1 flex items-center gap-1 text-ink-3"><X className="size-3.5 text-danger" aria-hidden="true" />Contradicts</div>
                  {(h.against ?? []).length ? h.against!.map((r) => <Cite key={r} id={r} withheld={withheld} />) : <span className="text-ink-3">none in inputs</span>}
                </div>
                <div>
                  <div className="mb-1 flex items-center gap-1 text-ink-3"><CircleHelp className="size-3.5 text-caution" aria-hidden="true" />Still missing</div>
                  <ul className="m-0 list-disc pl-4 text-ink-2">{(h.missing ?? []).map((m) => <li key={m}>{m}</li>)}</ul>
                </div>
              </div>
              <div className="mt-3 border-t border-[rgb(var(--ai-rgb)/0.18)] pt-3">
                {d ? (
                  <p className="flex flex-wrap items-center gap-2 text-[13px] text-ink-2">
                    <Badge tone={d.decision === "rejected" ? "danger" : "ok"}>{d.decision}</Badge> {d.reason} <Badge tone="sim">Simulation</Badge>
                  </p>
                ) : (
                  <DecisionForm id={key} subject={`Hypothesis: ${h.text.slice(0, 60)}…`} editable={h.text}
                    disabled={unsupported} disabledReason="Its supporting source is withheld, so it cannot be approved." approveLabel="Approve as hypothesis to test" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DraftAction({ brief, tag, withheld }: { brief: Brief; tag: string; withheld: Set<string> }) {
  const a = brief.brief.draft_action;
  return (
    <div className="rounded-xl border border-dashed border-[rgb(var(--ai-rgb)/0.5)] px-4 py-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[14px] font-semibold text-ink">Draft follow-up action</h3>
        <span className="badge b-proposed">Proposed, not approved</span>
      </div>
      <p className="mt-2 text-[14px] font-medium leading-snug text-ink-hi">{a.title}</p>
      <p className="mt-1 text-[12.5px] text-ink-2">Proposed owner role: {a.owner_role} {a.refs.map((r) => <Cite key={r} id={r} withheld={withheld} />)}</p>
      <div className="mt-3 grid gap-3 text-[12.5px] sm:grid-cols-2">
        <div>
          <div className="mb-1 flex items-center gap-1 font-medium text-ink"><Check className="size-3.5 text-ok" aria-hidden="true" />Required evidence</div>
          <ul className="m-0 list-disc pl-4 text-ink-2">{a.required_evidence.map((x) => <li key={x}>{x}</li>)}</ul>
        </div>
        <div>
          <div className="mb-1 flex items-center gap-1 font-medium text-ink"><X className="size-3.5 text-danger" aria-hidden="true" />Does not count</div>
          <ul className="m-0 list-disc pl-4 text-ink-2">{a.not_sufficient.map((x) => <li key={x}>{x}</li>)}</ul>
        </div>
      </div>
      {brief.mode === "snapshot_review"
        ? <Button variant="primary" className="mt-4" onClick={() => go("actions", tag)}>Create this action in Actions & Verification <ArrowRight aria-hidden="true" /></Button>
        : <p className="mt-3 text-[12px] text-ink-3">Masked-mode drafts are exercise outputs and cannot create actions.</p>}
    </div>
  );
}

function DecisionForm({ id, subject, editable, disabled, disabledReason, approveLabel = "Approve" }: {
  id: string; subject: string; editable?: string; disabled?: boolean; disabledReason?: string; approveLabel?: string;
}) {
  const [reason, setReason] = useState("");
  const [edit, setEdit] = useState<string | null>(null);
  const [tried, setTried] = useState(false);
  const decide = (decision: "approved" | "edited" | "rejected") => {
    setTried(true);
    if (!reason.trim()) return;
    update((s) => ({
      ...s,
      briefDecisions: { ...s.briefDecisions, [id]: { decision, reason, at: nowIso(), edited: decision === "edited" ? edit ?? undefined : undefined } },
      events: [...s.events, { at: nowIso(), actor: DEMO_USER, subject, decision, reason }],
    }));
  };
  const invalid = tried && !reason.trim();
  return (
    <div className="flex flex-col gap-2">
      {edit !== null && <textarea className="input" value={edit} onChange={(e) => setEdit(e.target.value)} aria-label="Edited statement" />}
      <input className="input" placeholder="Reason for your decision (required)" value={reason} onChange={(e) => setReason(e.target.value)}
        aria-invalid={invalid} aria-label="Reason for your decision" />
      {invalid && <span className="text-[12px] text-danger-ink">Write a reason. Decisions without a reason are not recorded.</span>}
      {disabled && <span className="text-[12px] text-danger-ink">{disabledReason}</span>}
      <div className="flex flex-wrap gap-2">
        {edit === null
          ? <Button size="sm" disabled={disabled} onClick={() => decide("approved")}><Check aria-hidden="true" /> {approveLabel}</Button>
          : <Button size="sm" disabled={disabled} onClick={() => decide("edited")}><Check aria-hidden="true" /> Save edit</Button>}
        {editable && edit === null && <Button size="sm" onClick={() => setEdit(editable)}>Edit</Button>}
        <Button size="sm" variant="danger" onClick={() => decide("rejected")}><X aria-hidden="true" /> Reject</Button>
      </div>
    </div>
  );
}
