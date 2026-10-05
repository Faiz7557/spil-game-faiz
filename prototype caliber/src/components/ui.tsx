import { createContext, useContext, useEffect, useState, type ElementType, type ReactNode } from "react";
import { FileText, Info, Inbox, Quote, Rows3, X } from "lucide-react";
import { EVIDENCE, SNAP, incidentById } from "../domain/data";
import { fmtDate, usd } from "../domain/kpis";
import { IconConflict, IconInfo, IconWarn } from "./Icons";

export type DrawerTarget =
  | { kind: "evidence"; id: string }
  | { kind: "source"; id: string; loc?: string }
  | { kind: "incident"; id: string }
  | { kind: "info"; title: string; body: ReactNode };

const DrawerCtx = createContext<(t: DrawerTarget | null) => void>(() => {});
export const useDrawer = () => useContext(DrawerCtx);

export function DrawerProvider({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<DrawerTarget | null>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setTarget(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return (
    <DrawerCtx.Provider value={setTarget}>
      {children}
      {target && <Drawer target={target} onClose={() => setTarget(null)} />}
    </DrawerCtx.Provider>
  );
}

const TYPE_LABEL: Record<string, string> = {
  observed: "Observed", documented_finding: "Documented finding", proposed: "Hypothesis",
  simulated: "Simulated", conflict: "Conflict",
};

export function TypeBadge({ type }: { type: string }) {
  return <span className={`badge b-${type}`}>{type === "conflict" && <IconConflict />}{TYPE_LABEL[type] ?? type}</span>;
}

/** Where a figure comes from: file, location, path, fingerprint and the two times that must not be confused. */
function SourceMeta({ id, loc }: { id: string; loc?: string }) {
  const s = SNAP.sources[id];
  if (!s) return <p className="muted small">Curated by the PlantPulse team from the sources it cites.</p>;
  return (
    <div className="tw overflow-hidden rounded-xl border border-line bg-[rgb(var(--well-rgb)/0.35)]">
      <div className="flex items-start gap-3 border-b border-line px-4 py-3">
        <FileText className="mt-0.5 size-4 shrink-0 text-accent-ink" strokeWidth={1.8} aria-hidden="true" />
        <div className="min-w-0">
          <div className="break-words text-[13.5px] font-medium text-ink-hi"><span className="font-mono text-accent-ink">{s.id}</span> · {s.file_name}</div>
          {loc && <div className="mt-0.5 text-[12.5px] text-ink-2">{loc}</div>}
        </div>
      </div>
      <dl className="kv px-4 py-3.5">
        <dt>Source</dt><dd><b>{s.id}</b> · {s.file_name}</dd>
        {loc && <><dt>Location</dt><dd>{loc}</dd></>}
        <dt>Path</dt><dd className="mono">{s.relative_path}</dd>
        <dt>SHA-256</dt><dd className="mono">{s.sha256.slice(0, 16)}…{s.sha256.slice(-8)}</dd>
        <dt>Source updated</dt><dd>{s.source_updated_at ?? <span className="badge b-warn">Unknown — no publication time in file</span>}</dd>
        <dt>Ingested</dt><dd>{fmtDate(s.ingested_at)} (snapshot extraction)</dd>
      </dl>
    </div>
  );
}

const KIND_META: Record<DrawerTarget["kind"], { label: string; icon: ElementType }> = {
  evidence: { label: "Evidence", icon: Quote },
  source: { label: "Source file", icon: FileText },
  incident: { label: "Register record", icon: Rows3 },
  info: { label: "Detail", icon: Info },
};

function Drawer({ target, onClose }: { target: DrawerTarget; onClose: () => void }) {
  let title: ReactNode = "";
  let body: ReactNode = null;
  if (target.kind === "evidence") {
    const e = EVIDENCE.get(target.id);
    title = e ? <>{e.id} · {e.title}</> : target.id;
    body = e ? (
      <div className="stack">
        <div className="row"><TypeBadge type={e.type} /></div>
        <figure className="m-0">
          <figcaption className="mb-1.5 text-[12px] text-ink-3">Excerpt as recorded</figcaption>
          <div className="excerpt">{e.excerpt}</div>
        </figure>
        <SourceMeta id={e.source} loc={e.loc} />
      </div>
    ) : (
      <div className="note danger"><IconWarn /><div><b>Evidence not found.</b> This citation does not resolve to any source, so the claim that uses it cannot be shown as supported.</div></div>
    );
  } else if (target.kind === "source") {
    title = <>Source {target.id}</>;
    body = <SourceMeta id={target.id} loc={target.loc} />;
  } else if (target.kind === "incident") {
    const i = incidentById(target.id);
    title = i ? <>{i.tag} · register row {i.src.row}</> : target.id;
    body = i ? (
      <div className="stack">
        <div className="tw grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-line px-3.5 py-3">
            <div className="text-[11.5px] text-ink-3">Actual loss · recorded</div>
            <div className="mt-1 text-[18px] font-semibold tabular-nums tracking-[-0.02em] text-ink-hi">{usd(i.actual_usd)}</div>
          </div>
          <div className="rounded-xl border border-line px-3.5 py-3">
            <div className="text-[11.5px] text-ink-3">Downtime · recorded</div>
            <div className="mt-1 text-[18px] font-semibold tabular-nums tracking-[-0.02em] text-ink-hi">{i.downtime_h} h</div>
          </div>
        </div>
        <dl className="kv">
          <dt>Snapshot ID</dt><dd className="mono">{i.id}</dd>
          <dt>AR (raw)</dt><dd>{i.ar_raw}{i.ar === null && <> <span className="badge b-warn">Placeholder — not used for joins</span></>}</dd>
          <dt>Plant / tag</dt><dd>{i.plant} · {i.tag} · Class {i.eq_class}</dd>
          <dt>Title</dt><dd>{i.title}</dd>
          <dt>Occurred</dt><dd>{fmtDate(i.occurred)}</dd>
          <dt>Highest impact</dt><dd>{i.impact}</dd>
          <dt>Status</dt><dd>{i.status}</dd>
          <dt>PIC (RCA)</dt><dd>{i.pic_rca}</dd>
          <dt>RCA due</dt><dd>{fmtDate(i.rca_due)}</dd>
          <dt>Type / component</dt><dd>{i.eq_type} · {i.component} · {i.mechanism}</dd>
          <dt>Downtime</dt><dd>{i.downtime_h} h</dd>
          <dt>Actual loss</dt><dd>{usd(i.actual_usd)}</dd>
          <dt>Potential loss</dt><dd>{usd(i.potential_usd)} <span className="muted">(source estimate)</span></dd>
        </dl>
        <SourceMeta id={i.src.source} loc={`${i.src.sheet} · row ${i.src.row}`} />
      </div>
    ) : null;
  } else {
    title = target.title;
    body = target.body;
  }
  const meta = KIND_META[target.kind];
  const KindIcon = meta.icon;
  return (
    <>
      <div className="drawer-scrim" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-modal="true" aria-label="Source detail">
        <div className="tw flex items-start gap-3 border-b border-line bg-[radial-gradient(380px_140px_at_0%_0%,rgb(var(--accent-rgb)/0.14),transparent_70%)] px-5 py-4">
          <span className="grid size-9 shrink-0 place-items-center rounded-[10px] border border-line-strong bg-accent-soft text-accent-ink" aria-hidden="true">
            <KindIcon className="size-4" strokeWidth={1.8} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="break-words text-[16px] font-semibold leading-snug tracking-[-0.01em] text-ink-hi">{title}</h2>
            <p className="mt-0.5 text-[12px] text-ink-3">{meta.label}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close"
            className="grid size-8 shrink-0 place-items-center rounded-lg text-ink-3 transition-colors hover:bg-fg/[0.06] hover:text-ink-hi focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
        <div className="drawer-body">{body}</div>
      </aside>
    </>
  );
}

export function Cite({ id, withheld }: { id: string; withheld?: Set<string> }) {
  const open = useDrawer();
  const missing = !EVIDENCE.has(id) || withheld?.has(id);
  return (
    <button className={`cite${missing ? " missing" : ""}`} onClick={() => open({ kind: "evidence", id })}
      title={missing ? "Source unavailable" : "Open source"}>{id}</button>
  );
}

export function Note({ tone = "", icon, children }: { tone?: "" | "warn" | "danger" | "ok" | "sim"; icon?: ReactNode; children: ReactNode }) {
  return <div className={`note ${tone}`}>{icon ?? (tone === "warn" || tone === "danger" ? <IconWarn /> : <IconInfo />)}<div>{children}</div></div>;
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <span className="tw mx-auto mb-3 grid size-10 place-items-center rounded-xl border border-line-strong bg-fg/[0.03] text-ink-3" aria-hidden="true">
        <Inbox className="size-[18px]" strokeWidth={1.8} />
      </span>
      <h3>{title}</h3>
      {children && <div className="mx-auto max-w-[52ch] text-[13.5px] leading-relaxed">{children}</div>}
    </div>
  );
}
