// One tracked (live) or simulated (offline) action: who owns it, when it is due, which evidence the rule still
// needs, and a closure gate that stays shut until the evidence and an independent reviewer are in place.
import { useState } from "react";
import { CircleCheck, CircleDashed, CircleSlash, FileText, Lock, LockOpen, Paperclip, ShieldCheck, TriangleAlert, UserRoundCheck } from "lucide-react";
import { fmtDate } from "../../domain/kpis";
import { DEMO_USER, nowIso, refreshActions, update } from "../../domain/store";
import { api, authHeaders } from "../../lib/api";
import { LIVE } from "../../lib/supabase";
import { errorText } from "../../lib/live";
import EvidenceUpload from "../../components/EvidenceUpload";
import {
  EVIDENCE_KIND_LABEL, STATE_LABEL, STATES, closureCheck, guard, ruleCheck, transition,
  type ActionState, type EvidenceKind, type SimAction,
} from "../../domain/actionTransitions";
import { Cite } from "../../components/ui";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DueMeter, OwnerChip } from "./due";

const NEXT: Partial<Record<ActionState, { to: ActionState; label: string }[]>> = {
  draft: [{ to: "reviewed", label: "Mark reviewed" }],
  reviewed: [{ to: "assigned", label: "Assign" }],
  assigned: [{ to: "in_progress", label: "Start work" }],
  in_progress: [{ to: "execution_reported", label: "Report execution" }],
  execution_reported: [{ to: "evidence_submitted", label: "Submit evidence" }],
  evidence_submitted: [{ to: "ready_for_verification", label: "Send for verification" }, { to: "rework", label: "Send back for rework" }],
  ready_for_verification: [{ to: "verified", label: "Verify (reviewer)" }, { to: "rework", label: "Reject → rework" }],
  rework: [{ to: "in_progress", label: "Restart work" }],
};

const LIFECYCLE = STATES.filter((s) => s !== "rework");

function save(a: SimAction) {
  update((s) => ({ ...s, actions: s.actions.map((x) => (x.id === a.id ? a : x)) }));
}

