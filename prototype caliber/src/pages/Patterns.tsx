import { Fragment, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowDown, ChevronRight, CircleDollarSign, Factory, FolderOpen, Grid3x3, Layers } from "lucide-react";
import { SNAP } from "../domain/data";
import { usd, usdM } from "../domain/kpis";
import analytics from "../data/analytics.json";
import { LIVE } from "../lib/supabase";
import { api } from "../lib/api";
import { useLoad } from "../lib/live";
import { Empty, Note, useDrawer } from "../components/ui";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { MiniBars, ShareBar, StatTile } from "@/components/ui/stat-tile";
import { Badge, type Tone } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { STATUS_HEX, rechartsTip } from "@/components/ui/chart";
import { cn } from "@/lib/utils";

interface Label { name: string; shared_mechanism_hypothesis: string; evidence_needed: string[]; fleet_action: string; coherence: "coherent" | "mixed" | "incoherent" }
interface FP { cluster_key: string; member_ids: string[]; plants: string[]; actual_usd: number; open_count: number; top_terms: string[]; label: Label | null }

const COHERENCE: Record<Label["coherence"], [string, Tone]> = { coherent: ["Coherent", "ok"], mixed: ["Mixed", "warn"], incoherent: ["Incoherent", "danger"] };

type SortKey = "spread" | "records" | "loss" | "open";
const SORTS: { key: SortKey; label: string; long: string }[] = [
  { key: "spread", label: "Plants", long: "Most plants first" },
  { key: "records", label: "Records", long: "Most records first" },
  { key: "loss", label: "Loss", long: "Highest recorded loss first" },
  { key: "open", label: "Open", long: "Most open records first" },
];

/** "comp_tube_bundle" → "Tube bundle": readable name for an unlabelled family. */
function fallbackName(fp: FP) {
  const comp = fp.top_terms.find((t) => t.startsWith("comp_"))?.slice(5).replace(/_/g, " ");
  const mech = fp.top_terms.find((t) => t.startsWith("mech_"))?.slice(5).replace(/_/g, " ");
  const name = [comp, mech].filter(Boolean).join(" · ");
  return name ? name[0].toUpperCase() + name.slice(1) : fp.cluster_key;
}
const familyName = (f: FP) => f.label?.name ?? fallbackName(f);

/** Sequential single-hue ramp (accent blue): 1 record is a faint wash, the busiest cell is solid. */
const cellFill = (n: number, peak: number) => (n ? `rgba(91, 140, 255, ${(0.16 + 0.84 * (n / peak)).toFixed(3)})` : undefined);

