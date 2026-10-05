import { useState, type ReactNode } from "react";
import { Activity, ArrowRight, CircleCheck, CircleHelp, ClipboardPlus, FileSearch, FileText, ListChecks, MessageSquareText, ScanSearch, Sparkles, TriangleAlert, Unlink } from "lucide-react";
import { EMAP, SNAP, equipmentByTag, rcaByTag } from "../domain/data";
import { fmtDate } from "../domain/kpis";
import type { Finding } from "../domain/claimCheck";
import { api } from "../lib/api";
import { LIVE } from "../lib/supabase";
import { errorText, useLoad } from "../lib/live";
import { go } from "../App";
import { Cite, Empty, Note, useDrawer } from "../components/ui";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatTile } from "@/components/ui/stat-tile";
import { Badge, type Tone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Donut, STATUS_HEX } from "@/components/ui/chart";
import { BorderBeam } from "@/components/ui/border-beam";
import { TagChip } from "@/components/shell/Shell";
import { cn } from "@/lib/utils";
import { Coverflow } from "@/components/ui/coverflow";
import { openCopilot } from "@/components/shell/Shell";
import { createAction } from "./Actions";
import { shortName } from "../domain/names";

interface AuditResult { auditId: string; findings: Finding[]; dropped: { reason: string; quote?: string }[]; createdAt: string }
type Verdict = Finding["verdict"];

const VERDICT: Record<Verdict, { label: string; short: string; tone: Tone; icon: typeof CircleCheck; color: string }> = {
  conflict: { label: "Conflicts with the record", short: "Conflicts", tone: "danger", icon: TriangleAlert, color: STATUS_HEX.danger },
  consistent: { label: "Consistent", short: "Consistent", tone: "ok", icon: CircleCheck, color: STATUS_HEX.ok },
  not_checkable: { label: "Not checkable", short: "Not checkable", tone: "info", icon: CircleHelp, color: STATUS_HEX.muted },
};
const ORDER: Verdict[] = ["conflict", "consistent", "not_checkable"];

/** Surface treatment per verdict: the claim-vs-record pair carries the verdict's colour, quietly. */
const SURFACE: Record<Verdict, string> = {
  conflict: "border-[rgb(var(--danger-rgb)/0.35)] bg-[linear-gradient(180deg,rgb(var(--danger-rgb)/0.07),transparent_70%)]",
  consistent: "border-[rgb(var(--ok-rgb)/0.22)]",
  not_checkable: "border-line",
};

