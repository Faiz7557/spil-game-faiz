// prototype/src/components/DifferentialPanel.tsx
// Symptoms → ranked causes → cheapest separating check, all computed by code from the failure-mode library; then
// the AI investigator, which explains the ranking in the violet "a model wrote this" treatment.
import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Check, FlaskConical, ListOrdered, Minus, Sparkles, X } from "lucide-react";
import { equipmentByTag } from "../domain/data";
import { diagnose, firstDiagnosableWeek, lockOn, Z_MIN, type ModeScore, type Observation } from "../domain/diagnosis";
import { modeById, type SignalKind } from "../domain/failureModes";
import type { RecordedDiagnosis } from "../domain/diagnosisBrief";
import { fmtDate } from "../domain/kpis";
import recordedJson from "../data/diagnosis_runs.json";
import goldJson from "../data/diagnosis_gold.json";
import { LIVE } from "../lib/supabase";
import { api } from "../lib/api";
import { errorText } from "../lib/live";
import GuardBadge from "./GuardBadge";
import { Note } from "./ui";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, type Tone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const RECORDED = recordedJson as Record<string, RecordedDiagnosis>;
const GOLD = (goldJson as { cases: Record<string, { mode: string }> }).cases;
const COST_TONE: Record<string, Tone> = { low: "ok", medium: "warn", high: "danger" };

