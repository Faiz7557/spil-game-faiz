import { useMemo, useState } from "react";
import { CalendarClock, ClipboardList, FileClock, Search, Sparkles, TimerOff, Users } from "lucide-react";
import { REVIEW_DATE, SNAP } from "../domain/data";
import { fmtDate } from "../domain/kpis";
import { buildTank, type TankItem } from "../domain/tank";
import { similarCandidates } from "../domain/similar";
import type { RcaDraft } from "../domain/rcaDraftTypes";
import { api } from "../lib/api";
import { LIVE } from "../lib/supabase";
import { errorText, useLoad } from "../lib/live";
import { hashQuery } from "../App";
import { Cite, Empty, Note, useDrawer } from "../components/ui";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatTile } from "@/components/ui/stat-tile";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BorderBeam } from "@/components/ui/border-beam";
import { TagChip } from "@/components/shell/Shell";
import { cn } from "@/lib/utils";
import { SectionTabs, openSectionTab, type SectionTab } from "@/components/ui/section-tabs";

interface StoredDraft { id: string; incident_id: string; draft: RcaDraft; status: "draft" | "accepted" | "rejected" }

/** Overdue rows with a long tail get a pulsing dot; the meter length carries the rest. A visual cue, not a rule. */
const LONG_OVERDUE_DAYS = 90;
const median = (xs: number[]) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b), m = s.length >> 1;
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
};

