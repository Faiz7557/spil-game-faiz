import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ArrowRight, BookOpen, Check, ChevronsUpDown, Cog, Database, LogOut, Menu, MessageSquareText, PanelLeftClose, PanelLeftOpen, RotateCcw, Search, X,
} from "lucide-react";
import { SidebarNav, type NavGroupData, type NavItemData } from "@/components/ui/dashboard-sidebar";
import { CommandPalette, type CommandItem } from "@/components/ui/command-palette";
import { cn } from "@/lib/utils";
import { plainName } from "../../domain/names";
import { ThemeToggle } from "@/components/ThemeBackdrop";
import { REVIEW_DATE, SNAP } from "../../domain/data";
import { fmtDate, kpis } from "../../domain/kpis";
import { actionDue } from "../../domain/queue";
import { isStorageOk, resetDemo, useDemo } from "../../domain/store";
import { LIVE, OPEN } from "../../lib/supabase";
import { useSession } from "../../lib/session";
import { useDrawer } from "../ui";
import type { Page, Route } from "../../App";
import { PAGES_META, WORKFLOW, metaFor } from "./nav";

const ROLE_LABEL: Record<string, string> = { viewer: "Viewer", engineer: "Engineer", reviewer: "Reviewer", manager: "Manager", data_owner: "Data owner" };
const COLLAPSE_KEY = "plantpulse.sidebar.collapsed";

const readCollapsed = () => { try { return localStorage.getItem(COLLAPSE_KEY) === "1"; } catch { return false; } };
const href = (page: Page, tag: string) => `#/${page}/${tag}`;
/** Open the copilot, optionally with a question already typed in for the reader to send. */
export const openCopilot = (question?: string) => window.dispatchEvent(new CustomEvent("plantpulse:copilot", { detail: { question: typeof question === "string" ? question : undefined } }));

/** Counts that tell a planner where work is waiting, computed from the snapshot, never estimated. */
function useCounts() {
  return useMemo(() => {
    const overdue = SNAP.rca.flatMap((r) => [...r.actions, ...r.preventive])
      .filter((a) => { const d = actionDue(a, REVIEW_DATE); return d === "plan_passed" || d === "no_status_plan_passed"; }).length;
    const k = kpis(SNAP.incidents, SNAP.meta.open_statuses, REVIEW_DATE);
    return { overdue, rcaDuePassed: k.rcaDuePassed, packages: SNAP.equipment.length, open: k.open };
  }, []);
}

/** The equipment tag as a mark: mono tag number in a punched plate. Shared by the switcher, header and pages. */
export function TagChip({ tag, className, size = "sm", named = size === "md" }: { tag: string; className?: string; size?: "sm" | "md"; named?: boolean }) {
  const name = plainName(tag);
  if (named && name !== tag) return (
    <span className={cn("inline-flex min-w-0 shrink items-center gap-2 rounded-md border border-line-strong bg-fg/[0.04] leading-none",
      size === "sm" ? "h-6 px-2 text-[12.5px]" : "h-7 px-2.5 text-[13.5px]", className)} title={`${name} · tag ${tag}`}>
      <span className="truncate font-sans font-semibold tracking-[-0.005em] text-ink-hi">{name}</span>
      <span className="shrink-0 font-mono text-[0.82em] font-medium text-ink-3">{tag}</span>
    </span>
  );
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-md border border-line-strong bg-fg/[0.04] font-mono font-medium leading-none tracking-[-0.01em] text-ink-hi",
      size === "sm" ? "h-6 px-1.5 text-[12px]" : "h-7 px-2 text-[13.5px]", className)}>
      <span className="size-[5px] rounded-full bg-ground shadow-[0_0_0_1.5px_rgb(var(--tint-rgb)/0.55)]" aria-hidden="true" />{tag}
    </span>
  );
}