export default function Patterns() {
  const live = useLoad(() => api<FP[]>("/api/live?kind=patterns"), [], LIVE);
  const fps: FP[] | null = LIVE ? live.data : (analytics.patterns as FP[]);
  const [showIncoherent, setShowIncoherent] = useState(false);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>("spread");
  const [view, setView] = useState("matrix");
  const [hoverPlant, setHoverPlant] = useState<string | null>(null);
  const drawer = useDrawer();
  const plants = useMemo(() => [...new Set(SNAP.incidents.map((i) => i.plant))].sort(), []);
  const byId = useMemo(() => new Map(SNAP.incidents.map((i) => [i.id, i])), []);

  // Per-family plant counts, computed once from the register.
  const counts = useMemo(() => {
    const m = new Map<string, Map<string, number>>();
    for (const f of fps ?? []) {
      const c = new Map<string, number>();
      for (const id of f.member_ids) { const p = byId.get(id)?.plant; if (p) c.set(p, (c.get(p) ?? 0) + 1); }
      m.set(f.cluster_key, c);
    }
    return m;
  }, [fps, byId]);

  if (LIVE && live.status === "loading") return <div className="skeleton-block tall" aria-label="Loading failure patterns" />;
  if (LIVE && live.status === "error") return <Note tone="danger">Could not load failure patterns: {live.error}</Note>;
  if (!fps?.length) return <Empty title="No failure families yet">Run <span className="mono">python -m analytics.patterns</span>, then <span className="mono">scripts/label-patterns.ts</span> to name them.</Empty>;

  const incoherentCount = fps.filter((f) => f.label?.coherence === "incoherent").length;
  const visible = fps.filter((f) => showIncoherent || f.label?.coherence !== "incoherent");
  const hidden = fps.length - visible.length;
  const spread = (f: FP) => counts.get(f.cluster_key)?.size ?? f.plants.length;
  const metric: Record<SortKey, (f: FP) => number> = { spread, records: (f) => f.member_ids.length, loss: (f) => f.actual_usd, open: (f) => f.open_count };
  // Stable sort keeps the clustering order (spread first) as the tie-breaker.
  const shown = [...visible].sort((a, b) => metric[sort](b) - metric[sort](a) || spread(b) - spread(a));
  const maxLoss = Math.max(...fps.map((f) => f.actual_usd));
  const peak = Math.max(1, ...shown.flatMap((f) => [...(counts.get(f.cluster_key)?.values() ?? [])]));
  const labelled = fps.some((f) => f.label);

  const uniqueMembers = new Set(fps.flatMap((f) => f.member_ids)).size;
  const totalLoss = fps.reduce((s, f) => s + f.actual_usd, 0);
  const totalOpen = fps.reduce((s, f) => s + f.open_count, 0);
  const widest = fps.reduce((a, b) => (spread(b) > spread(a) ? b : a));
  const familiesPerPlant = (p: string) => shown.filter((f) => counts.get(f.cluster_key)?.has(p)).length;

  const openFamily = (key: string) => { setOpenKey(key); setView("matrix"); };

  return (
    <>
      <PageHeader
        title="Failure patterns across plants"
        badges={<Badge tone="accent">KQ2</Badge>}
        description={<>{fps.length} failure families across {SNAP.incidents.length} records. A deeper cell means more records at that plant.</>}
        actions={hidden > 0 || showIncoherent ? (
          <label className="chk"><input type="checkbox" checked={showIncoherent} onChange={(e) => setShowIncoherent(e.target.checked)} /> Show incoherent families ({incoherentCount})</label>
        ) : undefined}
      />

      {!labelled && <div className="mb-4 tw"><Note tone="warn">{LIVE ? "Families are not named yet. Run scripts/label-patterns.ts to have the model name them; names and hypotheses then appear here for human review." : "Offline demo: these families come from the bundled clustering run. Claude-written names, shared-mechanism hypotheses and fleet actions appear in the hosted version."}</Note></div>}

      <div className="tw mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Failure families" icon={Layers} accent="var(--series-4)" value={fps.length}
          chip={`${uniqueMembers} of ${SNAP.incidents.length}`} context="records grouped"
          visual={<MiniBars values={[...fps].sort((x, y) => y.member_ids.length - x.member_ids.length).map((f) => f.member_ids.length)} color="var(--series-4)" label="Records per family, largest first" recent={false} />} />
        <StatTile label="Widest family" icon={Factory} accent="var(--series-1)" value={<>{spread(widest)}<span className="text-[16px] font-medium text-ink-3"> / {plants.length} plants</span></>}
          context={<span className="line-clamp-1">{familyName(widest)}</span>}
          visual={<ShareBar value={spread(widest)} max={plants.length} color="var(--series-1)" label={`Seen at ${spread(widest)} of ${plants.length} plants`} />}
          onClick={() => openFamily(widest.cluster_key)} />
        <StatTile label="Recorded actual loss" icon={CircleDollarSign} accent="var(--series-2)" value={usdM(totalLoss)}
          context="across every family"
          visual={<MiniBars values={[...fps].sort((x, y) => y.actual_usd - x.actual_usd).map((f) => f.actual_usd)} color="var(--series-2)" label="Recorded loss per family, largest first" recent={false} />} />
        <StatTile label="Open records" icon={FolderOpen} accent="var(--caution)" value={totalOpen}
          chip={`${Math.round((totalOpen / Math.max(uniqueMembers, 1)) * 100)}%`} context="still open on the review date"
          visual={<ShareBar value={totalOpen} max={uniqueMembers} color="var(--caution)" label={`${totalOpen} of ${uniqueMembers} records open`} />} />
      </div>

      <Tabs value={view} onValueChange={setView}>
        <div className="tw flex flex-wrap items-center justify-between gap-3">
          <TabsList aria-label="Pattern view">
            <TabsTrigger value="matrix"><Grid3x3 aria-hidden="true" /> Where families occur</TabsTrigger>
            <TabsTrigger value="loss"><CircleDollarSign aria-hidden="true" /> Recorded loss by family</TabsTrigger>
          </TabsList>
          {view === "matrix" && (
            <div className="flex flex-wrap items-center gap-2 text-[12.5px] text-ink-3" role="group" aria-label="Sort families">
              <span>Sort</span>
              {SORTS.map((s) => (
                <button key={s.key} type="button" aria-pressed={sort === s.key} title={s.long} onClick={() => setSort(s.key)}
                  className={cn("inline-flex h-7 items-center gap-1 rounded-md border px-2.5 text-[12.5px] font-medium transition-colors duration-150",
                    sort === s.key ? "border-line-hot bg-accent-soft text-ink-hi" : "border-line bg-fg/[0.02] text-ink-2 hover:border-line-strong hover:text-ink")}>
                  {s.label}{sort === s.key && <ArrowDown className="size-3" aria-hidden="true" />}
                </button>
              ))}
            </div>
          )}
        </div>

        <TabsContent value="matrix">
          <Card>
            <CardHeader action={<RampLegend peak={peak} />}>
              <CardTitle icon={Grid3x3}>Families × plants</CardTitle>
              <CardDescription>Select a family to see its records.</CardDescription>
            </CardHeader>
            <CardContent className="px-0 pb-2">
              <div className="overflow-x-auto">
                <table className="w-full border-separate border-spacing-0 text-[13px]" onMouseLeave={() => setHoverPlant(null)}>
                  <thead>
                    <tr className="text-[11.5px] text-ink-3">
                      <th scope="col" className="sticky left-0 z-10 min-w-[220px] bg-panel py-2 pl-5 pr-3 text-left font-medium">Family</th>
                      {plants.map((p) => (
                        <th key={p} scope="col" className={cn("w-[38px] px-0.5 pb-2 align-bottom font-medium transition-colors", hoverPlant === p && "text-ink-hi")}>
                          <span className="inline-block font-mono text-[11px] tracking-[0.02em] [writing-mode:vertical-rl] rotate-180">{p}</span>
                        </th>
                      ))}
                      <th scope="col" className="px-3 py-2 text-right font-medium">Records</th>
                      <th scope="col" className="min-w-[170px] px-3 py-2 text-left font-medium">Recorded actual loss</th>
                      <th scope="col" className="py-2 pl-3 pr-5 text-right font-medium">Open</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shown.map((f) => {
                      const c = counts.get(f.cluster_key) ?? new Map<string, number>();
                      const isOpen = openKey === f.cluster_key;
                      const name = familyName(f);
                      return (
                        <Fragment key={f.cluster_key}>
                          <tr onClick={() => setOpenKey(isOpen ? null : f.cluster_key)}
                            className={cn("group cursor-pointer [&>*]:border-t [&>*]:border-line [&>*]:transition-colors",
                              isOpen ? "[&>*]:bg-accent-soft" : "hover:[&>*]:bg-fg/[0.035]")}>
                            <th scope="row" className={cn("sticky left-0 z-10 py-2 pl-5 pr-3 text-left font-normal", isOpen ? "bg-[color-mix(in_srgb,var(--accent)_16%,var(--popover-solid))]" : "bg-[var(--popover-solid)] group-hover:bg-[color-mix(in_srgb,var(--ink)_5%,var(--popover-solid))]")}>
                              <button type="button" aria-expanded={isOpen} className="flex w-full items-center gap-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
                                onClick={(e) => { e.stopPropagation(); setOpenKey(isOpen ? null : f.cluster_key); }}>
                                <ChevronRight className={cn("size-3.5 shrink-0 text-ink-3 transition-transform duration-200", isOpen && "rotate-90 text-accent-ink")} aria-hidden="true" />
                                <span className="min-w-0">
                                  <span className={cn("block truncate font-medium", isOpen ? "text-ink-hi" : "text-ink")}>{name}</span>
                                  <span className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-ink-3">
                                    <span className="font-mono">{f.cluster_key}</span>
                                    {f.label && <Badge tone={COHERENCE[f.label.coherence][1]}>{COHERENCE[f.label.coherence][0]}</Badge>}
                                  </span>
                                </span>
                              </button>
                            </th>
                            {plants.map((p) => {
                              const n = c.get(p) ?? 0;
                              return (
                                <td key={p} className={cn("px-0.5 py-1.5 text-center", hoverPlant === p && !isOpen && "bg-fg/[0.03]")}
                                  onMouseEnter={() => setHoverPlant(p)} title={`${name} at ${p}: ${n} record${n === 1 ? "" : "s"}`}>
                                  <span className={cn("mx-auto grid size-[30px] place-items-center rounded-[6px] text-[11.5px] font-medium tabular-nums",
                                    n ? (n / peak > 0.45 ? "text-ink-hi" : "text-accent-ink") : "bg-fg/[0.035] text-transparent")}
                                    style={{ background: cellFill(n, peak) }}>
                                    {n || <span className="sr-only">0</span>}
                                  </span>
                                </td>
                              );
                            })}
                            <td className="px-3 text-right font-medium tabular-nums text-ink-hi">{f.member_ids.length}</td>
                            <td className="px-3">
                              <span className="flex items-center gap-2.5">
                                <span className="h-1.5 w-[84px] shrink-0 overflow-hidden rounded-full bg-fg/[0.07]" aria-hidden="true">
                                  <span className="block h-full rounded-full bg-accent" style={{ width: `${(100 * f.actual_usd) / maxLoss}%` }} />
                                </span>
                                <span className="tabular-nums text-ink-2">{usdM(f.actual_usd)}</span>
                              </span>
                            </td>
                            <td className="pl-3 pr-5 text-right tabular-nums text-ink-2">{f.open_count}</td>
                          </tr>
                          {isOpen && (
                            <tr>
                              <td colSpan={plants.length + 4} className="border-t border-line bg-[rgb(var(--well-rgb)/0.35)] p-0">
                                <FamilyDetail f={f} counts={c} plantsTotal={plants.length}
                                  onRecord={(id) => drawer({ kind: "incident", id })} tagOf={(id) => byId.get(id)?.tag ?? id} />
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="text-[11.5px] text-ink-3">
                      <th scope="row" className="sticky left-0 z-10 border-t border-line-strong bg-panel py-2.5 pl-5 pr-3 text-left font-medium">Families present at the plant</th>
                      {plants.map((p) => (
                        <td key={p} className={cn("border-t border-line-strong py-2.5 text-center tabular-nums", hoverPlant === p ? "text-ink-hi" : "text-ink-2")}>{familiesPerPlant(p)}</td>
                      ))}
                      <td colSpan={3} className="border-t border-line-strong" />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="loss">
          <Card>
            <CardHeader>
              <CardTitle icon={CircleDollarSign}>Recorded actual loss by family</CardTitle>
              <CardDescription>Select a bar to open the family.</CardDescription>
            </CardHeader>
            <CardContent>
              <LossBars fps={[...visible].sort((a, b) => b.actual_usd - a.actual_usd)} onPick={openFamily} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="tw mt-4"><Note>Sharing a family is a reason to compare records, not proof of a shared cause. Each name and hypothesis needs a reliability engineer's review before it drives a fleet action.</Note></div>
    </>
  );
}

function RampLegend({ peak }: { peak: number }) {
  return (
    <div className="flex items-center gap-2 text-[11.5px] text-ink-3" aria-label={`Colour scale from 1 to ${peak} records per cell`}>
      <span className="tabular-nums">1</span>
      <span className="h-2.5 w-28 rounded-full" style={{ background: `linear-gradient(90deg, ${cellFill(1, peak)}, ${cellFill(peak, peak)})` }} aria-hidden="true" />
      <span className="tabular-nums">{peak} records</span>
    </div>
  );
}

function FamilyDetail({ f, counts, plantsTotal, onRecord, tagOf }: {
  f: FP; counts: Map<string, number>; plantsTotal: number; onRecord: (id: string) => void; tagOf: (id: string) => string;
}) {
  const byPlant = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  return (
    <div className="grid gap-5 px-5 py-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]" onClick={(e) => e.stopPropagation()}>
      <div className="flex min-w-0 flex-col gap-3">
        {f.label ? (
          <div className="rounded-lg border border-dashed border-[rgb(var(--ai-rgb)/0.45)] bg-ai-soft px-3.5 py-3 text-[13px] leading-relaxed text-ink">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge tone="ai" dot>Model wrote this</Badge>
              <span className="text-[11.5px] text-ai-ink">Needs a reliability engineer's review</span>
            </div>
            <p><span className="badge b-proposed">Hypothesis</span> {f.label.shared_mechanism_hypothesis}</p>
            <p className="mt-2"><span className="badge b-proposed">Proposed fleet action</span> {f.label.fleet_action}</p>
            <p className="mt-2 text-[12px] text-ink-2">Evidence needed: {f.label.evidence_needed.join("; ")}</p>
          </div>
        ) : (
          <div className="text-[13px] text-ink-2">
            <div className="mb-1.5 text-[12px] text-ink-3">Top clustering terms</div>
            <div className="flex flex-wrap gap-1.5">{f.top_terms.map((t) => <span key={t} className="rounded-md border border-line bg-fg/[0.03] px-1.5 py-0.5 font-mono text-[11.5px] text-ink-2">{t}</span>)}</div>
          </div>
        )}
        <p className="text-[12.5px] text-ink-3">
          {f.plants.length} of {plantsTotal} plants · {usd(f.actual_usd)} recorded actual loss · {f.open_count} of {f.member_ids.length} records open on the review date.
        </p>
        <div>
          <div className="mb-1.5 text-[12px] text-ink-3">Records per plant</div>
          <div className="flex flex-wrap gap-1.5">
            {byPlant.map(([p, n]) => (
              <span key={p} className="inline-flex items-center gap-1.5 rounded-md border border-line bg-fg/[0.03] px-2 py-1 text-[12px]">
                <span className="font-mono text-ink-2">{p}</span><b className="font-medium tabular-nums text-ink-hi">{n}</b>
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="min-w-0">
        <div className="mb-1.5 text-[12px] text-ink-3">Member records · open one to see its register row</div>
        <div className="flex flex-wrap gap-1.5">
          {f.member_ids.slice(0, 24).map((id) => <button key={id} type="button" className="cite" onClick={() => onRecord(id)}>{tagOf(id)}</button>)}
          {f.member_ids.length > 24 && <span className="self-center text-[12px] text-ink-3">+{f.member_ids.length - 24} more</span>}
        </div>
      </div>
    </div>
  );
}

function LossBars({ fps, onPick }: { fps: FP[]; onPick: (key: string) => void }) {
  const data = fps.map((f) => ({ key: f.cluster_key, name: familyName(f), value: f.actual_usd, records: f.member_ids.length }));
  const h = Math.max(220, data.length * 30 + 30);
  return (
    <div style={{ height: h }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }} barCategoryGap="30%">
          <CartesianGrid horizontal={false} />
          <XAxis type="number" tickLine={false} axisLine={false} tickFormatter={(v) => `US$${(Number(v) / 1e6).toFixed(0)}M`} />
          <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} width={190} interval={0}
            tickFormatter={(v: string) => (v.length > 28 ? `${v.slice(0, 27)}…` : v)} />
          <Tooltip cursor={{ fill: "rgb(var(--tint-rgb)/0.05)" }}
            content={rechartsTip({ fmt: (v) => usdM(v), title: (l, p) => <>{String(l)}<span className="block text-[11px] font-normal text-ink-3">{(p[0] as { payload: { key: string; records: number } }).payload.key} · {(p[0] as { payload: { records: number } }).payload.records} records</span></> })} />
          <Bar dataKey="value" name="Recorded actual loss" radius={[4, 4, 4, 4]} maxBarSize={18} background={{ fill: "rgb(var(--tint-rgb)/0.07)", radius: 4 }}
            isAnimationActive animationDuration={600} onClick={(d) => onPick((d as unknown as { key: string }).key)}>
            {data.map((d) => <Cell key={d.key} fill={STATUS_HEX.accent} cursor="pointer" />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
