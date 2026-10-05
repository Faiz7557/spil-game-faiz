// The checkup board at the top of an investigation: a status strip for the machine, the checklist, and the count of
// checks passed with what is holding the case open. Every row is a recorded fact (see domain/checkup.ts).
import type { ElementType, ReactNode } from "react";
import { AlertTriangle, ArrowRight, Building2, CalendarClock, Check, CircleDashed, FileText, Gauge as GaugeIcon, ListChecks, ShieldAlert, UserCheck, Wrench, X } from "lucide-react";
import type { Equipment } from "../../domain/types";
import type { Check as CheckRow, CheckState } from "../../domain/checkup";
import { summarise } from "../../domain/checkup";
import { fmtDate } from "../../domain/kpis";
import { cn } from "@/lib/utils";
import { useDrawer } from "../../components/ui";
import { openSectionTab } from "@/components/ui/section-tabs";

const STATE: Record<CheckState, { Icon: ElementType; cls: string; label: string }> = {
  pass: { Icon: Check, cls: "bg-ok/15 text-ok-ink ring-ok/35", label: "Passed" },
  warn: { Icon: AlertTriangle, cls: "bg-caution/15 text-caution-ink ring-caution/40", label: "At alarm" },
  fail: { Icon: X, cls: "bg-danger/15 text-danger-ink ring-danger/40", label: "Failed" },
  pending: { Icon: CircleDashed, cls: "text-ink-4 ring-line-strong", label: "Pending" },
};

const Panel = ({ children, className, label }: { children: ReactNode; className?: string; label: string }) => (
  <section aria-label={label} className={cn("tw flex min-w-0 flex-col overflow-hidden rounded-2xl border border-line [background:var(--glass),var(--panel)] shadow-[var(--shadow)]", className)}>{children}</section>
);

/** One row of facts about the machine, read left to right. */
export function StatusStrip({ eq, week, pastPlan }: { eq: Equipment; week: number; pastPlan: number }) {
  const row = eq.history[week];
  const open = useDrawer();
  const plantCode = /\(([^)]+)\)/.exec(eq.plant_unit)?.[1];
  const z = row.status === "TRIP" ? "danger" : row.status === "ALARM" ? "caution" : "ok";
  const cells: { Icon: ElementType; k: string; v: ReactNode; href?: string; onClick?: () => void; hint?: string }[] = [
    { Icon: GaugeIcon, k: `Status · week ${week + 1}`, v: <span className={cn("flex items-center gap-2", z === "danger" ? "text-danger-ink" : z === "caution" ? "text-caution-ink" : "text-ok-ink")}><span className={cn("size-2 rounded-full", z === "danger" ? "bg-danger" : z === "caution" ? "bg-caution" : "bg-ok")} />{row.status[0] + row.status.slice(1).toLowerCase()}</span>, onClick: () => openSectionTab("condition"), hint: "Open the condition readings" },
    { Icon: Building2, k: "Plant", v: eq.plant_unit, href: plantCode ? `#/overview/${eq.tag}?plant=${plantCode}` : undefined, hint: "Open the overview filtered to this plant" },
    { Icon: ShieldAlert, k: "Criticality", v: eq.criticality || "Unknown" },
    { Icon: CalendarClock, k: "Route date", v: fmtDate(row.date), onClick: () => openSectionTab("condition"), hint: "Pick another week" },
    { Icon: FileText, k: "Incident", v: <span className="font-mono">{eq.linked_ar || "None"}</span>, onClick: eq.linked_incident ? () => open({ kind: "incident", id: eq.linked_incident! }) : undefined, hint: "Open the register record" },
    { Icon: Wrench, k: "Past plan date", v: <span className={pastPlan ? "text-danger-ink" : ""}>{pastPlan}</span>, href: `#/actions/${eq.tag}?tab=source`, hint: "Open the RCA actions" },
  ];
  return (
    <Panel label="Machine status" className="mb-4">
      <div className="grid grid-cols-2 divide-line sm:grid-cols-3 xl:grid-cols-6 xl:divide-x">
        {cells.map((c) => {
          const cls = "block min-w-0 px-5 py-3.5 text-left no-underline transition-colors";
          const inner = (
            <span className="block min-w-0">
              <span className="flex items-center gap-1.5 truncate text-[12px] text-ink-3"><c.Icon className="size-3.5 shrink-0" strokeWidth={1.8} aria-hidden="true" />{c.k}</span>
              <span className="mt-1 block truncate text-[14.5px] font-medium text-ink-hi" title={typeof c.v === "string" ? c.v : undefined}>{c.v}</span>
            </span>
          );
          return c.href ? <a key={c.k} href={c.href} title={c.hint} className={cn(cls, "hover:bg-fg/[0.04]")}>{inner}</a>
            : c.onClick ? <button key={c.k} type="button" onClick={c.onClick} title={c.hint} className={cn(cls, "hover:bg-fg/[0.04]")}>{inner}</button>
              : <div key={c.k} className={cls}>{inner}</div>;
        })}
      </div>
    </Panel>
  );
}