export default function Audit({ tag }: { tag: string }) {
  const rca = rcaByTag(tag);
  const eq = equipmentByTag(tag);
  const stored = useLoad(() => api<AuditResult | null>(`/api/audit/rca?tag=${encodeURIComponent(tag)}`), [tag], LIVE);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Verdict | "all">("all");
  const result = stored.data;

  const run = async () => {
    setRunning(true); setError(null);
    try { stored.set(await api<AuditResult>("/api/audit/rca", { body: { tag } })); setFilter("all"); }
    catch (e) { setError(errorText(e, "The audit failed.")); }
    finally { setRunning(false); }
  };

  const counts = Object.fromEntries(ORDER.map((v) => [v, result?.findings.filter((f) => f.verdict === v).length ?? 0])) as Record<Verdict, number>;
  const shown = (result?.findings ?? []).filter((f) => filter === "all" || f.verdict === filter)
    .sort((a, b) => ORDER.indexOf(a.verdict) - ORDER.indexOf(b.verdict) || a.claim.slide - b.claim.slide);
  const showResult = !!result && !running;

  return (
    <>
      <PageHeader
        title={<>RCA auditor <TagChip tag={tag} size="md" /></>}
        badges={<Badge tone="accent">KQ3</Badge>}
        description="The model quotes each checkable claim in the RCA deck; code checks it against the condition record."
        actions={LIVE && rca ? (
          <Button variant="ai" disabled={running} onClick={run}>
            <Sparkles className="size-4" aria-hidden="true" /> {running ? "Auditing…" : result ? "Run the audit again" : "Audit this RCA"}
          </Button>
        ) : undefined}
      />

      <div className="case-switch" role="tablist" aria-label="Asset">
        {SNAP.rca.map((r) => (
          <button key={r.tag} role="tab" aria-pressed={r.tag === tag} onClick={() => go("audit", r.tag)} title={r.tag} className="!font-sans">{shortName(r.tag)}</button>
        ))}
      </div>

      {!rca || !eq ? <Card><Empty title={`No RCA deck for ${tag}`}><p className="small">Pick an asset above that has an RCA deck in the dataset.</p></Empty></Card> : (
        <>
          {showResult && (
            <div className="tw mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StatTile accent="var(--series-1)" label="Checkable claims" icon={ListChecks} value={result!.findings.length}
                context={<>Extracted from {rca.slides.length} slides · audited {fmtDate(result!.createdAt)}</>} />
              <StatTile label="Conflicts with the record" icon={TriangleAlert} value={counts.conflict} tone={counts.conflict ? "danger" : undefined}
                context="Claim differs from the condition record beyond the 10 % tolerance" />
              <StatTile label="Consistent" icon={CircleCheck} value={counts.consistent} tone={counts.consistent ? "ok" : undefined}
                context="Claim matches the weekly reading within 7 days" />
              <StatTile accent="var(--series-2)" label="Not checkable" icon={CircleHelp} value={counts.not_checkable}
                context={<>{result!.dropped.length ? `${result!.dropped.length} more dropped for an unverifiable quote` : "No matching parameter or reading in the record"}</>} />
            </div>
          )}

          <div className="tw grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(340px,1fr)]">
            <div className="flex min-w-0 flex-col gap-4">
              {!LIVE && <OfflineAudit tag={tag} />}
              {error && <Note tone="danger">{error}</Note>}
              {LIVE && stored.status === "error" && <Note tone="danger">Could not load the last audit: {stored.error}</Note>}
              {LIVE && !running && stored.status === "loading" && <div className="skeleton-block tall" aria-label="Loading the last audit" />}

              {running && (
                <Card className="audit-running relative" aria-live="polite">
                  <div className="scan-bar" aria-hidden="true" />
                  <BorderBeam colorFrom="var(--ai)" colorTo="var(--accent)" duration={6} size={180} />
                  <CardHeader action={<Badge tone="ai" dot pulse>Model running</Badge>}>
                    <CardTitle icon={ScanSearch}>Auditing the {tag} RCA</CardTitle>
                    <CardDescription>Reading {rca.slides.length} slides and checking each claim against {eq.history.length} weekly readings. This takes about a minute.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ol className="grid gap-2 sm:grid-cols-3">
                      {[["Extract", "Model copies each checkable claim word for word"], ["Compare", "Code matches each claim to a weekly reading"], ["Decide", "Conflicts go to an owner"]].map(([t, d], i) => (
                        <li key={t} className="rounded-lg border border-line bg-[rgb(var(--well-rgb)/0.4)] px-3 py-2.5">
                          <div className="text-[12.5px] font-medium text-ink"><span className="mr-1.5 tabular-nums text-ink-3">{i + 1}</span>{t}</div>
                          <div className="mt-0.5 text-[12px] leading-snug text-ink-3">{d}</div>
                        </li>
                      ))}
                    </ol>
                    <div className="mt-4 flex flex-col gap-2" aria-hidden="true">
                      {[0, 1, 2].map((i) => <div key={i} className="skeleton-block" style={{ height: 64 }} />)}
                    </div>
                  </CardContent>
                </Card>
              )}

              {LIVE && !running && stored.status === "ok" && !result && (
                <Card>
                  <Empty title="Not audited yet">
                    <p className="small">Run the audit to extract the deck's claims and check them against the condition record. Conflicts appear here first, each beside the reading it disagrees with.</p>
                  </Empty>
                </Card>
              )}

              {showResult && (
                <Card>
                  <CardHeader action={<Badge tone="ai" dot>Claims extracted by the model</Badge>}>
                    <CardTitle icon={FileSearch}>Claim against record</CardTitle>
                    <CardDescription>Audited {fmtDate(result!.createdAt)} · what the RCA says, beside what the condition record shows.</CardDescription>
                  </CardHeader>
                  <CardContent className="pb-2">
                    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by verdict">
                      <FilterChip on={filter === "all"} onClick={() => setFilter("all")}>All <b className="tabular-nums">{result!.findings.length}</b></FilterChip>
                      {ORDER.map((v) => (
                        <FilterChip key={v} on={filter === v} disabled={!counts[v]} onClick={() => setFilter(v)}>
                          <span className="size-1.5 rounded-full" style={{ background: VERDICT[v].color }} aria-hidden="true" />
                          {VERDICT[v].label} <b className="tabular-nums">{counts[v]}</b>
                        </FilterChip>
                      ))}
                    </div>
                    {!!result!.dropped.length && (
                      <div className="mt-3"><Note tone="warn">{result!.dropped.length} extracted claim{result!.dropped.length > 1 ? "s were" : " was"} dropped because the quote was not found on the cited slide. Unverifiable quotes are never shown as findings.</Note></div>
                    )}
                    {shown.length ? (
                      <Coverflow key={filter} className="mt-2" label="Claims against the record" cardWidth="min(620px, 84vw)" 
                        items={shown.map((f, i) => ({ key: `${f.claim.slide}-${i}`, label: f.claim.parameter, node: <FindingRow f={f} source={rca.source} tag={tag} /> }))} />
                    ) : <p className="py-6 text-center text-[13px] text-ink-3">No findings with this verdict.</p>}
                  </CardContent>
                </Card>
              )}
            </div>

            <aside className="flex min-w-0 flex-col gap-4">
              {showResult && (
                <Card>
                  <CardHeader>
                    <CardTitle icon={ListChecks}>Verdict summary</CardTitle>
                    <CardDescription>Select a slice or a row to filter the findings.</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-wrap items-center gap-5">
                    <Donut size={150} thickness={16}
                      data={ORDER.map((v) => ({ key: v, label: VERDICT[v].short, value: counts[v], color: VERDICT[v].color }))}
                      center={{ value: result!.findings.length, label: "checkable claims" }}
                      onPick={(k) => setFilter((cur) => (cur === k ? "all" : (k as Verdict)))} activeKey={filter === "all" ? undefined : filter} />
                    <ul className="flex min-w-[150px] flex-1 flex-col gap-1">
                      {ORDER.map((v) => {
                        const Icon = VERDICT[v].icon;
                        return (
                          <li key={v}>
                            <button type="button" disabled={!counts[v]} aria-pressed={filter === v} onClick={() => setFilter(filter === v ? "all" : v)}
                              className={cn("flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] transition-colors disabled:opacity-50",
                                filter === v ? "bg-accent-soft text-ink-hi" : "text-ink-2 hover:bg-fg/[0.04] hover:text-ink")}>
                              <Icon className="size-3.5 shrink-0" style={{ color: VERDICT[v].color }} aria-hidden="true" />
                              <span className="flex-1">{VERDICT[v].short}</span>
                              <b className="font-medium tabular-nums text-ink-hi">{counts[v]}</b>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </CardContent>
                  {counts.conflict > 0 && (
                    <CardFooter className="text-[12.5px] text-ink-2">
                      <Unlink className="size-3.5 text-danger" aria-hidden="true" />
                      {counts.conflict} conflict{counts.conflict > 1 ? "s" : ""} for an owner to resolve. Either record may be the authoritative one.
                    </CardFooter>
                  )}
                </Card>
              )}
              <Card>
                <CardHeader><CardTitle icon={ScanSearch}>How a verdict is reached</CardTitle></CardHeader>
                <CardContent>
                  <ol className="flex flex-col gap-3 text-[13px] leading-relaxed text-ink-2">
                    <Step n={1} title="Extract" ai>The model copies each checkable claim word for word. A claim whose quote is not on its slide is dropped.</Step>
                    <Step n={2} title="Compare">Code matches the parameter and unit, finds the weekly reading within 7 days, and allows 10 % before calling a conflict. Units are never converted.</Step>
                    <Step n={3} title="Decide">A conflict is a question for an owner, not an error in the RCA. Either record may be the authoritative one.</Step>
                  </ol>
                </CardContent>
              </Card>
              {LIVE && (
                <Note>Conflicts found by a team member land in the conflict registry on the Problem Tank evidence view. Guest runs are stored as audits but never change the shared registry.</Note>
              )}
            </aside>
          </div>
        </>
      )}
    </>
  );
}

function FilterChip({ on, disabled, onClick, children }: { on: boolean; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" aria-pressed={on} disabled={disabled} onClick={onClick}
      className={cn("inline-flex h-7 items-center gap-1.5 rounded-full border px-3 text-[12.5px] transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-45 [&_b]:font-medium",
        on ? "border-line-hot bg-accent-soft text-ink-hi" : "border-line bg-fg/[0.02] text-ink-2 hover:border-line-strong hover:text-ink")}>
      {children}
    </button>
  );
}

function Step({ n, title, ai, children }: { n: number; title: string; ai?: boolean; children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className={cn("grid size-6 shrink-0 place-items-center rounded-full border text-[11.5px] font-medium tabular-nums",
        ai ? "border-[rgb(var(--ai-rgb)/0.45)] bg-ai-soft text-ai-ink" : "border-line-strong bg-fg/[0.03] text-ink-2")}>{n}</span>
      <div><b className="font-medium text-ink">{title}.</b> {children}{ai && <span className="ml-1 text-[11.5px] text-ai-ink">(model)</span>}</div>
    </li>
  );
}

function FindingRow({ f, source, tag }: { f: Finding; source: string; tag: string }) {
  const open = useDrawer();
  const [made, setMade] = useState<"idle" | "busy" | "done" | "error">("idle");
  const reading = f.refs[0];
  const followUp = async () => {
    setMade("busy");
    try {
      await createAction({ caseTag: tag, title: `Resolve: ${f.claim.parameter} (RCA slide ${f.claim.slide} vs condition record)`,
        sourceRefs: [`${source}:slide${f.claim.slide}`, ...f.refs], rationale: `RCA says: "${f.claim.quote}". Record: ${f.note}` });
      setMade("done");
    } catch { setMade("error"); }
  };
  const v = VERDICT[f.verdict];
  const Icon = v.icon;
  return (
    <div className={cn("h-full p-4", SURFACE[f.verdict])}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <b className="flex items-center gap-2 text-[14px] font-medium text-ink-hi">
          <Icon className={cn("size-4 shrink-0", f.verdict === "conflict" ? "text-danger" : f.verdict === "consistent" ? "text-ok" : "text-ink-3")} aria-hidden="true" />
          {f.claim.parameter}
        </b>
        <Badge tone={v.tone}>{v.label}</Badge>
      </div>
      <div className="mt-2.5 grid gap-2 md:grid-cols-2">
        <div className={cn("rounded-lg border px-3 py-2.5 text-[13px] leading-relaxed",
          f.verdict === "conflict" ? "border-[rgb(var(--danger-rgb)/0.3)] bg-danger-soft text-ink" : "border-line bg-[rgb(var(--well-rgb)/0.45)] text-ink-2")}>
          <span className={cn("mb-1 flex items-center gap-1.5 text-[11.5px] font-medium", f.verdict === "conflict" ? "text-danger-ink" : "text-ink-3")}>
            <span className="size-1.5 rounded-full bg-ai" aria-hidden="true" title="Extracted by the model" />
            RCA says · slide {f.claim.slide}
          </span>
          <q>{f.claim.quote}</q> <Cite id={`${source}:slide${f.claim.slide}`} />
        </div>
        <div className={cn("rounded-lg border px-3 py-2.5 text-[13px] leading-relaxed",
          f.verdict === "consistent" ? "border-[rgb(var(--ok-rgb)/0.28)] bg-ok-soft text-ink" : "border-line bg-[rgb(var(--well-rgb)/0.45)] text-ink-2")}>
          <span className={cn("mb-1 block text-[11.5px] font-medium", f.verdict === "consistent" ? "text-ok-ink" : "text-ink-3")}>Condition record</span>
          <span>{f.note}</span> {f.refs.map((r) => <Cite key={r} id={r} />)}
        </div>
      </div>
      {/* what to do about it: read both sources, take the conflict to its owner, track it, or ask */}
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
        <Button size="sm" variant="ghost" onClick={() => open({ kind: "evidence", id: `${source}:slide${f.claim.slide}` })}><FileText aria-hidden="true" />Slide {f.claim.slide}</Button>
        {reading && <Button size="sm" variant="ghost" onClick={() => open({ kind: "evidence", id: reading })}><Activity aria-hidden="true" />Reading</Button>}
        <span className="flex-1" />
        {f.verdict === "conflict" && <Button size="sm" onClick={() => go("queue", tag, { view: "evidence" })}><Unlink aria-hidden="true" />Conflict registry</Button>}
        {made === "done" ? <Button size="sm" variant="primary" onClick={() => go("actions", tag, { tab: "tracked" })}>Task created · open<ArrowRight aria-hidden="true" /></Button>
          : <Button size="sm" disabled={made === "busy"} onClick={followUp}><ClipboardPlus aria-hidden="true" />{made === "error" ? "Retry task" : "Follow-up task"}</Button>}
        <Button size="sm" variant="ghost" aria-label="Ask the copilot about this claim" title="Ask the copilot"
          onClick={() => openCopilot(`The RCA (slide ${f.claim.slide}) says "${f.claim.quote}". The condition record says: ${f.note} Which should an owner treat as authoritative, and what would settle it?`)}><MessageSquareText aria-hidden="true" /></Button>
      </div>
    </div>
  );
}

/** Offline: the auditor cannot run, so show the hand-found conflicts it is measured against. */
function OfflineAudit({ tag }: { tag: string }) {
  const curated = EMAP.case === tag;
  const conflicts = EMAP.conflicts.filter((c) => c.severity === "decision");
  return (
    <Card>
      <CardHeader action={curated ? <Badge tone="danger" dot>{conflicts.length} decision conflicts</Badge> : undefined}>
        <CardTitle icon={FileSearch}>{curated ? <>Hand-found conflicts on {tag}</> : "No offline baseline"}</CardTitle>
        <CardDescription>
          {curated ? "Found by the team before the auditor existed. The auditor's eval counts how many of the first five it finds on its own (target 5 of 5)." : `No hand review exists for ${tag}, so there is no baseline to show. Open KO-3201 for the reviewed case.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Note tone="warn">The auditor calls the AI model, so it runs only in the hosted version. This offline demo shows the baseline it is evaluated against.</Note>
        {curated && (
          <Coverflow label="Hand-found conflicts" cardWidth="min(620px, 84vw)"  items={conflicts.map((c) => ({ key: c.id, label: c.topic, node: (
              <ConflictCard c={c} tag={tag} />
            ) }))} />
        )}
      </CardContent>
    </Card>
  );
}

/** A hand-found conflict with what to do about it: read both sources, take it to its owner, track it, or ask. */
function ConflictCard({ c, tag }: { c: (typeof EMAP.conflicts)[number]; tag: string }) {
  const open = useDrawer();
  const [made, setMade] = useState<"idle" | "busy" | "done" | "error">("idle");
  const followUp = async () => {
    setMade("busy");
    try {
      await createAction({ caseTag: tag, title: `Resolve conflict ${c.id}: ${c.topic}`, sourceRefs: [c.a.evidence, c.b.evidence],
        rationale: `Source A: ${c.a.says}. Source B: ${c.b.says}.` });
      setMade("done");
    } catch { setMade("error"); }
  };
  return (
    <div className={cn("h-full p-4", SURFACE.conflict)}>
      <div className="flex flex-wrap items-center gap-2">
        <TriangleAlert className="size-4 text-danger" aria-hidden="true" />
        <b className="text-[14px] font-medium text-ink-hi">{c.topic}</b>
        <Cite id={c.id} />
      </div>
      <div className="mt-2.5 grid gap-2 md:grid-cols-2">
        {([["Source A", c.a], ["Source B", c.b]] as const).map(([label, src]) => (
          <div key={label} className="rounded-lg border border-line bg-[rgb(var(--well-rgb)/0.45)] px-3 py-2.5 text-[13px] leading-relaxed text-ink-2">
            <span className="mb-1 block text-[11.5px] font-medium text-ink-3">{label}</span>
            {src.says} <Cite id={src.evidence} />
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
        <Button size="sm" variant="ghost" onClick={() => open({ kind: "evidence", id: c.a.evidence })}><FileText aria-hidden="true" />Source A</Button>
        <Button size="sm" variant="ghost" onClick={() => open({ kind: "evidence", id: c.b.evidence })}><FileText aria-hidden="true" />Source B</Button>
        <span className="flex-1" />
        <Button size="sm" onClick={() => go("queue", tag, { view: "evidence" })}><Unlink aria-hidden="true" />Conflict registry</Button>
        {made === "done" ? <Button size="sm" variant="primary" onClick={() => go("actions", tag, { tab: "tracked" })}>Task created · open<ArrowRight aria-hidden="true" /></Button>
          : <Button size="sm" disabled={made === "busy"} onClick={followUp}><ClipboardPlus aria-hidden="true" />{made === "error" ? "Retry task" : "Follow-up task"}</Button>}
        <Button size="sm" variant="ghost" aria-label="Ask the copilot about this conflict" title="Ask the copilot"
          onClick={() => openCopilot(`Two sources disagree on ${c.topic}: "${c.a.says}" versus "${c.b.says}". What would settle which one is authoritative?`)}><MessageSquareText aria-hidden="true" /></Button>
      </div>
    </div>
  );
}