/** The workspace switcher of the source component, repurposed: the "workspace" here is the active case. */
function CaseSwitcher({ route, collapsed }: { route: Route; collapsed: boolean }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const eq = SNAP.equipment.find((e) => e.tag === route.tag)!;
  const perCase = metaFor(route.page).perCase;
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown); window.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); window.removeEventListener("keydown", onKey); };
  }, [open]);

  return (
    <div ref={box} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="true"
        title={collapsed ? `Active case ${eq.tag}: ${eq.name}` : undefined}
        className={cn("group relative flex w-full items-center gap-2.5 overflow-hidden rounded-xl border border-line bg-[linear-gradient(135deg,rgb(var(--accent-rgb)/0.14),rgb(var(--accent-rgb)/0.02)_60%)] text-left transition-[border-color,box-shadow] duration-200 hover:border-line-hot focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
          collapsed ? "justify-center p-1.5" : "px-2.5 py-2.5")}>
        <span className="relative grid size-9 shrink-0 place-items-center rounded-lg border border-line-strong bg-ground-2 text-accent-ink" aria-hidden="true">
          <span className="absolute left-1/2 top-[5px] size-[5px] -translate-x-1/2 rounded-full bg-ground shadow-[0_0_0_1.5px_rgb(var(--tint-rgb)/0.5)]" />
          <span className="mt-2 font-mono text-[9.5px] font-semibold">{eq.tag.split("-")[0]}</span>
        </span>
        {!collapsed && (
          <>
            <span className="min-w-0 flex-1">
              <span className="block text-[11.5px] font-medium text-ink-4">Active case</span>
              <span className="block truncate text-[14.5px] font-semibold leading-tight text-ink-hi">{plainName(eq.tag)}</span>
              <span className="block truncate font-mono text-[11.5px] text-ink-3">{eq.tag}</span>
            </span>
            <ChevronsUpDown className="size-4 shrink-0 text-ink-4 transition-colors group-hover:text-ink-hi" aria-hidden="true" />
          </>
        )}
      </button>
      {open && (
        <div role="menu" aria-label="Switch active case"
          className="absolute left-0 top-full z-50 mt-2 w-[310px] overflow-hidden rounded-xl border border-line-strong [background:linear-gradient(180deg,rgb(var(--glass-rgb)/0.07),rgb(var(--glass-rgb)/0.02)),var(--popover-solid)] p-1.5 text-card-foreground shadow-[0_24px_60px_-12px_rgb(var(--shade-rgb)/calc(0.85*var(--shade-k)))] [animation:pp-pop_160ms_cubic-bezier(0.16,1,0.3,1)]">
          <p className="px-2.5 pb-2 pt-1.5 text-[12px] leading-snug text-ink-3">Equipment with a full evidence package. Pages that work per case follow this choice.</p>
          {SNAP.equipment.map((e) => {
            const on = e.tag === eq.tag;
            return (
              <a key={e.tag} role="menuitem" href={href(perCase ? route.page : "queue", e.tag)} onClick={() => setOpen(false)}
                className={cn("flex items-center gap-3 rounded-lg px-2.5 py-2 transition-colors", on ? "bg-accent-soft shadow-[inset_0_0_0_1px_rgb(var(--accent-rgb)/0.25)]" : "hover:bg-fg/[0.05]")}>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-semibold text-ink-hi">{plainName(e.tag)}</span>
                  <span className="block truncate text-[11.5px] text-ink-3"><span className="font-mono">{e.tag}</span> · {e.plant_unit} · {e.criticality ?? "unknown"} criticality</span>
                </span>
                {on && <Check className="size-4 text-accent-ink" aria-hidden="true" />}
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Where the engineer is in the four-stop path for this case, and the one obvious next step. */
export function WorkflowBar({ route }: { route: Route }) {
  const i = WORKFLOW.indexOf(route.page);
  if (i < 0) return null;
  const next = WORKFLOW[i + 1];
  return (
    <nav aria-label="Case workflow" className="tw relative mb-6 flex flex-wrap items-center gap-x-2 gap-y-2 overflow-hidden rounded-xl border border-line [background:linear-gradient(180deg,rgb(var(--glass-rgb)/0.05),rgb(var(--glass-rgb)/0.015)),var(--panel)] px-2 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <ol className="m-0 flex min-w-0 flex-1 list-none flex-nowrap items-center gap-1 overflow-x-auto p-0">
        {WORKFLOW.map((p, j) => {
          const m = metaFor(p);
          const state = j < i ? "done" : j === i ? "now" : "todo";
          return (
            <li key={p} className="flex shrink-0 items-center gap-1">
              {j > 0 && (
                <span className="relative h-[2px] w-3 overflow-hidden rounded-full bg-fg/[0.08] sm:w-8" aria-hidden="true">
                  <span className={cn("absolute inset-0 origin-left bg-accent transition-transform duration-500 ease-out-soft", j <= i ? "scale-x-100" : "scale-x-0")} />
                </span>
              )}
              <a href={href(p, route.tag)} aria-current={state === "now" ? "step" : undefined}
                className={cn("flex items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] transition-colors duration-150",
                  state === "now" ? "bg-accent-soft font-medium text-ink-hi shadow-[inset_0_0_0_1px_rgb(var(--accent-rgb)/0.3)]" : "text-ink-3 hover:bg-fg/[0.05] hover:text-ink")}>
                <span className={cn("grid size-[22px] place-items-center rounded-full text-[11px] font-semibold tabular-nums",
                  state === "now" ? "bg-accent text-white shadow-[0_0_14px_rgb(var(--accent-rgb)/0.7)]" : state === "done" ? "bg-ok-soft text-ok-ink shadow-[inset_0_0_0_1px_rgb(var(--ok-rgb)/0.35)]" : "shadow-[inset_0_0_0_1px_var(--line-strong)]")}>
                  {state === "done" ? <Check className="size-3" strokeWidth={3} /> : j + 1}
                </span>
                <span className="hidden md:inline">{m.label}</span>
              </a>
            </li>
          );
        })}
      </ol>
      {next ? (
        <a href={href(next, route.tag)} className="btn primary sm ml-auto w-full sm:w-auto">
          Next: {metaFor(next).label}{metaFor(next).perCase && <span className="font-mono text-white/70">{route.tag}</span>}
          <ArrowRight aria-hidden="true" />
        </a>
      ) : (
        <span className="ml-auto px-2 text-[12.5px] text-ink-3">Last stop: a case closes only with evidence and a reviewer.</span>
      )}
    </nav>
  );
}

export default function Shell({ route, children }: { route: Route; children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const counts = useCounts();
  const demo = useDemo();
  const { profile, signOut } = useSession();
  const drawer = useDrawer();
  const simCount = demo.actions.length + Object.keys(demo.briefDecisions).length + Object.keys(demo.conflictDecisions).length;
  const meta = metaFor(route.page);

  const toggleCollapsed = () => setCollapsed((c) => {
    try { localStorage.setItem(COLLAPSE_KEY, c ? "0" : "1"); } catch { /* storage blocked: keep it for this visit */ }
    return !c;
  });
  const doReset = useCallback(() => {
    if (confirm("Reset all simulated actions and review decisions in this browser?")) resetDemo();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement)?.closest?.("input, textarea, select, [contenteditable]");
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) { e.preventDefault(); setSearchOpen((o) => !o); }
      else if (e.key === "/" && !typing) { e.preventDefault(); setSearchOpen(true); }
      else if (e.key === "[" && !typing && (e.metaKey || e.ctrlKey)) { e.preventDefault(); toggleCollapsed(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => { setMobileOpen(false); }, [route.page, route.tag]);

  const item = (p: Page, extra: Partial<NavItemData> = {}): NavItemData => {
    const m = metaFor(p);
    return { id: p, title: m.label, icon: m.icon, href: href(p, route.tag), hint: m.hint, flag: m.live && !LIVE ? "offline" : undefined, ...extra };
  };
  const groups: NavGroupData[] = [
    { items: [{ id: "search", title: "Search", icon: Search, onSelect: () => setSearchOpen(true), shortcut: "Ctrl K", hint: "Pages, equipment and all 380 register records" }] },
    { heading: "Workflow", items: [
      item("overview"),
      item("queue", { badge: counts.packages }),
      item("investigation"),
      item("actions", { badge: counts.overdue, badgeTone: "danger", hint: `${counts.overdue} source actions past their plan date without a Closed status` }),
    ] },
    { heading: "Insight", items: [item("patterns"), item("audit"), item("backlog", { badge: counts.rcaDuePassed, badgeTone: "warn", hint: `${counts.rcaDuePassed} open records are past their RCA due date` })] },
    { heading: "Value & data", items: [item("business"), item("foundation"),
      { id: "admin", title: "Admin", icon: Cog, hint: "AI quality and snapshot publishing", children: [item("aiquality"), item("ingest")] }] },
  ];
  const bottom: NavItemData[] = [
    { id: "about", title: "About PlantPulse", icon: BookOpen, href: "#/", hint: "What this is for, and the business case" },
    ...(LIVE ? (OPEN ? [] : [{ id: "signout", title: "Sign out", icon: LogOut, onSelect: () => signOut() }])
      : [{ id: "reset", title: "Reset demo", icon: RotateCcw, onSelect: doReset, badge: simCount || undefined, hint: "Clear simulated actions and decisions in this browser" }]),
  ];

  const commands = useMemo<CommandItem[]>(() => [
    ...PAGES_META.map((m) => ({ id: `page-${m.page}`, group: "Go to", title: m.label, hint: m.hint, icon: m.icon, keywords: `${m.group} ${m.keywords ?? ""}`,
      run: () => { window.location.hash = href(m.page, route.tag).slice(1); } })),
    { id: "ask", group: "Do", title: "Ask PlantPulse", hint: "Copilot that cites its sources, sentence by sentence", icon: MessageSquareText, keywords: "copilot ai chat question", run: openCopilot },
    { id: "about", group: "Do", title: "About PlantPulse", hint: "The landing page: purpose, workflow, business value", icon: BookOpen, keywords: "landing home intro", run: () => { window.location.hash = "/"; } },
    ...SNAP.equipment.map((e) => ({ id: `eq-${e.tag}`, group: "Equipment with full evidence", title: `${e.tag} · ${e.name.replace(` ${e.tag}`, "")}`,
      hint: `${e.plant_unit} · criticality ${e.criticality ?? "unknown"} · opens the Problem Tank`, icon: metaFor("queue").icon, keywords: e.tag.replace("-", ""),
      run: () => { window.location.hash = href("queue", e.tag).slice(1); } })),
    ...SNAP.incidents.map((i) => ({ id: `inc-${i.id}`, group: "Register records", title: i.title.startsWith(i.tag) ? i.title : `${i.tag} · ${i.title}`,
      hint: `${i.plant} · ${fmtDate(i.occurred)} · ${i.status.toLowerCase()} · row ${i.src.row}`, icon: BookOpen,
      keywords: `${i.ar_raw} ${i.mto} ${i.tag.replace("-", "")} ${i.impact} ${i.component}`,
      run: () => drawer({ kind: "incident", id: i.id }) })),
  ], [route.tag, drawer]);

  const sidebar = (isMobile: boolean) => (
    <SidebarNav
      groups={groups} bottomItems={bottom} activeId={route.page} collapsed={!isMobile && collapsed}
      onNavigate={isMobile ? () => setMobileOpen(false) : undefined}
      header={
        <div className="flex flex-col gap-3">
          <div className={cn("flex items-center gap-2.5", collapsed && !isMobile ? "justify-center" : "px-1")}>
            <a href="#/" className="flex min-w-0 items-center gap-2.5 text-ink-hi" aria-label="PlantPulse, about">
              <BrandMark />
              {(!collapsed || isMobile) && <span className="min-w-0"><b className="block text-[16px] font-semibold leading-none tracking-[-0.02em]">PlantPulse</b><span className="mt-1 block truncate text-[11px] text-ink-3">Reliability decision workspace</span></span>}
            </a>
            {isMobile && <button type="button" onClick={() => setMobileOpen(false)} aria-label="Close menu" className="ml-auto rounded-md p-1.5 text-ink-2 hover:bg-fg/5"><X className="size-5" /></button>}
          </div>
          <CaseSwitcher route={route} collapsed={collapsed && !isMobile} />
        </div>
      }
      footer={(!collapsed || isMobile) && (
        <p className="mt-3 flex items-start gap-2 px-1.5 text-[11px] leading-snug text-ink-4"><Database className="mt-px size-3.5 shrink-0" aria-hidden="true" />Read-only towards the plant: no DCS, SAP or control-system writes.</p>
      )}
    />
  );

  return (
    <div className="flex min-h-screen">
      <aside className={cn("tw sticky top-0 z-30 hidden h-screen shrink-0 transition-[width] duration-300 ease-out-soft md:block", collapsed ? "w-[64px]" : "w-[256px]")}>
        {sidebar(false)}
      </aside>
      {mobileOpen && (
        <div className="tw fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px] [animation:pp-fade_150ms_ease-out]" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 bg-ground shadow-2xl [animation:pp-slide-in_220ms_cubic-bezier(0.16,1,0.3,1)]">{sidebar(true)}</div>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="tw sticky top-0 z-20 flex h-[60px] items-center gap-2 border-b border-line bg-[rgb(var(--ground-rgb)/0.72)] px-3 backdrop-blur-xl sm:gap-3 sm:px-6">
          <button type="button" onClick={() => setMobileOpen(true)} aria-label="Open menu" className="rounded-md p-1.5 text-ink-3 hover:bg-fg/5 hover:text-ink-hi md:hidden"><Menu className="size-5" /></button>
          <button type="button" onClick={toggleCollapsed} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} title={`${collapsed ? "Expand" : "Collapse"} sidebar (Ctrl [)`}
            className="hidden rounded-md p-1.5 text-ink-3 transition-colors hover:bg-fg/5 hover:text-ink-hi md:block">
            {collapsed ? <PanelLeftOpen className="size-[18px]" strokeWidth={1.6} /> : <PanelLeftClose className="size-[18px]" strokeWidth={1.6} />}
          </button>
          <span className="hidden h-5 w-px bg-line md:block" aria-hidden="true" />
          <div className="flex min-w-0 items-center gap-2 text-[13.5px] text-ink-3" aria-label="Breadcrumb">
            <span className="hidden truncate lg:inline">{meta.group}</span>
            <span className="hidden text-ink-4 lg:inline" aria-hidden="true">/</span>
            <span className="shrink-0 font-medium text-ink-hi">{meta.label}</span>
            {meta.perCase && <TagChip tag={route.tag} named className="hidden max-w-[240px] sm:inline-flex" />}
          </div>
          <span className="flex-1" />
          <button type="button" onClick={() => setSearchOpen(true)}
            className="flex h-9 min-w-0 items-center gap-2 rounded-[10px] border border-line bg-fg/[0.03] px-2.5 text-[13px] text-ink-3 transition-colors hover:border-line-strong hover:bg-fg/[0.05] hover:text-ink lg:w-[260px] 2xl:w-[300px]">
            <Search className="size-4 shrink-0" strokeWidth={1.7} aria-hidden="true" />
            <span className="hidden truncate sm:inline">Search records, equipment, pages</span>
            <kbd className="ml-auto hidden h-5 shrink-0 items-center whitespace-nowrap rounded-[5px] border border-line bg-fg/[0.04] px-1.5 font-mono text-[10px] text-ink-3 lg:inline-flex">Ctrl K</kbd>
          </button>
          <span className="hidden h-9 items-center gap-2 whitespace-nowrap rounded-[10px] border border-line bg-fg/[0.03] px-3 text-[12.5px] text-ink-3 xl:inline-flex" title="Source files carry no publication time, so the update time is shown as unknown. Figures are recorded values, not live plant status.">
            <span className="size-1.5 rounded-full bg-ink-3" aria-hidden="true" />
            <b className="font-medium text-ink">{LIVE ? "Published" : "Bundled"} snapshot</b> {fmtDate(REVIEW_DATE)}<span className="hidden 2xl:inline"> · recorded, not live</span>
          </span>
          {LIVE ? (
            <span className="hidden h-9 items-center gap-2 whitespace-nowrap rounded-[10px] border border-line bg-fg/[0.03] px-3 text-[12.5px] text-ink-3 sm:inline-flex"
              title={OPEN ? "Trial mode without sign-in: everyone shares one sandbox, and team data is never changed" : profile?.is_demo ? "Your actions and decisions are visible only to you" : "Signed in to the team workspace"}>
              <span className={`live-dot${profile?.is_demo ? " sandbox" : ""}`} aria-hidden="true" />
              {OPEN ? <><b className="font-medium text-ink">Open demo</b> shared sandbox</>
                : profile?.is_demo ? <><b className="font-medium text-ink">Guest sandbox</b> private to you</> : <><b className="font-medium text-ink">{profile?.display_name ?? "Signed in"}</b> {ROLE_LABEL[profile?.role ?? "viewer"]}</>}
            </span>
          ) : (
            <span className="hidden h-9 items-center gap-2 whitespace-nowrap rounded-[10px] border border-line bg-fg/[0.03] px-2 pr-3 text-[12.5px] text-ink-3 sm:inline-flex" title="Offline demo: simulated decisions and actions live only in this browser">
              <span className="badge b-simulated">Offline demo</span><span className="tabular-nums">{simCount} change{simCount === 1 ? "" : "s"}</span>
            </span>
          )}
          <ThemeToggle />
        </header>
        {!LIVE && !isStorageOk() && <div className="tw border-b border-[rgb(var(--caution-rgb)/0.3)] bg-caution-soft px-6 py-1.5 text-[13px] text-caution-ink">Browser storage is blocked, so changes are kept in memory only.</div>}
        <main className="content" key={route.page}>
          <div className="animate-rise">
            <WorkflowBar route={route} />
            {children}
          </div>
        </main>
      </div>
      <CommandPalette open={searchOpen} onClose={() => setSearchOpen(false)} items={commands}
        placeholder="Search pages, equipment tags, AR numbers, plants…" emptyHint="Try a tag like KO-3201, a plant code like ZCU, or an AR number." />
    </div>
  );
}

/** PlantPulse mark: Pipo the gauge mascot. */
export function BrandMark({ className }: { className?: string }) {
  return <img src="/mascot.png" alt="" aria-hidden="true" draggable={false} className={cn("size-9 shrink-0 select-none object-contain", className)} />;
}