export default function Backlog() {
  const tank = useMemo(() => buildTank(SNAP.incidents, SNAP.meta.open_statuses, REVIEW_DATE, new Set(SNAP.equipment.map((e) => e.linked_incident!)))
    .filter((t) => t.rcaDuePassed && !t.detailed), []);
  const [sel, setSel] = useState(() => hashQuery().get("inc") ?? tank[0]?.incident.id);
  const [q, setQ] = useState("");
  const stored = useLoad(async () => {
    const rows = await api<StoredDraft[]>("/api/rca/draft");
    return Object.fromEntries(rows.map((d) => [d.incident_id, d])) as Record<string, StoredDraft>;
  }, [], LIVE);
  const drafts = stored.data ?? {};
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const item = tank.find((t) => t.incident.id === sel);
  const d = sel ? drafts[sel] : undefined;
  const list = tank.filter((t) => !q || `${t.incident.tag} ${t.incident.plant} ${t.incident.title} ${t.incident.component}`.toLowerCase().includes(q.toLowerCase()));
  const draftCount = Object.keys(drafts).length;

  const days = tank.map((t) => t.daysPastDue ?? 0);
  const maxDays = Math.max(1, ...days);
  const longCount = days.filter((n) => n >= LONG_OVERDUE_DAYS).length;
  const pics = new Set(tank.map((t) => t.incident.pic_rca)).size;

  const generate = async () => {
    if (!sel) return;
    setBusy(true); setErr("");
    try {
      const r = await api<{ id: string; draft: RcaDraft; status: "draft" }>("/api/rca/draft", { body: { incidentId: sel } });
      stored.set({ ...drafts, [sel]: { id: r.id, incident_id: sel, draft: r.draft, status: r.status } });
    } catch (e) { setErr(errorText(e, "Draft failed.")); } finally { setBusy(false); }
  };

  return (
    <>
      <PageHeader
        title="RCA backlog"
        badges={<Badge tone="accent">KQ3</Badge>}
        description={<>{tank.length} open records are past their RCA due date with no RCA package. Each gets a 4P / 4M+1E starter that lists what to check, never a root cause.</>}
      />

      <div className="tw mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Past RCA due, no RCA package" icon={FileClock} value={tank.length} tone={tank.length ? "danger" : undefined}
          context={<>Open register records on {fmtDate(REVIEW_DATE)}</>} />
        <StatTile accent="var(--series-1)" label="Median days past due" icon={CalendarClock} value={<>{median(days)}<span className="text-[16px] font-medium text-ink-3"> d</span></>}
          context={<>Longest: {maxDays} days past the recorded RCA due date</>} />
        <StatTile label={`${LONG_OVERDUE_DAYS}+ days past due`} icon={TimerOff} value={longCount} tone={longCount ? "danger" : undefined}
          context={<>of {tank.length} overdue records</>} />
        {LIVE ? (
          <StatTile accent="var(--series-2)" label="RCA starters drafted" icon={Sparkles} value={stored.status === "loading" ? "…" : draftCount}
            context={<>Across {pics} RCA owners (PIC) named in the register</>} />
        ) : (
          <StatTile accent="var(--series-3)" label="RCA owners (PIC) involved" icon={Users} value={pics}
            context="Named in the register's PIC (RCA) column" />
        )}
      </div>

      <div className="tw grid gap-4 lg:grid-cols-[minmax(300px,380px)_minmax(0,1fr)]">
        <Card className="flex min-w-0 flex-col lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:self-start">
          <div className="px-4 pt-4">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-ink-3" aria-hidden="true" />
              <input className="input" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by tag, plant, component" aria-label="Filter records" style={{ width: "100%", paddingLeft: 32 }} />
            </label>
            <p className="mt-2 flex items-center justify-between text-[12px] text-ink-3">
              <span>{list.length} records{LIVE ? ` · ${draftCount} with a draft` : ""}</span>
              <span>Days past due</span>
            </p>
          </div>
          <ul className="mt-1 flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-2 pb-2">
            {list.map((t) => <BacklogRow key={t.incident.id} t={t} maxDays={maxDays} draft={drafts[t.incident.id]} selected={sel === t.incident.id} onSelect={() => setSel(t.incident.id)} />)}
            {!list.length && <li className="px-3 py-8 text-center text-[13px] text-ink-3">No overdue record matches "{q}". Clear the filter to see all {tank.length}.</li>}
          </ul>
        </Card>

        <div className="flex min-w-0 flex-col gap-4">
          {!item ? <Card><Empty title="Select a record">Pick a record on the left to see or draft its RCA starter.</Empty></Card> : (
            <>
              <Card>
                <CardHeader action={LIVE && !d ? (
                  <Button variant="ai" disabled={busy || stored.status === "loading"} onClick={generate}>
                    <Sparkles className="size-4" aria-hidden="true" /> {busy ? "Drafting…" : "Draft RCA starter"}
                  </Button>
                ) : undefined}>
                  <div className="flex flex-wrap items-center gap-2">
                    <TagChip tag={item.incident.tag} size="md" />
                    <Badge tone="danger" dot pulse={(item.daysPastDue ?? 0) >= LONG_OVERDUE_DAYS}>{item.daysPastDue} d past RCA due</Badge>
                  </div>
                  <h2 className="mt-2 text-[17px] font-semibold leading-snug tracking-[-0.015em] text-ink-hi">{item.incident.title}</h2>
                </CardHeader>
                <CardContent>
                  <dl className="grid gap-x-6 gap-y-2.5 text-[13px] sm:grid-cols-2 xl:grid-cols-3">
                    {([
                      ["Plant", item.incident.plant],
                      ["Equipment / component", `${item.incident.eq_type} / ${item.incident.component}`],
                      ["Mechanism", item.incident.mechanism],
                      ["Pre-Risk", item.incident.pre_risk],
                      ["PIC (RCA)", item.incident.pic_rca],
                      ["RCA due", fmtDate(item.incident.rca_due)],
                    ] as const).map(([k, v]) => (
                      <div key={k} className="min-w-0">
                        <dt className="text-[11.5px] text-ink-3">{k}</dt>
                        <dd className="m-0 truncate text-ink" title={String(v)}>{v}</dd>
                      </div>
                    ))}
                  </dl>
                  <p className="mt-3 flex flex-wrap items-center gap-2 text-[12px] text-ink-3">Register row <Cite id={`L3:row${item.incident.src.row}`} /> · status {item.incident.status}</p>
                </CardContent>
              </Card>

              {err && <Note tone="danger">{err}</Note>}
              {LIVE && stored.status === "error" && <Note tone="danger">Could not load stored drafts: {stored.error}</Note>}
              {busy && (
                <Card className="audit-running relative" aria-live="polite">
                  <div className="scan-bar" aria-hidden="true" />
                  <BorderBeam colorFrom="var(--ai)" colorTo="var(--accent)" duration={6} size={160} />
                  <CardHeader action={<Badge tone="ai" dot pulse>Model drafting</Badge>}>
                    <CardTitle icon={Sparkles}>Drafting the RCA starter for {item.incident.tag}</CardTitle>
                    <CardDescription>The draft may cite only the comparable records found by code.</CardDescription>
                  </CardHeader>
                  <CardContent><div className="skeleton-block" aria-label="Drafting" /></CardContent>
                </Card>
              )}
              <SectionTabs key={item.incident.id + (d ? "-d" : "")} param="detail" label="Record detail" tabs={(d ? (x: SectionTab[]) => x : (x: SectionTab[]) => [...x].reverse())([
                { id: "starter", label: "RCA starter", icon: Sparkles, badge: d ? "drafted" : undefined, badgeTone: "ai", render: () => (
                  d ? <DraftView d={d} onReviewed={(status) => stored.set({ ...drafts, [d.incident_id]: { ...d, status } })} />
                    : busy ? null : (
                      <Card className="border-dashed">
                        <Empty title="No RCA starter yet">
                          <p className="small">{LIVE ? "Draft one with the button above. It may cite only the comparable records." : "Drafting calls the AI model, so it runs only in the hosted version. The comparable records work offline."}</p>
                          <Button className="mt-3" onClick={() => openSectionTab("comparable", "detail")}>See comparable records</Button>
                        </Empty>
                      </Card>
                    )
                ) },
                { id: "comparable", label: "Comparable records", icon: ClipboardList, render: () => <Comparable id={item.incident.id} /> },
              ])} />
            </>
          )}
        </div>
      </div>
    </>
  );
}

