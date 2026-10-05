// Side column of the Actions page: the cross-case manager view (with the SAP PM export) and the review log.
import { useState } from "react";
import { Download, ScrollText, Users } from "lucide-react";
import { REVIEW_DATE, SNAP } from "../../domain/data";
import { actionDue } from "../../domain/queue";
import { getState, nowIso, useDemo } from "../../domain/store";
import { download } from "../../lib/api";
import { LIVE } from "../../lib/supabase";
import { errorText } from "../../lib/live";
import { STATE_LABEL } from "../../domain/actionTransitions";
import { go } from "../../App";
import { Note } from "../../components/ui";
import { TagChip } from "@/components/shell/Shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ManagerView({ tag }: { tag: string }) {
  const demo = useDemo();
  const rows = SNAP.rca.map((r) => {
    const all = [...r.actions, ...r.preventive];
    const sims = demo.actions.filter((a) => a.caseTag === r.tag);
    return {
      tag: r.tag,
      passed: all.filter((a) => ["plan_passed", "no_status_plan_passed"].includes(actionDue(a, REVIEW_DATE))).length,
      total: all.length,
      pending: sims.filter((a) => a.state === "ready_for_verification").length,
      verified: sims.filter((a) => a.state === "verified").length,
      open: sims.filter((a) => !["verified"].includes(a.state)).length,
      owners: [...new Set(sims.map((a) => a.owner).filter(Boolean))],
      deps: [...new Set(sims.map((a) => a.dependency).filter((d) => d && d.toLowerCase() !== "none"))],
    };
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle icon={Users}>Manager view</CardTitle>
        <CardDescription>Every case at a glance. Click one to open it.</CardDescription>
      </CardHeader>
      <CardContent className="pt-3">
        <div className="grid grid-cols-[minmax(0,1fr)_repeat(4,auto)] gap-x-3 border-b border-line pb-1.5 text-[11.5px] text-ink-3">
          <span>Case</span>
          <span className="text-right" title="Source RCA actions whose plan date passed without a Closed status">Past plan</span>
          <span className="text-right">{LIVE ? "Open" : "Sim. open"}</span>
          <span className="text-right" title="Awaiting review">Review</span>
          <span className="text-right">Verified</span>
        </div>
        <ul>
          {rows.map((r) => {
            const here = r.tag === tag;
            return (
              <li key={r.tag}>
                <button type="button" onClick={() => go("actions", r.tag)} aria-current={here ? "page" : undefined}
                  className={cn("grid w-full grid-cols-[minmax(0,1fr)_repeat(4,auto)] items-start gap-x-3 rounded-md px-1 py-2 text-left text-[13px] transition-colors duration-150 hover:bg-fg/[0.04]",
                    here && "bg-accent-soft ring-1 ring-line-hot hover:bg-accent-soft")}>
                  <span className="min-w-0">
                    <TagChip tag={r.tag} />
                    {r.owners.length > 0 && <span className="mt-1 block truncate text-[12px] text-ink-3">Owners: {r.owners.join(", ")}</span>}
                    {r.deps.length > 0 && <span className="block truncate text-[12px] text-ink-3">Depends on: {r.deps.join(", ")}</span>}
                  </span>
                  <span className={cn("text-right tabular-nums", r.passed ? "font-medium text-danger-ink" : "text-ink-2")}>{r.passed} / {r.total}</span>
                  <span className="text-right tabular-nums text-ink-2">{r.open}</span>
                  <span className={cn("text-right tabular-nums", r.pending ? "text-caution-ink" : "text-ink-2")}>{r.pending}</span>
                  <span className={cn("text-right tabular-nums", r.verified ? "text-ok-ink" : "text-ink-2")}>{r.verified}</span>
                </button>
              </li>
            );
          })}
        </ul>
        {LIVE && <SapExport />}
      </CardContent>
    </Card>
  );
}

function SapExport() {
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="mt-3 border-t border-line pt-3">
      <Button size="sm" disabled={busy} onClick={async () => {
        setBusy(true); setErr("");
        try { await download("/api/export/sap-pm", "plantpulse-sap-pm.csv"); } catch (e) { setErr(errorText(e, "Export failed.")); } finally { setBusy(false); }
      }}><Download className="size-3.5" aria-hidden="true" /> {busy ? "Exporting…" : "Export assigned actions for SAP PM"}</Button>
      <p className="mt-1.5 text-[12px] text-ink-3">A CSV of PM notifications for a planner to import (IW21). PlantPulse never posts to SAP.</p>
      {err && <Note tone="danger">{err}</Note>}
    </div>
  );
}

export function ReviewLog() {
  const demo = useDemo();
  const entries = [
    ...demo.events.map((e) => ({ at: e.at, actor: e.actor, subject: e.subject, decision: e.decision, reason: e.reason })),
    ...demo.actions.flatMap((a) => a.log.map((l) => ({ at: l.at, actor: l.actor, subject: `${a.id} ${a.title.slice(0, 48)}`, decision: l.from ? `${STATE_LABEL[l.from]} → ${l.decision}` : l.decision, reason: l.reason }))),
  ].sort((a, b) => b.at.localeCompare(a.at));
  const exportLog = () => {
    const blob = new Blob([JSON.stringify({ exported_at: nowIso(), note: "Simulated prototype state; not a tamper-proof audit log.", state: getState() }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = "plantpulse-demo-log.json"; link.click();
    URL.revokeObjectURL(url);
  };
  return (
    <Card>
      <CardHeader action={<Button size="sm" onClick={exportLog} disabled={!entries.length}><Download className="size-3.5" aria-hidden="true" /> Export</Button>}>
        <CardTitle icon={ScrollText}>Review log</CardTitle>
        <CardDescription>Every state change and review decision, newest first.</CardDescription>
      </CardHeader>
      <CardContent className="pt-3">
        {entries.length === 0
          ? <p className="text-[13px] text-ink-3">No decisions yet. Each state change, review decision and conflict decision is appended here, never overwritten.</p>
          : (
            <ol className="relative max-h-[420px] overflow-auto pl-4">
              <span className="absolute bottom-1 left-[3px] top-1 w-px bg-line" aria-hidden="true" />
              {entries.map((e, i) => (
                <li key={i} className="relative pb-3 last:pb-0">
                  <span className={cn("absolute -left-4 top-1.5 size-[7px] rounded-full ring-2 ring-panel", i === 0 ? "bg-accent" : "bg-ink-3")} aria-hidden="true" />
                  <div className="flex items-baseline justify-between gap-2 text-[13px]"><b className="font-medium text-ink-hi">{e.decision}</b><span className="shrink-0 text-[11.5px] tabular-nums text-ink-3">{e.at.slice(5, 16).replace("T", " ")}</span></div>
                  <div className="text-[12px] text-ink-2">{e.subject}</div>
                  {e.reason && <div className="text-[12px] text-ink-3">“{e.reason}” — {e.actor}</div>}
                </li>
              ))}
            </ol>
          )}
        <div className="mt-3">
          {LIVE
            ? <Note>Server log: append-only and hash-chained, so any edit to a past entry breaks the chain (<span className="mono">select verify_review_chain()</span> returns the first broken entry).</Note>
            : <Note tone="sim">Browser-local demo log. The hosted version keeps an append-only, hash-chained log on the server with role-based reviewer authority.</Note>}
        </div>
      </CardContent>
    </Card>
  );
}