export default function ActionCard({ a }: { a: SimAction }) {
  const [hold, setHold] = useState<string[] | null>(null);
  const [reason, setReason] = useState("");
  const [ev, setEv] = useState<{ kind: EvidenceKind; dated: string; label: string }>({ kind: "installation_record", dated: "", label: "" });
  const editable = ["draft", "reviewed", "rework"].includes(a.state);
  const set = (patch: Partial<SimAction>) => save({ ...a, ...patch });
  const [saving, setSaving] = useState(false);
  const go2 = async (to: ActionState) => {
    if (to === "rework" && !reason.trim()) { setHold(["Write the rework reason: what evidence is missing or contradicts the rule."]); return; }
    if (!LIVE) {
      const g = guard(a, to);
      if (!g.ok) { setHold(g.unmet); return; }
      setHold(null);
      save(transition(a, to, to === "verified" ? a.reviewer : DEMO_USER, reason, nowIso()));
      setReason("");
      return;
    }
    // Live: the server runs the same guard and is the only place a transition can happen.
    setSaving(true);
    try {
      const r = await fetch("/api/actions/transition", { method: "POST", headers: { "content-type": "application/json", ...(await authHeaders()) },
        body: JSON.stringify({ actionId: a.id, to, reason, patch: { owner: a.owner, due: a.due, scope: a.scope, dependency: a.dependency,
          rationale: a.rationale, executionNote: a.executionNote, reviewer: a.reviewer, effectivenessResult: a.effectivenessResult } }) });
      const body = await r.json().catch(() => ({}));
      if (r.status === 422) { setHold(body.unmet); return; }
      if (!r.ok) { setHold([body.error ?? "The change was not saved."]); return; }
      setHold(null); setReason(""); await refreshActions(a.caseTag);
    } catch { setHold(["Network error: the change was not saved."]); }
    finally { setSaving(false); }
  };
  const attach = async () => {
    const item = { kind: ev.kind, label: ev.label || EVIDENCE_KIND_LABEL[ev.kind], dated: ev.dated };
    if (!LIVE) {
      set({ evidence: [...a.evidence, { id: "DOC-" + (a.log.length + a.evidence.length + 1), ...item, ref: a.id, simulated: true, addedAt: nowIso() }] });
    } else {
      try { await api("/api/evidence/add", { body: { actionId: a.id, ...item } }); await refreshActions(a.caseTag); }
      catch (e) { setHold([errorText(e, "The evidence was not saved.")]); return; }
    }
    setEv({ ...ev, label: "", dated: "" });
  };
  const remove = async (e: SimAction["evidence"][number]) => {
    if (!LIVE) {
      set({ evidence: a.evidence.filter((x) => x.id !== e.id), log: [...a.log, { at: nowIso(), actor: DEMO_USER, from: a.state, to: a.state, decision: "Evidence removed", reason: e.label, evidenceRefs: [e.id] }] });
      return;
    }
    const why = window.prompt(`Why remove "${e.label}"? (recorded in the review log)`);
    if (!why || why.trim().length < 3) return;
    try { await api("/api/evidence/remove", { body: { actionId: a.id, evidenceId: e.id, reason: why } }); await refreshActions(a.caseTag); }
    catch (err) { setHold([errorText(err, "The evidence was not removed.")]); }
  };

  const rc = ruleCheck(a);
  const stepIdx = STATES.indexOf(a.state);
  const verified = a.state === "verified";
  const rework = a.state === "rework";
  const evidenceStage = ["execution_reported", "evidence_submitted"].includes(a.state);
  const req = a.rule.required.length;
  const have = req - rc.missing.length;
  const effectivenessOpen = a.rule.effectivenessRequired && !a.effectivenessResult.trim();
  const gate: "open" | "review" | "blocked" = verified ? "open" : rc.satisfied && !rc.irrelevant.length ? "review" : "blocked";
  const lip = verified ? "bg-ok" : rework || hold ? "bg-danger" : a.state === "ready_for_verification" ? "bg-caution" : LIVE ? "bg-accent" : "bg-ink-3";

  return (
    <Card as="article" aria-label={`Simulated action ${a.id}`} className="overflow-hidden">
      {/* Band: hatched when simulated, lit lip carries the state colour. */}
      <div className={cn("relative flex h-8 items-center justify-between gap-3 border-b border-line px-5 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-2",
        LIVE ? "bg-fg/[0.03]" : "bg-[image:var(--hatch)]")}>
        <span className={cn("absolute inset-x-0 top-0 h-0.5", lip)} aria-hidden="true" />
        <span className="truncate">{LIVE ? "Action" : "Simulation"} · {STATE_LABEL[a.state]}</span>
        <span className="shrink-0">{LIVE ? a.id.slice(0, 8).toUpperCase() : a.id}</span>
      </div>

      <div className="px-5 pb-5 pt-4">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
          <div className="min-w-0 flex-1">
            <h3 className="text-[15.5px] font-semibold leading-snug tracking-[-0.01em] text-ink-hi">{a.title}</h3>
            <div className="mt-1 text-[12.5px] text-ink-3">Source: {a.sourceActionRef ?? "new"} {a.sourceRefs.map((r) => <Cite key={r} id={r} />)}</div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-1.5">
            {!LIVE && <Badge tone="sim">Simulated</Badge>}
            {verified ? <Badge tone="ok" dot>Verified</Badge>
              : hold ? <Badge tone="danger" dot pulse>On hold</Badge>
                : rework ? <Badge tone="danger" dot>Rework</Badge>
                  : <Badge tone="accent" dot>{STATE_LABEL[a.state]}</Badge>}
          </div>
        </div>

        {/* Who / when / what's missing, the three things a planner scans for first. */}
        <div className="mt-4 grid gap-4 rounded-lg border border-line bg-fg/[0.02] p-3 sm:grid-cols-3">
          <OwnerChip owner={a.owner} role={a.ownerRole} />
          <DueMeter due={a.due} />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[12px] text-ink-3"><Paperclip className="size-3.5" aria-hidden="true" />Required evidence</div>
            <div className="mt-1.5 flex gap-1" aria-hidden="true">
              {a.rule.required.map((k) => <span key={k} className={cn("h-1.5 flex-1 rounded-full", rc.missing.includes(k) ? "bg-danger/70" : "bg-ok")} />)}
            </div>
            <div className={cn("mt-1 text-[12.5px] font-medium tabular-nums", rc.missing.length ? "text-danger-ink" : "text-ok-ink")}>
              {have} of {req} attached{rc.missing.length ? ` · ${rc.missing.length} missing` : ""}
            </div>
          </div>
        </div>

        {/* Lifecycle: done segments lit green, current blue; rework resets the run. */}
        <div className="mt-4">
          <div className="flex items-center justify-between gap-3 text-[12px]">
            <span className="text-ink-3">{rework ? "Sent back for rework" : <>Step {stepIdx + 1} of {LIFECYCLE.length} · <span className="text-ink-hi">{STATE_LABEL[a.state]}</span></>}</span>
            {(NEXT[a.state] ?? [])[0] && <span className="text-ink-3">Next: <span className="text-accent-ink">{NEXT[a.state]![0].label}</span></span>}
          </div>
          <ol className="mt-1.5 flex gap-1" aria-label="Action lifecycle">
            {LIFECYCLE.map((s, i) => {
              const done = !rework && i < stepIdx;
              const now = s === a.state;
              return (
                <li key={s} title={STATE_LABEL[s]} aria-current={now ? "step" : undefined} className="min-w-0 flex-1">
                  <span className={cn("block h-1.5 rounded-full", now ? (verified ? "bg-ok" : "bg-accent shadow-[0_0_8px_rgb(var(--accent-rgb)/0.6)]") : done ? "bg-ok/80" : rework ? "bg-danger/25" : "bg-fg/[0.07]")} />
                  <span className="sr-only">{STATE_LABEL[s]}{done ? " (done)" : now ? " (current)" : ""}</span>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          {/* Plan */}
          <details className="group min-w-0" open={editable}>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-[13px] font-semibold text-ink-hi marker:hidden">
              <span>Plan {editable ? "" : <span className="font-normal text-ink-3">· locked after review</span>}</span>
              <span className="text-[12px] font-normal text-accent-ink group-open:hidden">Show</span>
            </summary>
            <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
              <label className="field"><span>Owner</span><input className="input" disabled={!editable} value={a.owner} onChange={(e) => set({ owner: e.target.value })} placeholder={a.ownerRole || "Name or role"} /></label>
              <label className="field"><span>Due date (demo input)</span><input type="date" className="input" disabled={!editable} value={a.due} onChange={(e) => set({ due: e.target.value })} /></label>
              <label className="field"><span>Scope</span><input className="input" disabled={!editable} value={a.scope} onChange={(e) => set({ scope: e.target.value })} /></label>
              <label className="field"><span>Dependencies</span><input className="input" disabled={!editable} value={a.dependency} onChange={(e) => set({ dependency: e.target.value })} placeholder="e.g. TA window, vendor; or “none”" /></label>
            </div>
            <label className="field mt-2.5"><span>Rationale</span><textarea className="input" disabled={!editable} value={a.rationale} onChange={(e) => set({ rationale: e.target.value })} /></label>
            {["in_progress", "rework"].includes(a.state) && (
              <label className="field mt-2.5"><span>Execution note</span><input className="input" value={a.executionNote} onChange={(e) => set({ executionNote: e.target.value })} placeholder="What was done and when" /></label>
            )}
          </details>

          {/* Evidence checklist */}
          <div className="min-w-0">
            <h4 className="flex items-center gap-2 text-[13px] font-semibold text-ink-hi"><ShieldCheck className="size-4 text-ink-3" aria-hidden="true" />Evidence needed to close</h4>
            <ul className="mt-2.5 space-y-1.5">
              {a.rule.required.map((k) => {
                const missing = rc.missing.includes(k);
                const items = a.evidence.filter((e) => e.kind === k);
                return (
                  <li key={k} className={cn("flex items-start gap-2.5 rounded-lg border px-3 py-2 text-[13px]",
                    missing ? "border-danger/35 bg-danger-soft" : "border-ok/30 bg-ok-soft")}>
                    {missing ? <CircleDashed className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden="true" /> : <CircleCheck className="mt-0.5 size-4 shrink-0 text-ok" aria-hidden="true" />}
                    <div className="min-w-0 flex-1">
                      <div className="text-ink">{EVIDENCE_KIND_LABEL[k]}</div>
                      {!missing && <div className="text-[12px] text-ink-3">{items.map((e) => `${e.simulated ? e.id : e.label}${e.dated ? " · " + fmtDate(e.dated) : ""}`).join("; ")}</div>}
                    </div>
                    <span className={cn("shrink-0 text-[11.5px] font-semibold uppercase tracking-[0.06em]", missing ? "text-danger-ink" : "text-ok-ink")}>{missing ? "missing" : "attached"}</span>
                  </li>
                );
              })}
              {a.rule.effectivenessRequired && (
                <li className={cn("flex items-start gap-2.5 rounded-lg border px-3 py-2 text-[13px]", effectivenessOpen ? "border-caution/35 bg-caution-soft" : "border-ok/30 bg-ok-soft")}>
                  {effectivenessOpen ? <CircleDashed className="mt-0.5 size-4 shrink-0 text-caution" aria-hidden="true" /> : <CircleCheck className="mt-0.5 size-4 shrink-0 text-ok" aria-hidden="true" />}
                  <div className="min-w-0 flex-1"><div className="text-ink">Effectiveness observation</div><div className="text-[12px] text-ink-3">{a.rule.effectivenessCriteria}</div></div>
                  <span className={cn("shrink-0 text-[11.5px] font-semibold uppercase tracking-[0.06em]", effectivenessOpen ? "text-caution-ink" : "text-ok-ink")}>{effectivenessOpen ? "not recorded" : "recorded"}</span>
                </li>
              )}
            </ul>
            {Object.keys(a.rule.notSufficient).length > 0 && (
              <div className="mt-3">
                <div className="text-[12px] font-medium text-ink-3">Does not count toward closure</div>
                <ul className="mt-1 space-y-1">
                  {Object.entries(a.rule.notSufficient).map(([k, why]) => (
                    <li key={k} className="flex items-start gap-2 text-[12px] text-ink-3">
                      <CircleSlash className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                      <span><span className="text-ink-2">{EVIDENCE_KIND_LABEL[k as EvidenceKind]}</span> — {why}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {evidenceStage && (
              <div className="mt-4 rounded-lg border border-line bg-fg/[0.02] p-3">
                {LIVE && <EvidenceUpload action={a} onDone={() => refreshActions(a.caseTag)} />}
                <div className={cn("text-[12.5px] font-medium text-ink-2", LIVE && "mt-3")}>{LIVE ? "Or record a document reference" : "Attach evidence (simulated documents)"}</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <select className="input min-w-0 flex-[1_1_200px]" value={ev.kind} onChange={(e) => setEv({ ...ev, kind: e.target.value as EvidenceKind })} aria-label="Evidence type">
                    {(Object.keys(EVIDENCE_KIND_LABEL) as EvidenceKind[]).map((k) => <option key={k} value={k}>{EVIDENCE_KIND_LABEL[k]}</option>)}
                  </select>
                  <input type="date" className="input min-w-0 flex-[1_1_140px]" value={ev.dated} onChange={(e) => setEv({ ...ev, dated: e.target.value })} aria-label="Evidence date" />
                  {LIVE && <input className="input min-w-0 flex-[1_1_200px]" value={ev.label} onChange={(e) => setEv({ ...ev, label: e.target.value })} placeholder="Document number or title" aria-label="Document reference" />}
                  <Button size="sm" disabled={!ev.dated} title={ev.dated ? "" : "Every evidence item needs a document date"} onClick={attach}>Attach</Button>
                </div>
              </div>
            )}

            {a.evidence.length > 0 && (
              <ul className="mt-3 divide-y divide-line rounded-lg border border-line">
                {a.evidence.map((e) => (
                  <li key={e.id} className="px-3 py-2 text-[12.5px]">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {e.simulated ? <Badge tone="sim">Simulated</Badge> : e.file ? <span className="badge b-observed">File{e.aiCheck ? " · AI-read" : ""}</span> : <Badge>Reference</Badge>}
                      <FileText className="size-3.5 text-ink-3" aria-hidden="true" />
                      <span className="min-w-0 text-ink">{e.simulated ? e.id : EVIDENCE_KIND_LABEL[e.kind]} · {e.label} · {e.dated ? fmtDate(e.dated) : <span className="text-danger-ink">undated</span>}</span>
                      {a.rule.notSufficient[e.kind] && <Badge tone="danger">does not satisfy rule</Badge>}
                      <span className="flex-1" />
                      {evidenceStage && <Button variant="ghost" size="sm" onClick={() => remove(e)}>Remove</Button>}
                    </div>
                    {!!e.aiCheck?.warnings.length && <ul className="mt-1 list-disc pl-5 text-[12px] text-caution-ink">{e.aiCheck.warnings.map((w) => <li key={w}>{w}</li>)}</ul>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {a.state === "ready_for_verification" && (
          <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
            {LIVE ? (
              <label className="field"><span>Reviewer</span>
                <input className="input" value={a.reviewer} onChange={(e) => set({ reviewer: e.target.value })} placeholder="Must not be the owner" />
                <span className="text-[12px] text-ink-3">A team reviewer signs with their own account when verifying; this name is used only in a guest sandbox.</span></label>
            ) : <label className="field"><span>Reviewer (must not be the owner)</span><input className="input" value={a.reviewer} onChange={(e) => set({ reviewer: e.target.value })} /></label>}
            {a.rule.effectivenessRequired && <label className="field"><span>Effectiveness observation</span><input className="input" value={a.effectivenessResult} onChange={(e) => set({ effectivenessResult: e.target.value })} placeholder="Period, criteria, result" /></label>}
          </div>
        )}
        {["evidence_submitted", "ready_for_verification"].includes(a.state) && (
          <label className="field mt-2.5"><span>Reason (required for rework)</span><input className="input" value={reason} onChange={(e) => setReason(e.target.value)} /></label>
        )}

        {/* Closure gate: shut (danger) until the rule is satisfied, then waits for an independent reviewer. */}
        <div className={cn("mt-5 rounded-xl border p-3.5",
          gate === "open" ? "border-ok/35 bg-ok-soft" : gate === "review" ? "border-caution/35 bg-caution-soft" : "border-danger/40 bg-danger-soft")}>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {gate === "open" ? <LockOpen className="size-4 text-ok" aria-hidden="true" /> : gate === "review" ? <UserRoundCheck className="size-4 text-caution" aria-hidden="true" /> : <Lock className="size-4 text-danger" aria-hidden="true" />}
            <span className={cn("text-[13.5px] font-semibold", gate === "open" ? "text-ok-ink" : gate === "review" ? "text-caution-ink" : "text-danger-ink")}>
              {gate === "open" ? "Closed with evidence · verified by a reviewer"
                : gate === "review" ? "Evidence complete · closure waits for an independent reviewer"
                  : `Closure blocked${rc.missing.length ? ` · ${rc.missing.length} required evidence item${rc.missing.length === 1 ? "" : "s"} missing` : rc.irrelevant.length ? " · attached evidence does not satisfy the rule" : " · evidence is undated"}`}
            </span>
          </div>
          <div className="mt-1 text-[12px] text-ink-3">Reviewer: <span className="text-ink-2">{a.reviewer || "not named"}</span> · {a.log.length} log entr{a.log.length === 1 ? "y" : "ies"}</div>

          {hold && (
            <div className="note danger mt-3" role="alert">
              <TriangleAlert />
              <div><b>Not allowed yet.</b><ul className="mt-1 list-disc pl-5">{hold.map((u) => <li key={u}>{u}</li>)}</ul></div>
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {(NEXT[a.state] ?? []).map((n) => (
              <Button key={n.to} size="sm" variant={n.to === "rework" ? "danger" : "primary"} disabled={saving} onClick={() => go2(n.to)}>{n.label}</Button>
            ))}
            {!verified && <Button size="sm" onClick={() => setHold(closureCheck(a).unmet)}>Mark complete now</Button>}
            <span className="flex-1" />
            {!LIVE && <Button variant="ghost" size="sm" onClick={() => { if (confirm("Delete this simulated action?")) update((s) => ({ ...s, actions: s.actions.filter((x) => x.id !== a.id) })); }}>Delete</Button>}
          </div>
        </div>
      </div>
    </Card>
  );
}