function BacklogRow({ t, maxDays, draft, selected, onSelect }: { t: TankItem; maxDays: number; draft?: StoredDraft; selected: boolean; onSelect: () => void }) {
  const n = t.daysPastDue ?? 0;
  const long = n >= LONG_OVERDUE_DAYS;
  return (
    <li>
      <button type="button" aria-pressed={selected} onClick={onSelect}
        className={cn("block w-full rounded-[9px] border px-3 py-2.5 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          selected ? "border-line-hot bg-accent-soft" : "border-transparent hover:bg-fg/[0.04]")}>
        <span className="flex items-center gap-2">
          <span className={cn("font-mono text-[12.5px] font-medium", selected ? "text-ink-hi" : "text-ink")}>{t.incident.tag}</span>
          <span className="text-[11.5px] text-ink-3">{t.incident.plant}</span>
          <span className="ml-auto shrink-0">
            {draft ? (
              <Badge tone={draft.status === "accepted" ? "ok" : draft.status === "rejected" ? "danger" : "ai"} className={draft.status === "draft" ? "b-proposed" : undefined}>
                {draft.status === "draft" ? "Draft" : draft.status}
              </Badge>
            ) : null}
          </span>
        </span>
        <span className={cn("mt-1 block truncate text-[12.5px]", selected ? "text-ink" : "text-ink-2")}>{t.incident.title}</span>
        <span className="mt-2 flex items-center gap-2">
          <span className="h-1 flex-1 overflow-hidden rounded-full bg-fg/[0.07]" aria-hidden="true">
            <span className="block h-full rounded-full bg-danger" style={{ width: `${Math.max(4, (100 * n) / maxDays)}%`, opacity: 0.45 + 0.55 * (n / maxDays) }} />
          </span>
          <span className={cn("inline-flex shrink-0 items-center gap-1 text-[11.5px] tabular-nums", long ? "text-danger-ink" : "text-ink-3")}>
            {long && <span className="relative inline-flex size-1.5" aria-hidden="true"><span className="absolute inset-0 animate-ping rounded-full bg-danger opacity-60 motion-reduce:hidden" /><span className="relative size-1.5 rounded-full bg-danger" /></span>}
            {n} d past due
          </span>
        </span>
      </button>
    </li>
  );
}

function Comparable({ id }: { id: string }) {
  const open = useDrawer();
  const target = SNAP.incidents.find((i) => i.id === id)!;
  const sims = similarCandidates(target, SNAP.incidents);
  return (
    <Card>
      <CardHeader>
        <CardTitle icon={ClipboardList}>Comparable records (candidates, not causes)</CardTitle>
        <CardDescription>The only records the draft may cite.</CardDescription>
      </CardHeader>
      <CardContent className="px-0 pb-2">
        {sims.length ? (
          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-0 text-[13px]">
              <thead>
                <tr className="text-left text-[11.5px] text-ink-3">
                  <th className="py-2 pl-5 pr-3 font-medium">Record</th><th className="px-3 py-2 font-medium">Plant</th>
                  <th className="px-3 py-2 font-medium">Component · mechanism</th><th className="px-3 py-2 font-medium">Occurred</th><th className="py-2 pl-3 pr-5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>{sims.map((s) => (
                <tr key={s.id} className="cursor-pointer [&>td]:border-t [&>td]:border-line hover:[&>td]:bg-fg/[0.035]" onClick={() => open({ kind: "incident", id: s.id })}>
                  <td className="py-2.5 pl-5 pr-3">
                    <button type="button" className="font-mono text-[12.5px] font-medium text-accent-ink hover:text-ink-hi" onClick={(e) => { e.stopPropagation(); open({ kind: "incident", id: s.id }); }}>{s.tag}</button>
                    <div className="max-w-[280px] truncate text-[12px] text-ink-3">{s.title}</div>
                  </td>
                  <td className="px-3 text-ink-2">{s.plant}</td>
                  <td className="px-3 text-ink-2">{s.component} · {s.mechanism}</td>
                  <td className="whitespace-nowrap px-3 tabular-nums text-ink-2">{fmtDate(s.occurred)}</td>
                  <td className="pl-3 pr-5 text-[12px] text-ink-3">{s.status}</td>
                </tr>))}</tbody>
            </table>
          </div>
        ) : <p className="px-5 pb-3 text-[13px] text-ink-3">No record in the register shares this component.</p>}
      </CardContent>
    </Card>
  );
}