export default function DifferentialPanel({ tag, revealGold, week: weekProp, onWeekChange, showWeekPicker = true }: {
  tag: string; revealGold: boolean;
  /** Controlled review week (0-based). When omitted the panel keeps its own. */
  week?: number; onWeekChange?: (w: number) => void;
  /** Hide the built-in week picker when the page already renders one. */
  showWeekPicker?: boolean;
}) {
  const eq = equipmentByTag(tag)!;
  const first = firstDiagnosableWeek(eq);
  const trip = eq.history.findIndex((h) => h.status === "TRIP");
  const [ownWeek, setOwnWeek] = useState(first ?? 0);
  const week = weekProp ?? ownWeek;
  const setWeek = (w: number) => { setOwnWeek(w); onWeekChange?.(w); };
  const [live, setLive] = useState<RecordedDiagnosis | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const d = useMemo(() => diagnose(eq, week), [eq, week]);
  const timeline = useMemo(() => lockOn(eq, GOLD[tag]?.mode ?? ""), [eq, tag]);
  const shown = live?.week === week ? live : RECORDED[`${tag}|${week}`] ?? null;

  if (first === null) return (
    <Card id="differential" className="scroll-mt-4">
      <CardHeader><CardTitle icon={ListOrdered}>Differential diagnosis</CardTitle></CardHeader>
      <CardContent className="pt-2">
        <p className="text-[13.5px] text-ink-2">The condition record never shows two signals outside the baseline band before the trip, so PlantPulse does not rank causes.</p>
      </CardContent>
    </Card>
  );

  const run = async () => {
    setBusy(true); setErr(null);
    try {
      const r = await api<{ brief: RecordedDiagnosis["brief"]; guard: RecordedDiagnosis["guard"]; model: string; week: number }>("/api/diagnosis/run", { body: { tag, week } });
      setLive({ brief: r.brief, guard: r.guard, model: r.model, run_at: new Date().toISOString(), week: r.week });
    } catch (e) { setErr(errorText(e, "The investigator did not finish.")); } finally { setBusy(false); }
  };

  const weeks = Array.from({ length: (trip >= 0 ? trip : eq.history.length) - first }, (_, i) => first + i);
  const name = (k: SignalKind) => d.observations.find((o) => o.kind === k)?.param ?? k;
  // Opens on the leading cause; "__none" means the user closed every row.
  const selected = picked === "__none" ? null : d.ranking.find((r) => r.mode.id === picked) ?? d.ranking.find((r) => d.leading.includes(r.mode.id)) ?? null;
  const checks = [...new Map(d.leading.map((id) => modeById(id)!).map((m) => [m.check.test, m])).values()];

  return (
    <>
      <Card id="differential" className="scroll-mt-4">
        <CardHeader action={
          showWeekPicker ? (
            <label className="field min-w-[220px]">
              <span>Review week</span>
              <select className="input" value={week} onChange={(e) => setWeek(Number(e.target.value))}>
                {weeks.map((w) => <option key={w} value={w}>Week {w + 1} · {fmtDate(eq.history[w].date)} · {eq.history[w].status}</option>)}
              </select>
            </label>
          ) : <Badge tone="neutral" className="b-proposed">Before any RCA</Badge>
        }>
          <CardTitle icon={ListOrdered}>
            Differential diagnosis
            {showWeekPicker && <Badge tone="neutral" className="b-proposed">Before any RCA</Badge>}
          </CardTitle>
          <CardDescription>
            Uses only weekly readings up to week {week + 1} ({fmtDate(eq.history[week]?.date ?? "")}). Ranking is computed by code from the failure-mode library
            (ISO 14224 codes); the AI investigator explains it and proposes the cheapest check.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 pt-3">
          {showWeekPicker && (
            <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Leading hypothesis by week">
              {timeline.map((t) => (
                <Button key={t.week} variant="ghost" size="sm" aria-pressed={t.week === week} onClick={() => setWeek(t.week)}
                  className={cn("tabular-nums", t.week === week && "!bg-accent-soft !text-ink-hi")}
                  title={`Week ${t.week + 1}: ${t.leading.join(", ") || "abstain"}`}>
                  <MiniMark state={revealGold ? t.state : t.leading.length === 1 ? "unique" : t.leading.length ? "tied" : "abstain"} /> {t.week + 1}
                </Button>
              ))}
            </div>
          )}
          {revealGold && GOLD[tag] && (
            <Note>Documented cause (RCA, shown only in snapshot review for evaluation): <b>{GOLD[tag].mode}</b> {modeById(GOLD[tag].mode)?.title}.</Note>
          )}

          {d.abstain ? <Note tone="warn">{d.abstain}</Note> : (
            <div className="grid gap-5 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
              <Symptoms date={d.date} obs={d.observations} />
              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-[13.5px] font-semibold text-ink">Ranked causes</h3>
                  <EvidenceLegend />
                </div>
                <ol className="flex flex-col gap-1" aria-label="Ranked causes">
                  {d.ranking.map((r, i) => (
                    <CauseRow key={r.mode.id} r={r} rank={i + 1} leading={d.leading.includes(r.mode.id)} name={name}
                      open={selected?.mode.id === r.mode.id} onToggle={() => setPicked(selected?.mode.id === r.mode.id ? "__none" : r.mode.id)}
                      isGold={revealGold && GOLD[tag]?.mode === r.mode.id} />
                  ))}
                </ol>
              </div>
            </div>
          )}

          {!d.abstain && (
            <div className={cn("rounded-xl border px-4 py-3.5", d.leading.length > 1 ? "border-[rgb(var(--caution-rgb)/0.32)] bg-caution-soft" : "border-line-hot bg-accent-soft")}>
              <div className="flex items-start gap-3">
                <FlaskConical className={cn("mt-0.5 size-4 shrink-0", d.leading.length > 1 ? "text-caution" : "text-accent-ink")} aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-semibold text-ink-hi">
                    {d.leading.length > 1 ? <>Too early to separate {d.leading.join(", ")}. Cheapest checks that separate them:</> : <>Leading hypothesis {d.leading[0]}. Confirm before acting:</>}
                  </p>
                  <ul className="mt-2 flex flex-col gap-2">
                    {checks.map((m) => (
                      <li key={m.check.test} className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[13.5px] text-ink">
                        <span className="min-w-0">{m.check.test}</span>
                        <Badge tone={COST_TONE[m.check.cost]}>{m.check.cost} cost</Badge>
                        <span className="font-mono text-[11.5px] text-ink-3">{m.id}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Investigator shown={shown} busy={busy} err={err} run={run} week={week} />
    </>
  );
}

/* ---------- symptoms: z against the baseline band, as a centred diverging meter ---------- */

function Symptoms({ date, obs }: { date: string; obs: Observation[] }) {
  const span = Math.max(Z_MIN * 2, Math.ceil(Math.max(...obs.map((o) => Math.abs(o.z)), 0)));
  const at = (z: number) => 50 + (Math.max(-span, Math.min(span, z)) / span) * 50;
  return (
    <div className="min-w-0">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-[13.5px] font-semibold text-ink">Symptoms on {fmtDate(date)}</h3>
        <span className="text-[12px] text-ink-3">z vs baseline · band ±{Z_MIN}</span>
      </div>
      <ul className="flex flex-col">
        {obs.map((o) => {
          const out = o.dir !== 0;
          const from = Math.min(50, at(o.z)), to = Math.max(50, at(o.z));
          return (
            <li key={o.param} className="rounded-lg px-2 py-2 transition-colors hover:bg-fg/[0.035]">
              <div className="flex items-baseline justify-between gap-3 text-[13px]">
                <span className={cn("min-w-0", out ? "text-ink" : "text-ink-2")}>{o.param}</span>
                <span className="shrink-0 tabular-nums text-ink-2">{o.value} <span className="text-ink-3">{o.unit}</span></span>
              </div>
              <div className="mt-1.5 flex items-center gap-2.5">
                <div className="relative h-2 flex-1 rounded-full bg-fg/[0.06]" role="img" aria-label={`z ${o.z}: ${out ? (o.dir === 1 ? "above" : "below") + " the baseline band" : "inside the baseline band"}`}>
                  <span className="absolute inset-y-0 rounded-full bg-fg/[0.05]" style={{ left: `${at(-Z_MIN)}%`, right: `${100 - at(Z_MIN)}%` }} aria-hidden="true" />
                  <span className="absolute -inset-y-0.5 w-px bg-ink-4" style={{ left: "50%" }} aria-hidden="true" />
                  <span className={cn("absolute inset-y-0 rounded-full", out ? "bg-info" : "bg-ink-4")} style={{ left: `${from}%`, width: `${Math.max(to - from, 1.5)}%` }} />
                </div>
                <span className={cn("inline-flex w-[104px] shrink-0 items-center gap-1 text-[11.5px]", out ? "text-info-ink" : "text-ink-3")}>
                  {o.dir === 1 ? <ArrowUp className="size-3" aria-hidden="true" /> : o.dir === -1 ? <ArrowDown className="size-3" aria-hidden="true" /> : <Minus className="size-3" aria-hidden="true" />}
                  <span className="tabular-nums">{o.z > 0 ? "+" : ""}{o.z}</span>
                  <span>{o.dir === 1 ? "Above band" : o.dir === -1 ? "Below band" : "In band"}</span>
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ---------- ranked causes: evidence for/against as one segmented meter ---------- */

const SEGS = [
  { key: "matched", label: "fits", cls: "bg-ok" },
  { key: "quiet", label: "quiet as expected", cls: "bg-ok/45" },
  { key: "unexplained", label: "not explained", cls: "bg-ink-4" },
  { key: "missing", label: "expected, not seen", cls: "bg-caution" },
  { key: "contradicted", label: "against", cls: "bg-danger" },
] as const;

function EvidenceLegend() {
  return (
    <ul className="flex flex-wrap gap-x-3 gap-y-1 text-[11.5px] text-ink-3" aria-label="Evidence meter legend">
      {SEGS.map((s) => <li key={s.key} className="flex items-center gap-1"><span className={cn("h-2 w-2 rounded-[2px]", s.cls)} aria-hidden="true" />{s.label}</li>)}
    </ul>
  );
}

function CauseRow({ r, rank, leading, open, onToggle, name, isGold }: {
  r: ModeScore; rank: number; leading: boolean; open: boolean; onToggle: () => void; name: (k: SignalKind) => string; isGold: boolean;
}) {
  const total = SEGS.reduce((s, g) => s + r[g.key].length, 0) || 1;
  const id = `cause-${r.mode.id}`;
  return (
    <li className={cn("rounded-lg border transition-[background-color,border-color] duration-150",
      open ? "border-line-hot bg-accent-soft" : "border-transparent hover:border-line hover:bg-fg/[0.035]")}>
      <button type="button" onClick={onToggle} aria-expanded={open} aria-controls={id}
        className="flex w-full flex-col gap-2 rounded-lg px-3 py-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <div className="flex w-full items-start gap-2.5">
          <span className={cn("mt-px grid size-5 shrink-0 place-items-center rounded-md text-[11px] font-semibold tabular-nums",
            leading ? "bg-accent text-white" : "bg-fg/[0.06] text-ink-3")}>{rank}</span>
          <span className="min-w-0 flex-1 text-[13.5px] leading-snug text-ink">
            <span className="mr-1.5 font-mono text-[12px] text-ink-2">{r.mode.id}</span>{r.mode.title}
          </span>
          <span className="flex shrink-0 items-center gap-1.5">
            {leading && <Badge tone="accent" dot>Leading</Badge>}
            {isGold && <Badge tone="neutral">RCA cause</Badge>}
            <span className={cn("w-10 text-right text-[13px] font-semibold tabular-nums", r.score < 0 ? "text-danger-ink" : "text-ink-hi")} title="Score: (fits − ½ × (against + expected-not-seen)) ÷ signals counted">{r.score.toFixed(2)}</span>
          </span>
        </div>
        <div className="ml-7 flex h-2 gap-[2px] overflow-hidden rounded-full bg-fg/[0.06]" role="img"
          aria-label={SEGS.map((g) => `${r[g.key].length} ${g.label}`).join(", ")}>
          {SEGS.map((g) => r[g.key].length > 0 && (
            <span key={g.key} className={cn("h-full", g.cls)} style={{ width: `${(r[g.key].length / total) * 100}%` }} />
          ))}
        </div>
      </button>
      {open && (
        <div id={id} className="ml-10 mr-3 flex flex-col gap-2.5 pb-3 text-[12.5px] text-ink-2">
          <div className="text-ink-3">ISO 14224 {r.mode.iso14224.mode} · {r.mode.iso14224.mechanism}</div>
          <SignalList label="Fits" tone="ok" kinds={r.matched} name={name} />
          <SignalList label="Against" tone="danger" kinds={r.contradicted} name={name} />
          <SignalList label="Expected, not seen" tone="warn" kinds={r.missing} name={name} />
          <div className="rounded-lg border border-line bg-fg/[0.025] px-3 py-2">
            <div className="flex flex-wrap items-baseline gap-2 text-ink"><FlaskConical className="size-3.5 self-center text-ink-3" aria-hidden="true" />{r.mode.check.test} <Badge tone={COST_TONE[r.mode.check.cost]}>{r.mode.check.cost} cost</Badge></div>
            <div className="mt-1 text-ink-3">If positive: {r.mode.check.ifTrue} If negative: {r.mode.check.ifFalse}</div>
          </div>
        </div>
      )}
    </li>
  );
}

function SignalList({ label, tone, kinds, name }: { label: string; tone: Tone; kinds: SignalKind[]; name: (k: SignalKind) => string }) {
  if (!kinds.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="w-[118px] shrink-0 text-ink-3">{label}</span>
      {kinds.map((k) => <Badge key={k} tone={tone}>{tone === "ok" ? <Check aria-hidden="true" /> : tone === "danger" ? <X aria-hidden="true" /> : <Minus aria-hidden="true" />}{name(k)}</Badge>)}
    </div>
  );
}

function MiniMark({ state }: { state: "unique" | "tied" | "abstain" | "wrong" }) {
  if (state === "wrong") return <X className="!size-3 text-danger" aria-hidden="true" />;
  return (
    <svg viewBox="0 0 10 10" className={cn("!size-2.5", state === "abstain" ? "text-ink-4" : "text-accent")} aria-hidden="true">
      {state === "unique" && <circle cx="5" cy="5" r="4" fill="currentColor" />}
      {state === "tied" && <><circle cx="5" cy="5" r="3.4" fill="none" stroke="currentColor" strokeWidth="1.3" /><path d="M5 1.6a3.4 3.4 0 0 1 0 6.8z" fill="currentColor" /></>}
      {state === "abstain" && <circle cx="5" cy="5" r="3" fill="none" stroke="currentColor" strokeWidth="1.3" />}
    </svg>
  );
}

/* ---------- AI investigator (model output: violet) ---------- */

function Investigator({ shown, busy, err, run, week }: { shown: RecordedDiagnosis | null; busy: boolean; err: string | null; run: () => void; week: number }) {
  // Guard indexes follow toGuardSentences order: each hypothesis's "for" then "against", then the next check.
  let gi = 0;
  const guard = () => { const i = gi++; return shown?.guard.find((g) => g.index === i); };
  const hyps = shown ? shown.brief.hypotheses.map((h) => ({ h, forG: h.for.map(guard), againstG: h.against.map(guard) })) : [];
  const nextG = shown ? guard() : undefined;
  const STANDING_TONE: Record<string, string> = { leading: "text-ai-ink", plausible: "text-ink-2", unlikely: "text-ink-3" };

  return (
    <Card id="investigator" className="scroll-mt-4 border-[rgb(var(--ai-rgb)/0.3)] [background:linear-gradient(180deg,rgb(var(--ai-rgb)/0.09),rgb(var(--ai-rgb)/0.02)_40%),var(--panel)]">
      <CardHeader action={LIVE && (
        <Button variant="ai" size="sm" disabled={busy} onClick={run} aria-busy={busy}>
          <Sparkles aria-hidden="true" className={busy ? "animate-pulse" : undefined} />{busy ? "Investigating…" : "Run for this week"}
        </Button>
      )}>
        <CardTitle icon={Sparkles} className="[&>svg]:text-ai">AI investigator <Badge tone="ai">Model output</Badge></CardTitle>
        <CardDescription>Explains the ranking for week {week + 1}, RCA hidden, every sentence checked.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 pt-3">
        {err && <Note tone="danger">{err}</Note>}
        {busy && !shown && <div className="skeleton-block h-24 rounded-lg" aria-hidden="true" />}
        {!shown ? (
          <p className="rounded-lg border border-dashed border-[rgb(var(--ai-rgb)/0.35)] px-4 py-3 text-[13px] text-ink-2">
            {LIVE ? "No run for this week yet. Run the investigator to get an explained differential and the next check." : "No recorded run for this week. Recorded runs exist for the first diagnosable week and the first ALARM week."}
          </p>
        ) : (
          <>
            <p className="text-[12px] text-ink-3">Model <span className="font-mono">{shown.model}</span> · {fmtDate(shown.run_at.slice(0, 10))} · RCA hidden · every sentence checked by the Evidence Guard</p>
            <div className="flex flex-col divide-y divide-[rgb(var(--ai-rgb)/0.16)]">
              {hyps.map(({ h, forG, againstG }) => (
                <div key={h.mode_id} className="py-3 first:pt-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[12px] text-ink-2">{h.mode_id}</span>
                    <span className={cn("text-[14px] font-semibold", STANDING_TONE[h.standing] ?? "text-ink")}>{h.title}</span>
                    <Badge tone="neutral" className="b-proposed">{h.standing}</Badge>
                  </div>
                  <ul className="mt-2 flex flex-col gap-1.5 text-[13px] leading-snug text-ink-2">
                    {h.for.map((c, i) => (
                      <li key={`f${c.text}`} className="flex gap-2"><Check className="mt-0.5 size-3.5 shrink-0 text-ok" aria-label="For" />
                        <span><span className="sr-only">For: </span>{c.text} {forG[i] && <GuardBadge status={forG[i]!.status} reason={forG[i]!.reason} />}</span></li>
                    ))}
                    {h.against.map((c, i) => (
                      <li key={`a${c.text}`} className="flex gap-2"><X className="mt-0.5 size-3.5 shrink-0 text-danger" aria-label="Against" />
                        <span><span className="sr-only">Against: </span>{c.text} {againstG[i] && <GuardBadge status={againstG[i]!.status} reason={againstG[i]!.reason} />}</span></li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-[rgb(var(--ai-rgb)/0.35)] bg-ai-soft px-4 py-3">
              <div className="flex items-start gap-3">
                <FlaskConical className="mt-0.5 size-4 shrink-0 text-ai" aria-hidden="true" />
                <div className="min-w-0 text-[13px] leading-relaxed text-ink-2">
                  <div className="text-[13.5px] text-ink">Next check: <b className="font-semibold text-ink-hi">{shown.brief.next_check.test}</b> {nextG && <GuardBadge status={nextG.status} reason={nextG.reason} />}</div>
                  <div className="mt-1">Separates {shown.brief.next_check.separates.join(", ")}.</div>
                  <div className="mt-1.5 grid gap-1.5 sm:grid-cols-2">
                    <div><span className="text-ink-3">If positive: </span>{shown.brief.next_check.if_positive}</div>
                    <div><span className="text-ink-3">If negative: </span>{shown.brief.next_check.if_negative}</div>
                  </div>
                </div>
              </div>
            </div>
            {shown.brief.abstentions.length > 0 && <p className="text-[12px] text-ink-3">Not answerable from the data: {shown.brief.abstentions.join(" · ")}</p>}
          </>
        )}
      </CardContent>
    </Card>
  );
}
