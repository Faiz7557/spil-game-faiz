import { useState, type ElementType } from "react";
import { Ban, Check, CircleCheck, CircleDashed, FileSpreadsheet, LoaderCircle, Lock, Presentation, Rocket, ShieldCheck, TriangleAlert, Upload } from "lucide-react";
import { api } from "../lib/api";
import { LIVE, supabase } from "../lib/supabase";
import { useSession } from "../lib/session";
import { errorText } from "../lib/live";
import { Empty, Note } from "../components/ui";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { StatTile } from "@/components/ui/stat-tile";
import { Badge, type Tone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Kind = "incident" | "equipment" | "production" | "rca";
interface Gate { id: string; gate: string; description: string; pass: boolean; blocking: boolean; detail: string }
interface IngestResult { snapshotId: string; checks: Gate[]; blocking: Gate[]; counts: { incidents: number; equipment: number; hourly: number; rca: number } }

const KINDS: { kind: Kind; label: string; accept: string; multiple: boolean; hint: string; icon: ElementType; required?: boolean }[] = [
  { kind: "incident", label: "Incident Database", accept: ".xlsx", multiple: false, hint: "One workbook, sheet 'Incident Database'", icon: FileSpreadsheet, required: true },
  { kind: "equipment", label: "Equipment Performance", accept: ".xlsx", multiple: true, hint: "One workbook per asset", icon: FileSpreadsheet },
  { kind: "production", label: "Production Data (hourly PI)", accept: ".xlsx", multiple: true, hint: "One workbook per asset", icon: FileSpreadsheet },
  { kind: "rca", label: "RCA decks", accept: ".pptx", multiple: true, hint: "File name should contain the asset tag", icon: Presentation },
];

type StepState = "done" | "current" | "todo" | "blocked";
function Stepper({ steps }: { steps: { label: string; sub: string; state: StepState }[] }) {
  return (
    <ol className="tw mb-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-4" aria-label="Ingest progress">
      {steps.map((s, i) => (
        <li key={s.label} aria-current={s.state === "current" ? "step" : undefined}
          className={cn("flex items-center gap-3 rounded-xl border px-3.5 py-2.5 transition-colors duration-200",
            s.state === "current" ? "border-line-hot bg-accent-soft" : s.state === "blocked" ? "border-[rgb(var(--danger-rgb)/0.35)] bg-danger-soft" : "border-line bg-fg/[0.02]")}>
          <span className={cn("grid size-7 shrink-0 place-items-center rounded-full border text-[12px] font-semibold tabular-nums",
            s.state === "done" ? "border-[rgb(var(--ok-rgb)/0.45)] bg-ok-soft text-ok-ink"
              : s.state === "current" ? "border-accent bg-accent text-white"
                : s.state === "blocked" ? "border-danger text-danger-ink" : "border-line-strong text-ink-3")}>
            {s.state === "done" ? <Check className="size-3.5" aria-hidden="true" /> : s.state === "blocked" ? <Ban className="size-3.5" aria-hidden="true" /> : i + 1}
          </span>
          <span className="min-w-0">
            <span className={cn("block text-[13px] font-medium", s.state === "todo" ? "text-ink-3" : "text-ink")}>{s.label}</span>
            <span className="block truncate text-[11.5px] text-ink-3">{s.sub}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

export default function Ingest() {
  const { profile } = useSession();
  const [files, setFiles] = useState<Record<Kind, File[]>>({ incident: [], equipment: [], production: [], rca: [] });
  const [label, setLabel] = useState("");
  const [reviewDate, setReviewDate] = useState(new Date().toISOString().slice(0, 10));
  const [result, setResult] = useState<IngestResult | null>(null);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [reason, setReason] = useState("");
  const [published, setPublished] = useState(false);

  if (!LIVE) return <Empty title="Ingestion needs the hosted version">New source files are uploaded to private storage and checked on the server. The offline demo runs on the bundled snapshot.</Empty>;
  if (profile && profile.role !== "data_owner")
    return <Empty title="Data owners only">Ingesting and publishing a snapshot needs the data_owner role. Your role is {profile.role.replace("_", " ")}{profile.is_demo ? " (guest)" : ""}.</Empty>;

  const total = Object.values(files).reduce((s, f) => s + f.length, 0);
  const run = async () => {
    setErr(""); setResult(null); setPublished(false);
    try {
      const uploaded: { path: string; kind: Kind }[] = [];
      let n = 0;
      for (const { kind } of KINDS) for (const f of files[kind]) {
        setBusy(`Uploading ${++n} of ${total}: ${f.name}`);
        const u = await api<{ path: string; token: string }>("/api/ingest/upload-url", { body: { fileName: f.name } });
        const { error } = await supabase!.storage.from("sources").uploadToSignedUrl(u.path, u.token, f);
        if (error) throw error;
        uploaded.push({ path: u.path, kind });
      }
      setBusy("Extracting and running the quality gates…");
      setResult(await api<IngestResult>("/api/ingest", { body: { label, reviewDate, files: uploaded } }));
    } catch (e) { setErr(errorText(e, "Ingest failed.")); } finally { setBusy(""); }
  };
  const publish = async () => {
    if (!result || reason.trim().length < 5) return;
    try { await api("/api/ingest/publish", { body: { snapshotId: result.snapshotId, reason } }); setPublished(true); }
    catch (e) { setErr(errorText(e, "Publish failed.")); }
  };

  const labelOk = label.trim().length >= 3;
  const filesOk = files.incident.length > 0;
  const blocked = !!result && result.blocking.length > 0;
  const canRun = !busy && labelOk && filesOk;
  const warnings = result ? result.checks.filter((c) => !c.pass && !c.blocking).length : 0;
  const passed = result ? result.checks.filter((c) => c.pass).length : 0;

  const steps: { label: string; sub: string; state: StepState }[] = [
    { label: "Name the snapshot", sub: labelOk ? label.trim() : "At least 3 characters", state: labelOk ? "done" : "current" },
    { label: "Add source files", sub: total ? `${total} file${total > 1 ? "s" : ""} selected` : "Incident Database required", state: filesOk ? "done" : labelOk ? "current" : "todo" },
    { label: "Run quality gates", sub: busy ? "Running…" : result ? (blocked ? `${result.blocking.length} blocking` : "No blocking gate") : "Ingest to staging", state: blocked ? "blocked" : result ? "done" : labelOk && filesOk ? "current" : "todo" },
    { label: "Publish", sub: published ? "Published" : "Reason recorded in audit log", state: published ? "done" : result && !blocked ? "current" : "todo" },
  ];

  const gateState: { tone: Tone; icon: ElementType; title: string; body: string } =
    published ? { tone: "ok", icon: CircleCheck, title: "Published", body: "The new snapshot is live. Reload to work on it." }
      : busy ? { tone: "info", icon: LoaderCircle, title: "Running", body: busy }
        : blocked ? { tone: "danger", icon: Ban, title: "Blocked", body: "A blocking gate failed. This staging snapshot cannot be published." }
          : result ? { tone: "ok", icon: ShieldCheck, title: "Ready to publish", body: "No blocking gate failed. Review the warnings, then publish." }
            : canRun ? { tone: "accent", icon: CircleDashed, title: "Ready to run", body: "Upload and check the files in staging. Nothing is visible to users yet." }
              : { tone: "neutral", icon: Lock, title: "Waiting for inputs", body: !labelOk ? "Give the snapshot a label." : "An Incident Database workbook is required." };
  const GateIcon = gateState.icon;

  return (
    <>
      <PageHeader title="Ingest a new snapshot"
        description="New exports run through the same pipeline and gates. Nothing is visible until you publish." />

      <Stepper steps={steps} />

      <div className="tw grid items-start gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle icon={Upload}>Source files</CardTitle>
            <CardDescription>Only the Incident Database is required.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="field"><span>Snapshot label</span><input className="input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. October 2026 export" /></label>
              <label className="field"><span>Review date</span><input className="input" type="date" value={reviewDate} onChange={(e) => setReviewDate(e.target.value)} /></label>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {KINDS.map((k) => {
                const list = files[k.kind];
                const Icon = k.icon;
                return (
                  <label key={k.kind}
                    className={cn("group relative flex min-h-[132px] cursor-pointer flex-col gap-2 rounded-xl border-[1.5px] border-dashed p-4 transition-[border-color,background-color] duration-150",
                      "focus-within:ring-2 focus-within:ring-ring",
                      list.length ? "border-solid border-[rgb(var(--ok-rgb)/0.4)] bg-ok-soft" : "border-line-strong bg-[rgb(var(--well-rgb)/0.35)] hover:border-accent hover:bg-accent-soft")}>
                    <span className="flex items-start justify-between gap-2">
                      <span className={cn("grid size-8 place-items-center rounded-lg border", list.length ? "border-[rgb(var(--ok-rgb)/0.4)] text-ok-ink" : "border-line-strong text-ink-3 group-hover:text-accent-ink")}>
                        {list.length ? <Check className="size-4" aria-hidden="true" /> : <Icon className="size-4" aria-hidden="true" />}
                      </span>
                      {list.length
                        ? <Badge tone="ok">{list.length} file{list.length > 1 ? "s" : ""}</Badge>
                        : k.required ? <Badge tone="warn">Required</Badge> : <Badge>Optional</Badge>}
                    </span>
                    <span className="text-[13.5px] font-medium text-ink-hi">{k.label}</span>
                    <span className="text-[12px] leading-snug text-ink-3">
                      {list.length ? <span className="break-all text-ink-2">{list.map((f) => f.name).join(", ")}</span> : <>{k.hint} · {k.accept} · {k.multiple ? "choose files" : "choose a file"}</>}
                    </span>
                    <input type="file" className="sr-only" multiple={k.multiple} accept={k.accept} onChange={(e) => setFiles({ ...files, [k.kind]: [...(e.target.files ?? [])] })} />
                  </label>
                );
              })}
            </div>
            {err && <Note tone="danger">{err}</Note>}
          </CardContent>
          <CardFooter>
            <Button variant="primary" disabled={!canRun} onClick={run}>
              {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Upload className="size-4" aria-hidden="true" />}
              {busy || "Ingest to staging"}
            </Button>
            {!filesOk && <span className="text-[12px] text-ink-3">An Incident Database workbook is required.</span>}
          </CardFooter>
        </Card>

        <aside className="flex flex-col gap-3 xl:sticky xl:top-4" aria-label="Publish gate">
          <Card aria-live="polite">
            <CardHeader action={<Badge tone={gateState.tone} dot pulse={!!busy}>{gateState.title}</Badge>}>
              <CardTitle icon={ShieldCheck}>Publish gate</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex items-start gap-3">
                <GateIcon className={cn("mt-0.5 size-5 shrink-0", busy && "animate-spin",
                  gateState.tone === "ok" ? "text-ok" : gateState.tone === "danger" ? "text-danger" : gateState.tone === "info" ? "text-info" : gateState.tone === "accent" ? "text-accent" : "text-ink-3")} aria-hidden="true" />
                <p className="text-[13px] leading-relaxed text-ink-2">{gateState.body}</p>
              </div>
              {result && (
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg border border-line px-2 py-2"><div className="text-[18px] font-semibold tabular-nums text-ok-ink">{passed}</div><div className="text-[11px] text-ink-3">pass</div></div>
                  <div className="rounded-lg border border-line px-2 py-2"><div className="text-[18px] font-semibold tabular-nums text-caution-ink">{warnings}</div><div className="text-[11px] text-ink-3">warning{warnings === 1 ? "" : "s"}</div></div>
                  <div className="rounded-lg border border-line px-2 py-2"><div className="text-[18px] font-semibold tabular-nums text-danger-ink">{result.blocking.length}</div><div className="text-[11px] text-ink-3">blocking</div></div>
                </div>
              )}
              {published ? (
                <Note tone="ok">Published. <a href="#" onClick={(e) => { e.preventDefault(); window.location.reload(); }}>Reload</a> to work on the new snapshot.</Note>
              ) : result && result.blocking.length === 0 && (
                <div className="flex flex-col gap-3 border-t border-line pt-4">
                  <label className="field"><span>Why publish this snapshot? (recorded in the audit log)</span>
                    <input className="input" value={reason} onChange={(e) => setReason(e.target.value)} /></label>
                  <Button variant="primary" className="self-start" disabled={reason.trim().length < 5} onClick={publish}><Rocket className="size-4" aria-hidden="true" />Publish snapshot</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>

      {result && (
        <div className="tw mt-6 flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile accent="var(--series-1)" label="Incidents" value={result.counts.incidents} context="Register rows extracted" />
            <StatTile accent="var(--series-2)" label="Assets" value={result.counts.equipment} context="Equipment workbooks" />
            <StatTile accent="var(--series-3)" label="Hourly series" value={result.counts.hourly} context="Production (PI) series" />
            <StatTile accent="var(--series-4)" label="RCA decks" value={result.counts.rca} context="Decks matched to a tag" />
          </div>
          <Card>
            <CardHeader>
              <CardTitle icon={ShieldCheck}>Quality gates</CardTitle>
              <CardDescription>{result.counts.incidents} incidents · {result.counts.equipment} assets · {result.counts.hourly} hourly series · {result.counts.rca} RCA decks</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {result.blocking.length > 0
                ? <Note tone="danger">{result.blocking.length} blocking gate{result.blocking.length > 1 ? "s" : ""} failed. Fix the source files and ingest again; this staging snapshot cannot be published.</Note>
                : <Note tone="ok" icon={<CircleCheck />}>No blocking gate failed. Review the warnings, then publish.</Note>}
              <div className="overflow-x-auto">
                <table className="table">
                  <thead><tr><th>Gate</th><th>Check</th><th>Detail</th><th className="r">Result</th></tr></thead>
                  <tbody>{result.checks.map((c) => (
                    <tr key={c.id}><td><span className="badge">{c.gate}</span></td><td>{c.description}</td><td className="small mono">{c.detail || "—"}</td>
                      <td className="r">{c.pass ? <Badge tone="ok"><Check aria-hidden="true" />pass</Badge>
                        : <Badge tone={c.blocking ? "danger" : "warn"}>{c.blocking ? <Ban aria-hidden="true" /> : <TriangleAlert aria-hidden="true" />}{c.blocking ? "blocking" : "warning"}</Badge>}</td></tr>
                  ))}</tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