function DraftView({ d, onReviewed }: { d: StoredDraft; onReviewed: (s: "accepted" | "rejected") => void }) {
  const [deciding, setDeciding] = useState<"accepted" | "rejected" | null>(null);
  const [reason, setReason] = useState("");
  const [err, setErr] = useState("");
  const [note, setNote] = useState("");
  const submit = async () => {
    if (!deciding || reason.trim().length < 3) return;
    setErr("");
    try {
      const r = await api<{ applied: boolean }>("/api/rca/review", { body: { draftId: d.id, decision: deciding, reason } });
      if (r.applied) onReviewed(deciding);
      else setNote(`Logged as ${deciding} in your sandbox. The shared draft stays open for the team.`);
      setDeciding(null); setReason("");
    } catch (e) { setErr(errorText(e, "Could not record the decision.")); }
  };
  const p4 = d.draft.checklist.filter((c) => c.category === "4P"), m4 = d.draft.checklist.filter((c) => c.category === "4M+1E");
  const groups = ([["p4", "4P · parameters", p4], ["m4", "4M+1E", m4]] as const).filter(([, , rows]) => rows.length > 0);
  return (
    <Card className="border-[rgb(var(--ai-rgb)/0.32)] [background:linear-gradient(180deg,rgb(var(--ai-rgb)/0.07),transparent_240px),var(--panel)]">
      <CardHeader action={<Badge tone="ai" dot>Model wrote this</Badge>}>
        <CardTitle icon={Sparkles}>RCA starter</CardTitle>
        <CardDescription>
          <span className="badge b-proposed">AI draft · {d.status === "draft" ? "awaiting RCA lead" : d.status}</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <p className="rounded-lg border border-dashed border-[rgb(var(--ai-rgb)/0.4)] bg-ai-soft px-3.5 py-3 text-[14px] leading-relaxed text-ink">{d.draft.problem_statement}</p>

        {groups.length > 0 && (
          <Tabs defaultValue={groups[0][0]}>
            <TabsList aria-label="Checklist">
              {groups.map(([k, title, rows]) => <TabsTrigger key={k} value={k}>{title} <span className="tabular-nums text-ink-3">{rows.length}</span></TabsTrigger>)}
            </TabsList>
            {groups.map(([k, , rows]) => (
              <TabsContent key={k} value={k}>
                <div className="overflow-x-auto rounded-lg border border-line">
                  <table className="w-full border-separate border-spacing-0 text-[13px]">
                    <thead><tr className="text-left text-[11.5px] text-ink-3"><th className="px-3 py-2 font-medium">#</th><th className="px-3 py-2 font-medium">Item</th><th className="px-3 py-2 font-medium">Status</th><th className="px-3 py-2 font-medium">Data needed to assess it</th></tr></thead>
                    <tbody>{rows.map((c) => (
                      <tr key={c.id} className="align-top [&>td]:border-t [&>td]:border-line">
                        <td className="px-3 py-2 font-mono text-[12px] text-ink-3">{c.id}</td>
                        <td className="px-3 py-2 text-ink">{c.item}</td>
                        <td className="px-3 py-2"><span className="badge">Not assessed</span></td>
                        <td className="px-3 py-2 text-[12.5px] text-ink-2">{c.data_needed}</td>
                      </tr>))}</tbody>
                  </table>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        )}

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <h3 className="mb-2 text-[13.5px] font-semibold text-ink">Comparable records</h3>
            {d.draft.similar.length ? <ul className="flex flex-col gap-2 text-[13px] text-ink-2">{d.draft.similar.map((s) => <li key={s.ref}><Cite id={s.ref} /> {s.why}</li>)}</ul> : <p className="text-[13px] text-ink-3">None cited.</p>}
          </div>
          <div>
            <h3 className="mb-2 text-[13.5px] font-semibold text-ink">Data requests</h3>
            <ul className="flex flex-col gap-2 text-[13px] text-ink-2">{d.draft.data_requests.map((r) => <li key={r.request}><b className="font-medium text-ink">{r.to_role}</b> · {r.request}</li>)}</ul>
          </div>
        </div>
        {!!d.draft.first_checks.length && (
          <div>
            <h3 className="mb-2 text-[13.5px] font-semibold text-ink">First checks</h3>
            <ol className="m-0 list-decimal pl-5 text-[13px] text-ink-2 marker:text-ink-3">{d.draft.first_checks.map((c) => <li key={c} className="py-0.5">{c}</li>)}</ol>
          </div>
        )}
        {note && <Note tone="sim">{note}</Note>}
        {err && <Note tone="danger">{err}</Note>}
        {d.status === "draft" && (
          <div className="decision-bar">
            {deciding ? (
              <>
                <label className="field" style={{ flex: 1 }}><span>Why {deciding === "accepted" ? "accept it as a starting point" : "reject it"}? (recorded in the review log)</span>
                  <input className="input" autoFocus value={reason} onChange={(e) => setReason(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} /></label>
                <Button size="sm" variant={deciding === "rejected" ? "danger" : "primary"} disabled={reason.trim().length < 3} onClick={submit}>Confirm</Button>
                <Button size="sm" variant="ghost" onClick={() => setDeciding(null)}>Cancel</Button>
              </>
            ) : (
              <>
                <Button size="sm" variant="primary" onClick={() => setDeciding("accepted")}>Accept as starting point</Button>
                <Button size="sm" variant="danger" onClick={() => setDeciding("rejected")}>Reject</Button>
                <span className="text-[12px] text-ink-3">Accepting never changes the register status.</span>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