const GROUPS: { id: CheckRow["group"]; label: string }[] = [
  { id: "condition", label: "Condition" }, { id: "follow-through", label: "Follow-through" }, { id: "closure", label: "Closure" },
];

/** Where a check leads: a reading opens the condition tab, an action opens it on the Actions page. */
export function checkHref(c: CheckRow, tag: string) {
  return c.group === "condition" ? null : `#/actions/${tag}?tab=${c.group === "closure" ? "tracked" : "source"}`;
}

export function Checklist({ checks, active, onActive, tag }: { checks: CheckRow[]; active: number | null; onActive: (i: number | null) => void; tag: string }) {
  const s = summarise(checks);
  return (
    <Panel label="Checkup">
      <div className="px-5 pt-4">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="flex items-center gap-2 text-[15px] font-semibold text-ink-hi"><ListChecks className="size-4 text-accent-ink" strokeWidth={1.7} aria-hidden="true" />Checkup</h2>
          <span className="text-[12.5px] font-medium text-accent-ink tabular-nums">{s.pass} of {s.total} passed</span>
        </div>
        <div className="mt-3 flex h-1.5 gap-[2px] overflow-hidden rounded-full" aria-hidden="true">
          {checks.map((c) => <span key={c.id} className={cn("flex-1", c.state === "pass" ? "bg-ok" : c.state === "fail" ? "bg-danger" : c.state === "warn" ? "bg-caution" : "bg-fg/10")} />)}
        </div>
      </div>
      <div className="mt-2 flex-1 px-2 pb-2">
        {GROUPS.map((g) => {
          const rows = checks.filter((c) => c.group === g.id);
          if (!rows.length) return null;
          return (
            <div key={g.id} className="mt-2">
              <h3 className="px-3 py-1.5 text-[12px] font-medium text-ink-3">{g.label}</h3>
              <ul>
                {rows.map((c) => {
                  const st = STATE[c.state];
                  const hot = c.param !== undefined && active === c.param;
                  return (
                    <li key={c.id} onMouseEnter={() => c.param !== undefined && onActive(c.param)} onMouseLeave={() => c.param !== undefined && onActive(null)}>
                      <a href={checkHref(c, tag) ?? undefined} onClick={(e) => { if (!checkHref(c, tag)) { e.preventDefault(); openSectionTab("condition"); } }}
                        className={cn("flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-inherit no-underline transition-colors", hot ? "bg-accent-soft" : "hover:bg-fg/[0.04]")}>
                      <span className="grid size-7 shrink-0 place-items-center rounded-md border border-line bg-fg/[0.03] font-mono text-[11px] font-semibold text-ink-2">
                        {c.param !== undefined ? c.param + 1 : c.group === "closure" ? <UserCheck className="size-3.5" aria-hidden="true" /> : <Wrench className="size-3.5" aria-hidden="true" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] leading-snug text-ink" title={c.label}>{c.label}</span>
                        <span className="block truncate text-[11.5px] leading-snug text-ink-3">{c.detail}</span>
                      </span>
                      <span className={cn("grid size-6 shrink-0 place-items-center rounded-full ring-1", st.cls)} title={st.label}>
                        <st.Icon className="size-3.5" strokeWidth={2.4} aria-hidden="true" /><span className="sr-only">{st.label}</span>
                      </span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

/** Half-ring of checks passed, then the checks holding the case open. */
export function ChecksScore({ checks, actionsHref, tag }: { checks: CheckRow[]; actionsHref: string; tag: string }) {
  const s = summarise(checks);
  const f = s.total ? s.pass / s.total : 0;
  const r = 80, C = Math.PI * r;
  const cond = checks.filter((c) => c.group === "condition");
  const acts = checks.filter((c) => c.group === "follow-through");
  const lines: { ok: boolean; text: string }[] = [
    { ok: cond.every((c) => c.state === "pass"), text: `${cond.filter((c) => c.state === "pass").length} of ${cond.length} readings inside their limits` },
    { ok: acts.every((c) => c.state !== "fail"), text: `${acts.filter((c) => c.state === "pass").length} of ${acts.length} RCA actions closed` },
    { ok: checks.some((c) => c.group === "closure" && c.state === "pass"), text: checks.some((c) => c.group === "closure" && c.state === "pass") ? "Effectiveness verified" : "Reviewer verification still open" },
  ];
  const issues = checks.filter((c) => c.state === "fail" || c.state === "warn");
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <Panel label="Checks passed" className="px-5 py-4">
        <h2 className="text-[15px] font-semibold text-ink-hi">Checks passed</h2>
        <div className="relative mx-auto mt-3 w-full max-w-[220px]">
          <svg viewBox="0 0 200 110" className="w-full" aria-hidden="true">
            <path d="M20 100 A80 80 0 0 1 180 100" fill="none" style={{ stroke: "rgb(var(--tint-rgb) / 0.13)" }} strokeWidth="16" strokeLinecap="round" />
            <path d="M20 100 A80 80 0 0 1 180 100" fill="none" style={{ stroke: s.fail ? "var(--caution)" : "var(--ok)" }} strokeWidth="16" strokeLinecap="round"
              strokeDasharray={`${Math.max(0.01, f * C)} ${C}`} className="transition-[stroke-dasharray] duration-700 ease-out-soft" />
          </svg>
          <div className="absolute inset-x-0 bottom-0 text-center">
            <span className="text-[34px] font-semibold leading-none tracking-[-0.02em] text-ink-hi tabular-nums">{s.pass}</span>
            <span className="text-[16px] text-ink-3 tabular-nums"> / {s.total}</span>
          </div>
        </div>
        <ul className="mt-4 space-y-2 text-[13px]">
          {lines.map((l) => (
            <li key={l.text} className="flex items-start gap-2 text-ink-2">
              {l.ok ? <Check className="mt-0.5 size-4 shrink-0 text-ok" strokeWidth={2.2} aria-hidden="true" /> : <CircleDashed className="mt-0.5 size-4 shrink-0 text-caution" strokeWidth={2.2} aria-hidden="true" />}
              {l.text}
            </li>
          ))}
        </ul>
      </Panel>
      <Panel label="Holding the case open" className="flex-1 px-5 py-4">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-[15px] font-semibold text-ink-hi"><AlertTriangle className="size-4 text-caution" strokeWidth={1.8} aria-hidden="true" />Holding it open</h2>
          {issues.length > 0 && <span className="rounded-full bg-caution/15 px-2 py-0.5 text-[12px] font-medium text-caution-ink tabular-nums">{issues.length}</span>}
        </div>
        {issues.length ? (
          <ul className="mt-3 space-y-2">
            {issues.slice(0, 3).map((c) => (
              <li key={c.id}><a href={checkHref(c, tag) ?? undefined} onClick={(e) => { if (!checkHref(c, tag)) { e.preventDefault(); openSectionTab("condition"); } }} className={cn("block cursor-pointer rounded-lg border px-3 py-2.5 no-underline transition-[transform,border-color] duration-150 hover:-translate-y-0.5", c.state === "fail" ? "border-danger/30 bg-danger/[0.06] hover:border-danger/50" : "border-caution/30 bg-caution/[0.06] hover:border-caution/50")}>
                <p className="line-clamp-2 text-[13px] font-medium leading-snug text-ink">{c.label}</p>
                <p className={cn("mt-0.5 text-[12px]", c.state === "fail" ? "text-danger-ink" : "text-caution-ink")}>{c.detail}</p>
              </a></li>
            ))}
          </ul>
        ) : <p className="mt-3 text-[13px] text-ink-3">Nothing failed in this week's checks.</p>}
        <a href={actionsHref} className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-accent-ink no-underline hover:text-accent-hover">
          {issues.length > 3 ? `All ${issues.length} in actions` : "Open actions"}<ArrowRight className="size-3.5" aria-hidden="true" />
        </a>
      </Panel>
    </div>
  );
}
