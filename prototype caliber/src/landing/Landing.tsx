// PlantPulse landing page, control-room glass. Structure follows the 21st.dev SaaS template the team picked (fixed
// navigation with centred links and a mobile menu, an announcement pill, headline, one call to action and the
// product beneath a top light), rebuilt as a layered scene and extended with the sections that explain the purpose
// and the business value. The bento grid and the evidence wall reuse the user's 21st.dev components with real data.
import { useCallback, useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { Activity, ArrowRight, ArrowUpRight, ClipboardCheck, FileSearch, Menu, Microscope, Quote, ShieldCheck, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Gauge } from "@/components/ui/gauge";
import { BorderBeam } from "@/components/ui/border-beam";
import { BentoCard, BentoColumn, BentoGrid } from "@/components/ui/bento-grid";
import { Marquee } from "@/components/ui/marquee";
import { Sparkline } from "@/components/ui/sparkline";
import { RibbonText } from "@/components/ui/ribbon-text";
import { FACTS, FLEET, KO_STATES, MONTHLY, STATUS_SPLIT, WALL } from "./facts";
import { plainName, shortName } from "@/domain/names";
import { useReducedMotion, useScrollProgress } from "./motion";
import Triage from "./Triage";
import { ThemeToggle } from "@/components/ThemeBackdrop";
import { useTheme } from "@/lib/theme";

/** Product screenshots exist for both themes; show the one that matches the page. */
const useShot = () => { const [t] = useTheme(); return (name: string) => `/landing/${name}${t === "light" ? "-light" : ""}.jpg`; };
import "./landing.css";

const WORKSPACE = "#/overview";
const CTA = "Open the workspace";
const NAV = [
  { href: "#problem", label: "Problem" },
  { href: "#workflow", label: "How it works" },
  { href: "#inside", label: "Inside" },
  { href: "#trust", label: "Trust" },
  { href: "#value", label: "Business value" },
];

/** Same-page anchors must not touch the hash, because the hash is the workspace router. */
function jump(e: MouseEvent<HTMLAnchorElement>, id: string) {
  e.preventDefault();
  document.getElementById(id.slice(1))?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
}

/** The template's "gradient" button: a white plate fading down, scaling on hover. */
function PrimaryButton({ children, href = WORKSPACE, className }: { children: ReactNode; href?: string; className?: string }) {
  return (
    <a href={href}
      className={cn("group inline-flex h-12 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-gradient-to-b from-ink-hi via-ink-hi/95 to-ink-hi/75 px-6 text-[15.5px] font-semibold text-canvas no-underline",
        "shadow-[0_1px_0_rgba(255,255,255,0.35)_inset,0_12px_32px_-10px_rgb(var(--accent-rgb)/0.5)] transition-transform duration-200 ease-out hover:scale-[1.03] active:scale-[0.97]", className)}>
      {children}<ArrowRight className="size-4 transition-transform duration-200 ease-out group-hover:translate-x-0.5" aria-hidden="true" />
    </a>
  );
}

function Mark({ size = 34 }: { size?: number }) {
  return <img src="/mascot.png" alt="" aria-hidden="true" draggable={false} className="shrink-0 select-none object-contain" style={{ width: size, height: size }} />;
}

/** The receipt in compact form: lives in the navigation bar so it never covers the page. */
function StampChip({ stage }: { stage: number }) {
  const r = stage >= 0 ? RECEIPT[stage] : null;
  return (
    <span aria-hidden="true" className={cn("ml-4 hidden max-w-[230px] items-center gap-2 rounded-lg border border-fg/10 bg-fg/[0.04] py-1 pl-1 pr-2.5 transition-opacity duration-300 2xl:inline-flex min-[1680px]:hidden", r ? "opacity-100" : "opacity-0")}>
      <span className="shrink-0 rounded-md bg-fg/10 px-1.5 py-0.5 text-[12px] font-semibold leading-none text-ink-hi">{FACTS.first.short}</span>
      {r && <span key={r.s} className={cn("min-w-0 truncate font-mono text-[11px] font-semibold uppercase leading-none tracking-[0.1em] [animation:lp-chip_0.34s_cubic-bezier(0.16,1,0.3,1)_both]",
        r.tone === "red" ? "text-danger-ink" : r.tone === "green" ? "text-ok-ink" : "text-ink-soft")}>{r.s}</span>}
    </span>
  );
}

function Navigation({ stage }: { stage: number }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24);
    on(); window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return (
    <header className={cn("fixed inset-x-0 top-0 z-50 border-b transition-colors duration-300",
      scrolled || open ? "border-fg/[0.07] bg-canvas/75 backdrop-blur-xl" : "border-transparent bg-transparent")}>
      <nav className="relative mx-auto flex h-16 max-w-[1320px] items-center px-4 sm:px-8" aria-label="Landing">
        <a href="#/" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="flex items-center gap-2.5 text-ink-hi no-underline" aria-label="PlantPulse, back to top">
          <Mark />
          <span className="text-[18px] font-semibold tracking-[-0.02em]">PlantPulse</span>
        </a>
        <StampChip stage={stage} />
        <div className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-7 lg:flex">
          {NAV.map((n) => (
            <a key={n.href} href={n.href} onClick={(e) => jump(e, n.href)} className="text-[14px] text-ink-2 no-underline transition-colors duration-150 hover:text-ink-hi">{n.label}</a>
          ))}
        </div>
        <div className="ml-auto hidden items-center gap-2 md:flex">
          <ThemeToggle />
          <a href="?offline=1#/overview" className="rounded-lg px-3 py-2 text-[14px] text-ink-2 no-underline transition-colors hover:text-ink-hi">Offline demo</a>
          <a href={WORKSPACE} className="inline-flex h-10 items-center rounded-lg bg-ink-hi px-4 text-[14px] font-semibold text-canvas no-underline transition-[background-color,transform] duration-150 hover:bg-ink-hi/85 active:scale-[0.97]">{CTA}</a>
        </div>
        <ThemeToggle className="ml-auto md:hidden" />
        <button type="button" className="ml-1 rounded-md p-2 text-ink-hi md:hidden" onClick={() => setOpen((o) => !o)} aria-label="Toggle menu" aria-expanded={open}>
          {open ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>
      </nav>
      {open && (
        <div className="border-t border-fg/[0.07] bg-canvas/95 px-4 pb-5 pt-2 backdrop-blur-xl [animation:pp-fade_200ms_ease-out] md:hidden">
          {NAV.map((n) => (
            <a key={n.href} href={n.href} onClick={(e) => { jump(e, n.href); setOpen(false); }} className="block py-3 text-[16px] text-ink-soft no-underline">{n.label}</a>
          ))}
          <div className="mt-3 flex flex-col gap-2 border-t border-fg/[0.07] pt-4">
            <a href={WORKSPACE} className="flex h-11 items-center justify-center rounded-lg bg-ink-hi font-semibold text-canvas no-underline">{CTA}</a>
            <a href="?offline=1#/overview" className="flex h-11 items-center justify-center rounded-lg border border-fg/10 text-ink-soft no-underline">Offline demo</a>
          </div>
        </div>
      )}
    </header>
  );
}

/** Line drawing of a cracker unit: columns, a flare stack, a pipe rack. The far plane of the hero. */
function PlantDrawing({ className }: { className?: string }) {
  const s = { fill: "none", stroke: "var(--accent-ink)", strokeWidth: 1.2, vectorEffect: "non-scaling-stroke" as const };
  return (
    <svg viewBox="0 0 1600 420" preserveAspectRatio="xMidYMax slice" className={className} aria-hidden="true">
      <g {...s} opacity="0.14">
        <path d="M0 400H1600" />
        <path d="M140 400V150h46v250M163 150V110M150 200h26M150 260h26M150 320h26" />
        <path d="M230 400V210h34v190M247 210v-30" />
        <path d="M330 400V250a60 60 0 0 1 120 0v150M330 300h120M330 350h120" />
        <path d="M520 400V120h28v280M534 120V70M524 180h20M524 240h20M524 300h20" />
        <path d="M600 330h360M600 360h360M620 330v70M700 330v70M780 330v70M860 330v70M940 330v70" />
        <path d="M640 330c0-40 30-40 30-80M720 330c0-50 40-60 40-110h60" />
        <path d="M1020 400V180h52v220M1046 180v-40M1030 230h32M1030 290h32" />
        <path d="M1120 400V270h160v130M1120 300h160M1150 270v-30h100v30" />
        <path d="M1330 400V60M1322 400l8-340 8 340M1318 120h24M1316 200h28M1314 280h32" />
        <path d="M1400 400V230a50 50 0 0 1 100 0v170" />
        <path d="M1520 400V160h30v240" />
      </g>
      <g opacity="0.06" {...s}>
        {Array.from({ length: 17 }, (_, i) => <path key={i} d={`M${i * 100} 0V400`} />)}
        {Array.from({ length: 5 }, (_, i) => <path key={`h${i}`} d={`M0 ${i * 100}H1600`} />)}
      </g>
      <circle cx="1330" cy="52" r="7" fill="var(--caution)" opacity="0.6" />
    </svg>
  );
}

function Hero() {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  useScrollProgress(ref, undefined, "exit", !reduced);
  useEffect(() => {
    const el = ref.current;
    if (!el || reduced || !matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    let raf = 0;
    const on = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => el.style.setProperty("--mx", ((e.clientX / window.innerWidth) * 2 - 1).toFixed(3)));
    };
    window.addEventListener("pointermove", on, { passive: true });
    return () => { window.removeEventListener("pointermove", on); cancelAnimationFrame(raf); };
  }, [reduced]);
  const shot = useShot();
  const crit = FLEET.find((f) => f.tag === FACTS.first.tag) ?? FLEET[0];

  return (
    <section ref={ref} className="lp-hero relative isolate overflow-hidden pt-28 sm:pt-32" aria-labelledby="hero-h">
      {/* far plane: plant line drawing; atmosphere: the cold top-light falling on the product */}
      <div className="lp-far pointer-events-none absolute inset-x-0 top-[30%] -z-20 h-[48vh]"><PlantDrawing className="h-full w-full" /></div>
      <div className="lp-glow pointer-events-none absolute left-1/2 top-[30%] -z-10 h-[70vh] w-[min(1200px,130vw)] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(closest-side,rgb(var(--accent-2-rgb)/0.32),rgb(var(--info-rgb)/0.07)_55%,transparent)]" />
      <div className="lp-beam pointer-events-none absolute left-1/2 top-[34%] -z-10 h-[46vh] w-[min(1100px,120vw)] -translate-x-1/2" />

      <div className="lp-copy relative z-10 mx-auto flex max-w-[1000px] flex-col items-center px-4 text-center sm:px-8">
        <a href="#triage" onClick={(e) => jump(e, "#triage")}
          className="mb-8 inline-flex max-w-full items-center gap-2 rounded-full border border-fg/10 bg-fg/[0.04] px-4 py-1.5 text-[13px] text-ink-2 no-underline backdrop-blur-sm transition-colors hover:border-fg/20 hover:text-ink-hi">
          <span className="relative flex size-1.5"><span className="absolute inset-0 animate-ping rounded-full bg-accent opacity-70 motion-reduce:hidden" /><span className="relative size-1.5 rounded-full bg-accent" /></span>
          <span className="truncate">CALIBER 2026 · Case 2 · Team Heisenberg</span>
          <span className="flex shrink-0 items-center gap-1 text-accent-ink">See the demo case <ArrowRight className="size-3" aria-hidden="true" /></span>
        </a>
        <h1 id="hero-h" className="font-display text-[clamp(2.5rem,6.2vw,5.4rem)] leading-[1.02] [text-wrap:balance]">
          <RibbonText className="pb-[0.08em]">A repair is not a fix until the evidence says so.</RibbonText>
        </h1>
        <p className="mt-6 max-w-[56ch] text-[clamp(1.02rem,1.4vw,1.2rem)] leading-relaxed text-ink-2 [text-wrap:pretty]">
          PlantPulse ties every equipment incident to its sources, an owner, and the proof needed to close it. One workspace for the plant manager, the reliability engineer and the planner.
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <PrimaryButton>{CTA}</PrimaryButton>
          <a href="?offline=1#/overview" className="inline-flex h-12 items-center rounded-xl border border-fg/10 bg-fg/[0.03] px-5 text-[15px] text-ink-soft no-underline backdrop-blur-sm transition-colors hover:border-fg/20 hover:text-ink-hi">Run the offline demo</a>
        </div>
      </div>

      {/* mid plane: the actual workspace with a beam running its border; near plane: the tag hanging across its corner */}
      <div className="lp-frame-wrap relative z-0 mx-auto mt-14 w-[min(1200px,94vw)] pb-24 sm:mt-16">
        <figure className="lp-frame relative m-0 rounded-2xl border border-fg/10 bg-surface/80 p-1.5 shadow-[0_50px_100px_-30px_rgb(var(--shade-rgb)/calc(0.95*var(--shade-k))),0_0_0_1px_rgba(255,255,255,0.03),0_-30px_80px_-30px_rgb(var(--accent-2-rgb)/0.45)]">
          <div className="flex items-center gap-1.5 px-2.5 pb-1.5 pt-1" aria-hidden="true">
            <i className="size-2.5 rounded-full bg-fg/10" /><i className="size-2.5 rounded-full bg-fg/10" /><i className="size-2.5 rounded-full bg-fg/10" />
            <span className="ml-3 truncate font-mono text-[11px] text-ink-4">plantpulse · Executive overview · recorded snapshot {FACTS.review}</span>
          </div>
          <img src={shot("overview")} width={2160} height={1350} alt="The PlantPulse executive overview: recorded loss, open records and RCA due dates as tiles, loss by month, register status, loss by plant and the review queue"
            className="block h-auto w-full rounded-xl" loading="eager" />
          <figcaption className="sr-only">Screenshot of the running workspace on the bundled snapshot.</figcaption>
          <BorderBeam size={260} duration={12} borderWidth={1.5} />
        </figure>
        <div className="lp-mid pointer-events-none absolute -left-[3%] top-[16%] z-10 hidden w-[272px] rounded-2xl lp-float p-4 lg:block" aria-hidden="true">
          <div className="flex items-center justify-between text-[11.5px] text-ink-3"><span>Recorded actual loss</span><span>{FACTS.plants} plants</span></div>
          <div className="mt-1.5 text-[32px] font-semibold leading-none tracking-[-0.035em] text-ink-hi tabular-nums">{FACTS.actual}</div>
          <Sparkline className="mt-3 h-12" values={MONTHLY} color="var(--accent)" />
          <div className="mt-1.5 flex justify-between text-[11px] text-ink-4"><span>by month of occurrence</span><span>{FACTS.records} rows</span></div>
        </div>
        <div className="lp-mid-2 pointer-events-none absolute -right-[2.5%] bottom-[22%] z-10 hidden w-[208px] rounded-2xl lp-float p-3.5 xl:block" aria-hidden="true">
          <div className="flex items-center justify-between"><span className="text-[13px] font-semibold text-ink-hi">{shortName(crit.tag)}</span><span className="rounded-full bg-[rgb(var(--ok-rgb)/0.15)] px-2 py-0.5 text-[10.5px] font-medium text-ok-ink">{crit.latest.status}</span></div>
          <Gauge className="mx-auto mt-1 max-w-[150px]" value={crit.latest.value} alarm={crit.param.alarm} trip={crit.param.trip} direction={crit.param.direction} ghost={crit.worst.value} />
          <div className="-mt-1 text-center text-[11px] text-ink-3">{crit.param.name} · worst week marked</div>
        </div>
        <div className="lp-near pointer-events-none absolute -top-12 right-[4%] z-20 hidden sm:block" aria-hidden="true">
          <div className="lp-cord mx-auto h-[92px] w-[2px]" />
          <div className="lp-shadow-tag -mt-1">
            <div className="lp-tag" style={{ ["--w" as string]: "180px" }}>
              <div className="lp-tag-band">Do not close</div>
              <span className="lp-tag-hole" />
              <div className="lp-tag-body">
                <div className="lp-tag-name">{FACTS.first.label}</div>
                <div className="lp-tag-line">{FACTS.first.plantLabel}</div>
                <div className="lp-tag-sign"><span className="lp-stamp red">Evidence missing</span></div>
              </div>
            </div>
          </div>
        </div>
        <div className="pointer-events-none absolute inset-x-[-4%] bottom-0 h-64 lp-fade-b" />
      </div>
    </section>
  );
}

function Ledger() {
  const rows = [
    { v: String(FACTS.records), k: "incident records", d: `${FACTS.plants} plants, ${FACTS.from} to ${FACTS.to}`, tone: "" },
    { v: FACTS.actual, k: "recorded actual loss", d: "summed from the register, not estimated", tone: "" },
    { v: `${FACTS.downtime} h`, k: "recorded downtime", d: "across the same records", tone: "" },
    { v: String(FACTS.open), k: "records still open", d: `${FACTS.openActual} actual loss behind them`, tone: "text-caution-ink" },
    { v: String(FACTS.rcaDuePassed), k: "past their RCA due date", d: `as of ${FACTS.review}`, tone: "text-danger-ink" },
  ];
  return (
    <dl className="mt-14 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {rows.map((r, i) => (
        <div key={r.k} className={cn("rounded-2xl border border-fg/[0.08] bg-[rgb(var(--surface-rgb)/0.78)] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-md", i === 0 && "col-span-2 sm:col-span-1")}>
          <dt className="sr-only">{r.k}</dt>
          <dd className="m-0">
            <span className={cn("block text-[clamp(1.75rem,2.6vw,2.3rem)] font-semibold leading-none tracking-[-0.035em] text-ink-hi tabular-nums", r.tone)}>{r.v}</span>
            <span className="mt-3 block text-[15px] font-medium text-ink">{r.k}</span>
            <span className="mt-0.5 block text-[13px] text-ink-3">{r.d}</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}

function Problem() {
  return (
    <section id="problem" data-stamp="0" className="relative mx-auto max-w-[1320px] px-4 pb-28 pt-16 sm:px-8 sm:pt-24" aria-labelledby="problem-h">
      <div className="grid gap-10 lg:grid-cols-[1.15fr_1fr] lg:gap-20">
        <h2 id="problem-h" className="font-display text-[clamp(2rem,4vw,3.4rem)] leading-[1.02] text-ink-hi [text-wrap:balance]">
          The register already knows. The follow-through is what goes missing.
        </h2>
        <div className="flex flex-col gap-5 text-[17px] leading-relaxed text-ink-2 lg:pt-3">
          <p>A compressor trips, gets repaired, and the record moves on. Whether the fix actually worked, whether the preventive actions were done, and whether the sister unit carries the same weakness ends up in slide decks and spreadsheets nobody re-opens.</p>
          <p>The data says it plainly. This is the competition's own incident register, as it stood on the review date:</p>
        </div>
      </div>
      <Ledger />
    </section>
  );
}

const STEPS = [
  { img: "overview", page: "overview", title: "See where the loss sits", who: "Plant manager", body: "Recorded loss, downtime and open records by plant and by month, each figure opening the register row it came from. Every role gets its own layout, and anyone can drag widgets into their own order." },
  { img: "queue", page: "queue/KO-3201", title: "Pick the case to review first", who: "Reliability engineer", body: "The Problem Tank ranks equipment by the register's own lifecycle, criticality and missed plan dates, and shows the conflicts between sources instead of hiding them." },
  { img: "investigation", page: "investigation/KO-3201", title: "Understand it before acting", who: "Reliability engineer", body: "A forecast window to act in (never a failure date), causes ranked by code from the failure-mode library, and an AI brief where every sentence cites its source." },
  { img: "actions", page: "actions/KO-3201", title: "Close it only with evidence", who: "Maintenance planner · reviewer", body: "Each action has an owner, a due date and the evidence rule that closes it. Reminders escalate, sister assets get the same fix, and closure needs a reviewer." },
];

function Workflow() {
  const section = useRef<HTMLElement>(null);
  const rail = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [wide, setWide] = useState(() => matchMedia("(min-width: 1024px)").matches);
  useEffect(() => {
    const m = matchMedia("(min-width: 1024px)");
    const on = () => setWide(m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  const shot = useShot();
  const pinned = wide && !reduced;
  useEffect(() => {
    if (!pinned) return;
    const set = () => {
      const r = rail.current, s = section.current;
      if (r && s) s.style.setProperty("--travel", `${Math.max(0, r.scrollWidth - window.innerWidth + 64)}px`);
    };
    set(); window.addEventListener("resize", set);
    return () => window.removeEventListener("resize", set);
  }, [pinned]);
  useScrollProgress(section, undefined, "pin", pinned);

  const panel = (s: (typeof STEPS)[number], i: number) => (
    <article key={s.img} className={cn("flex shrink-0 flex-col", pinned ? "w-[min(820px,62vw,calc((100svh-420px)*1.6))]" : "w-full")}>
      <a href={`#/${s.page}`} className="group block overflow-hidden rounded-2xl border border-fg/10 bg-surface p-1.5 no-underline shadow-[0_30px_70px_-30px_rgb(var(--shade-rgb)/calc(0.9*var(--shade-k)))] transition-[border-color,box-shadow] duration-300 hover:border-[rgb(var(--accent-ink-rgb)/0.4)] hover:shadow-[0_30px_70px_-30px_rgb(var(--shade-rgb)/calc(0.9*var(--shade-k))),0_0_0_1px_rgb(var(--accent-rgb)/0.25)]">
        <img src={shot(s.img)} width={2160} height={1350} loading="lazy" alt={`PlantPulse ${s.title.toLowerCase()} screen`}
          className="block h-auto w-full rounded-xl transition-transform duration-500 ease-out group-hover:scale-[1.01]" />
      </a>
      <div className="mt-6 grid grid-cols-[auto_1fr] gap-x-5 pr-6">
        <span className="grid size-11 place-items-center rounded-xl border border-[rgb(var(--accent-ink-rgb)/0.3)] bg-[rgb(var(--accent-rgb)/0.12)] text-[18px] font-semibold text-accent-ink tabular-nums">{i + 1}</span>
        <div>
          <h3 className="text-[24px] font-semibold leading-tight tracking-[-0.02em] text-ink-hi">{s.title}</h3>
          <p className="mt-1 text-[13px] font-medium text-ink-3">{s.who}</p>
          <p className="mt-3 max-w-[60ch] text-[16px] leading-relaxed text-ink-2">{s.body}</p>
        </div>
      </div>
    </article>
  );

  return (
    <section id="workflow" data-stamp="2" ref={section} aria-labelledby="workflow-h" className="lp-band relative border-t border-fg/[0.06]" style={{ height: pinned ? "340vh" : undefined }}>
      <div className={pinned ? "sticky top-0 flex h-[100svh] flex-col justify-center overflow-hidden pt-16" : "py-24"}>
        <div className={cn("mx-auto w-full max-w-[1320px] px-4 sm:px-8", pinned ? "mb-8" : "mb-12")}>
          <h2 id="workflow-h" className="font-display max-w-[22ch] text-[clamp(2rem,4vw,3.2rem)] leading-[1.02] text-ink-hi lg:max-w-none">Four stops, one case, nothing re-typed.</h2>
          <p className="mt-4 max-w-[60ch] text-[17px] text-ink-2">The workspace follows how a reliability team already works. Each screen is real and opens on the same snapshot.</p>
        </div>
        <div ref={rail} className={cn(pinned ? "lp-rail flex gap-12 pl-[max(2rem,calc((100vw-1320px)/2+2rem))] will-change-transform" : "mx-auto flex max-w-[860px] flex-col gap-16 px-4 sm:px-8")}>
          {STEPS.map(panel)}
        </div>
      </div>
    </section>
  );
}

const fmtNum = (v: number) => (Math.abs(v) >= 100 ? v.toFixed(0) : Math.abs(v) >= 10 ? v.toFixed(1) : v.toFixed(2));

/* ---------- inside: the bento grid, each card's top half is the product's own instrument ---------- */

const STATUS_HEX = ["var(--series-1)", "var(--series-2)", "var(--series-3)", "var(--series-4)", "var(--ink-4)", "var(--ink-5)"];
const titleCase = (s: string) => s.toLowerCase().replace(/(^|[\s/])\w/g, (m) => m.toUpperCase()).replace("Ca/Pa", "CA/PA").replace("Rca", "RCA");

function RingBg() {
  const total = STATUS_SPLIT.reduce((a, s) => a + s.n, 0);
  let acc = 0;
  const R = 70, C = 2 * Math.PI * R;
  return (
    <div className="flex w-full flex-col items-center gap-6">
      <svg viewBox="0 0 200 200" className="w-[min(200px,62%)] transition-transform duration-500 ease-out-soft group-hover:scale-[1.03]">
        <circle cx="100" cy="100" r={R} fill="none" stroke="rgb(var(--tint-rgb) / 0.1)" strokeWidth="16" />
        <g transform="rotate(-90 100 100)">
          {STATUS_SPLIT.map((s, i) => {
            const len = (s.n / total) * C - 4;
            const el = <circle key={s.s} cx="100" cy="100" r={R} fill="none" stroke={STATUS_HEX[i]} strokeWidth="16" strokeLinecap="round" strokeDasharray={`${Math.max(len, 0.1)} ${C}`} strokeDashoffset={-acc} />;
            acc += (s.n / total) * C;
            return el;
          })}
        </g>
        <text x="100" y="100" textAnchor="middle" style={{ fill: "var(--ink-hi)", font: "600 34px var(--font)", letterSpacing: "-0.02em" }}>{FACTS.open}</text>
        <text x="100" y="122" textAnchor="middle" style={{ fill: "var(--ink-3)", font: "400 11.5px var(--font)" }}>open of {total} records</text>
      </svg>
      <ul className="grid w-full grid-cols-2 gap-x-5 gap-y-2 text-[12.5px]">
        {STATUS_SPLIT.map((s, i) => (
          <li key={s.s} className="flex items-center gap-2 text-ink-2">
            <span className="size-2 shrink-0 rounded-full" style={{ background: STATUS_HEX[i] }} />
            <span className="min-w-0 flex-1 truncate">{titleCase(s.s)}</span>
            <span className="font-mono text-ink-hi tabular-nums">{s.n}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function GaugesBg() {
  return (
    <div className="grid w-full grid-cols-3 gap-2.5">
      {FLEET.slice(0, 3).map((f) => (
        <div key={f.tag} className="rounded-xl border border-line bg-fg/[0.025] px-2 pb-1.5 pt-2.5">
          <div className="truncate text-center text-[11.5px] font-medium text-ink-soft">{shortName(f.tag)}</div>
          <Gauge className="mx-auto mt-1 max-w-[104px]" value={f.latest.value} alarm={f.param.alarm} trip={f.param.trip} direction={f.param.direction} ghost={f.worst.value} />
          <div className="relative -mt-[1.7rem] text-center text-[12.5px] font-semibold text-ink-hi tabular-nums">{fmtNum(f.latest.value)}<span className="ml-0.5 text-[10.5px] font-normal text-ink-3">{f.param.unit}</span></div>
        </div>
      ))}
    </div>
  );
}

function CitesBg() {
  const kinds = { conflict: "Conflict", register: "Register row", reading: "Reading", rca: "RCA slide" } as const;
  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex flex-wrap gap-1.5">
        {WALL.map((w) => (
          <span key={w.id} className={cn("rounded-md border px-1.5 py-1 font-mono text-[11px] leading-none",
            w.kind === "conflict" ? "border-danger/40 bg-danger/10 text-danger-ink"
              : w.kind === "reading" ? "border-info/35 bg-info/10 text-info-ink"
                : w.kind === "rca" ? "border-line-strong bg-fg/[0.04] text-ink-soft" : "border-accent/30 bg-accent/10 text-accent-ink")}>{w.id}</span>
        ))}
      </div>
      <figure className="m-0 rounded-xl border border-line bg-fg/[0.03] p-3.5">
        <div className="flex items-center justify-between gap-2">
          <span className="rounded-md border border-danger/40 bg-danger/10 px-1.5 py-0.5 font-mono text-[11px] text-danger-ink">{WALL[0].id}</span>
          <span className="text-[11px] text-ink-3">{kinds[WALL[0].kind]}</span>
        </div>
        <figcaption className="mt-2 text-[13.5px] font-medium leading-snug text-ink-hi">{WALL[0].title}</figcaption>
        <p className="mt-1 line-clamp-3 text-[12.5px] leading-snug text-ink-3">{WALL[0].text}</p>
      </figure>
    </div>
  );
}

function BriefBg() {
  return (
    <div className="w-full rounded-xl border border-ai/30 bg-ai/[0.07] p-4">
      <div className="flex items-center gap-2 text-[12px] font-medium text-ai-ink"><Sparkles className="size-3.5" />Model wrote this · every sentence checked</div>
      <div className="mt-3.5 space-y-3 text-[13.5px] leading-snug text-ink-soft">
        <p>Lube-oil water rose before the trip <span className="cite !m-0">E2:hist</span></p>
        <p>The RCA names the oil cooler leak as the root cause <span className="cite !m-0">R2:slide7</span></p>
        <p className="text-ink-3 line-through decoration-danger">A claim without a source is struck through</p>
      </div>
      <div className="mt-4 flex items-center gap-2 border-t border-ai/20 pt-3 text-[11.5px] text-ink-3">
        <span className="rounded-full bg-ok/15 px-2 py-0.5 font-medium text-ok-ink">2 cited</span>
        <span className="rounded-full bg-danger/15 px-2 py-0.5 font-medium text-danger-ink">1 struck through</span>
      </div>
    </div>
  );
}

function ActionsBg() {
  const ladder = [["Owner", "var(--accent)", "day 0"], ["Reviewer", "var(--caution)", "+7 d"], ["Manager", "var(--danger)", "+14 d"]];
  return (
    <div className="flex w-full flex-col gap-2.5">
      <div className="flex items-center gap-2 rounded-xl border border-danger/35 bg-danger/[0.08] px-3 py-2.5 text-[13px] text-danger-ink"><ShieldCheck className="size-4 shrink-0" />Closure blocked · 2 required evidence items missing</div>
      <div className="grid grid-cols-3 gap-2">
        {ladder.map(([l, c, d]) => (
          <span key={l} className="rounded-lg border border-line bg-fg/[0.03] px-2 py-2 text-center">
            <span className="mx-auto mb-1.5 block h-1 w-8 rounded-full" style={{ background: c }} />
            <span className="block text-[12.5px] font-medium text-ink-soft">{l}</span>
            <span className="block font-mono text-[10.5px] text-ink-3">{d}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function SisterBg() {
  return (
    <div className="grid w-full grid-cols-3 gap-2">
      {["Compressor", "Sister unit 2", "Sister unit 3"].map((t, i) => (
        <span key={t} className={cn("rounded-xl border px-2 py-3.5 text-center font-mono text-[13px] font-medium", i === 0 ? "border-ok/40 bg-ok/[0.08] text-ok-ink" : "border-dashed border-caution/45 text-caution-ink")}>
          {t}<span className="mt-1 block font-sans text-[11.5px] font-normal text-ink-3">{i === 0 ? "cause confirmed" : "check action"}</span>
        </span>
      ))}
    </div>
  );
}

function Inside() {
  const [theme] = useTheme();
  const dark = theme === "dark";
  return (
    <section id="inside" aria-labelledby="inside-h" className="relative mx-auto max-w-[1320px] px-4 py-28 sm:px-8">
      <div className="mb-12 grid gap-6 lg:grid-cols-[1fr_1fr] lg:items-end">
        <h2 id="inside-h" className="font-display text-[clamp(2rem,4vw,3.2rem)] leading-[1.02] text-ink-hi [text-wrap:balance]">Every screen is an instrument, not a slide.</h2>
        <p className="max-w-[54ch] text-[17px] leading-relaxed text-ink-2">Status reads at a glance: {dark ? "green" : "blue"} is something you can open, amber needs attention, red is overdue or in conflict, {dark ? "teal" : "green"} is verified, violet is what a model wrote. The same five colours, on every page.</p>
      </div>
      {/* Three stacked columns, each sized by its own content and paired so the columns come out near-equal; the
          small remainder is shared by both cards in a column, so no card floats in an oversized cell. */}
      <BentoGrid>
        <BentoColumn>
          <BentoCard name="A dashboard each role can arrange" Icon={Activity} href="#/overview" cta="Open the overview"
            description="Plant manager, engineer, planner and data owner each get their own order. Drag widgets, hide what you don't use."
            background={<RingBg />} />
          <BentoCard name="Sister assets get the same fix" Icon={ArrowUpRight} href="#/actions/KO-3201" cta="See follow-through"
            description="When a compressor's cause is confirmed, its two sister units get a check action before they trip too."
            background={<SisterBg />} />
        </BentoColumn>
        <BentoColumn>
          <BentoCard name="Condition against its own limits" Icon={Microscope} href="#/investigation/KO-3201" cta="Open an investigation"
            description="Every gauge marks alarm, trip and the worst week. A window to act in, never a failure date."
            background={<GaugesBg />} />
          <BentoCard name="Every number opens its row" Icon={FileSearch} href="#/foundation" cta="See the data foundation"
            description={`${WALL.length} citations on this page alone, each one a real register row, reading, slide or conflict.`}
            background={<CitesBg />} />
        </BentoColumn>
        <BentoColumn className="md:col-span-2 md:grid md:grid-cols-2 lg:col-span-1 lg:flex">
          <BentoCard name="AI that cites, sentence by sentence" Icon={Sparkles} href="#/audit/KO-3201" cta="Open the RCA auditor"
            description="The brief, the copilot and the auditor are held to one rule: show the source, or say you do not know."
            background={<BriefBg />} />
          <BentoCard name="Closure needs evidence and a reviewer" Icon={ClipboardCheck} href="#/actions/KO-3201" cta="Open actions"
            description="Reminders climb from owner to reviewer to manager. Nothing closes on a status change alone."
            background={<ActionsBg />} />
        </BentoColumn>
      </BentoGrid>
    </section>
  );
}

function StateCol({ label, status, tone, children }: { label: string; status: string; tone: "green" | "red" | "ink"; children: ReactNode }) {
  return (
    <div className="flex flex-col rounded-2xl border border-fg/[0.08] bg-fg/[0.02] p-5">
      <h3 className="text-[20px] font-semibold leading-tight tracking-[-0.02em] text-ink-hi">{label}</h3>
      <span className={cn("mt-3 inline-block w-fit -rotate-2 rounded-md border-[1.5px] px-2 py-1 font-mono text-[11.5px] font-semibold uppercase leading-none tracking-[0.12em]",
        tone === "green" ? "border-ok-ink text-ok-ink" : tone === "red" ? "border-danger-ink text-danger-ink" : "border-ink-2 text-ink-2")}>{status}</span>
      <div className="mt-4 text-[15px] leading-relaxed text-ink-2">{children}</div>
    </div>
  );
}

const shortDate = (iso: string) => new Date(iso + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

/** All five documented assets, lead parameter against its own limits: last weekly route, and the worst week. */
function Fleet() {
  const allNormal = FLEET.every((f) => f.latest.status === "NORMAL");
  const weeks = FLEET.map((f) => f.weeksSinceTrip).filter((w): w is number => w !== null);
  return (
    <div className="mt-14">
      <p className="max-w-[70ch] text-[clamp(1.25rem,2vw,1.6rem)] font-semibold leading-snug tracking-[-0.015em] text-ink-hi">
        {allNormal ? "All five machines read NORMAL on their last weekly route." : "The last weekly route for the five machines:"}{" "}
        <span className="text-danger-ink">Every one of them recorded TRIP {Math.min(...weeks) === Math.max(...weeks) ? weeks[0] : `${Math.min(...weeks)} to ${Math.max(...weeks)}`} routes before that.</span>
      </p>
      <ul className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {FLEET.map((f) => (
          <li key={f.tag}>
            <a href={`#/investigation/${f.tag}`} className="group flex h-full flex-col rounded-2xl border border-fg/[0.08] bg-[linear-gradient(180deg,rgb(var(--glass-rgb)/0.06),rgb(var(--glass-rgb)/0.015))] p-4 no-underline transition-[border-color,transform] duration-200 ease-out hover:-translate-y-0.5 hover:border-[rgb(var(--accent-ink-rgb)/0.35)]">
              <div className="flex items-start justify-between gap-2">
                <span>
                  <span className="line-clamp-2 block min-h-[2.5em] text-[15px] font-semibold leading-tight text-ink-hi">{plainName(f.tag)}</span>
                  <span className="mt-1 block text-[12px] leading-tight text-ink-3">{f.param.name}</span>
                </span>
                <span className="rounded-full bg-[rgb(var(--ok-rgb)/0.14)] px-2 py-0.5 text-[10.5px] font-medium text-ok-ink">{f.latest.status}</span>
              </div>
              <Gauge className="mt-3" value={f.latest.value} alarm={f.param.alarm} trip={f.param.trip} direction={f.param.direction} ghost={f.worst.value}
                label={`${plainName(f.tag)} ${f.param.name}: ${fmtNum(f.latest.value)} ${f.param.unit} on ${f.latest.date}; worst ${fmtNum(f.worst.value)} on ${f.worst.date}; alarm ${f.param.alarm}, trip ${f.param.trip}`} />
              <div className="relative -mt-[3.2rem] text-center">
                <span className="text-[26px] font-semibold leading-none tracking-[-0.03em] text-ink-hi tabular-nums">{fmtNum(f.latest.value)}</span>
                <span className="ml-1 text-[12px] text-ink-3">{f.param.unit}</span>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-x-2 border-t border-fg/[0.08] pt-2.5 text-[11.5px] leading-tight">
                <dt className="text-ink-3">Alarm / trip</dt><dd className="m-0 text-right text-ink-soft tabular-nums">{f.param.alarm} / {f.param.trip}</dd>
                <dt className="mt-1 text-ink-3">Worst week</dt><dd className="m-0 mt-1 text-right text-danger-ink tabular-nums">{fmtNum(f.worst.value)} · {shortDate(f.worst.date)}</dd>
              </dl>
            </a>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[13px] text-ink-3">Arc: last weekly reading. Red marker: worst week. Each card opens the investigation for that machine.</p>
    </div>
  );
}

function States() {
  const d = (iso: string) => new Date(iso + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  return (
    <section id="states" data-stamp="3" aria-labelledby="states-h" className="lp-band border-t border-fg/[0.06]">
      <div className="mx-auto max-w-[1320px] px-4 py-28 sm:px-8">
        <div className="max-w-[880px]">
          <h2 id="states-h" className="font-display text-[clamp(2rem,4vw,3.4rem)] leading-[1.02] text-ink-hi">Repaired, recovered, prevented, verified. Four different things.</h2>
          <p className="mt-5 max-w-[62ch] text-[17px] leading-relaxed text-ink-2">
            Most systems mark a case done when the machine runs again. PlantPulse keeps the four states apart, and only a reviewer with the right evidence moves the last one. Here is the {FACTS.first.label.toLowerCase()} exactly as the snapshot records it on {FACTS.review}.
          </p>
        </div>
        <Fleet />
        <div className="mt-14 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StateCol label="Repaired" status="Done" tone="green">
            <p>{KO_STATES.repair.text}. Recorded <b className="font-semibold text-ink-hi">{KO_STATES.repair.status}</b>, plan date {d(KO_STATES.repair.plan_date)}.</p>
          </StateCol>
          <StateCol label="Recovered" status="Too early" tone="ink">
            <p>Readings came back after the repair, but the observation window after the fix is still shorter than the check needs. Recovery is not yet effectiveness.</p>
          </StateCol>
          <StateCol label="Prevention done" status="Overdue" tone="red">
            <p>Water-in-oil sensor: <b className="font-semibold text-ink-hi">{KO_STATES.sensor.status}</b>, plan date {d(KO_STATES.sensor.plan_date)} passed. Vibration alert change: <b className="font-semibold text-ink-hi">no status recorded</b>. Cooler retube: <b className="font-semibold text-ink-hi">{KO_STATES.retube.status}</b>.</p>
          </StateCol>
          <StateCol label="Verified effective" status="Hold" tone="red">
            <p>Needs the closure evidence and a reviewer. Roll-out to the two sister compressors: <b className="font-semibold text-ink-hi">{KO_STATES.rollout.status}</b>.</p>
          </StateCol>
        </div>
      </div>
    </section>
  );
}

/* ---------- trust: three internal results over a tilted wall of real citations ---------- */

const KIND = {
  conflict: { label: "Source conflict", cls: "border-[rgb(var(--danger-rgb)/0.35)] text-danger-ink" },
  register: { label: "Register row", cls: "border-[rgb(var(--accent-rgb)/0.35)] text-accent-ink" },
  reading: { label: "Condition reading", cls: "border-[rgb(var(--info-rgb)/0.35)] text-info-ink" },
  rca: { label: "RCA slide", cls: "border-fg/20 text-ink" },
} as const;

function EvidenceCard({ c }: { c: (typeof WALL)[number] }) {
  const k = KIND[c.kind];
  return (
    <figure className="m-0 w-[230px] rounded-xl border border-fg/[0.09] [background:linear-gradient(180deg,rgb(var(--glass-rgb)/0.09),rgb(var(--glass-rgb)/0.025)),var(--surface)] p-3.5 shadow-[0_18px_40px_-18px_rgb(var(--shade-rgb)/calc(0.9*var(--shade-k)))]">
      <div className="flex items-center justify-between gap-2">
        <span className={cn("rounded-md border px-1.5 py-0.5 font-mono text-[10.5px]", k.cls)}>{c.id}</span>
        <span className="text-[10.5px] text-ink-4">{k.label}</span>
      </div>
      <figcaption className="mt-2 text-[13px] font-medium leading-snug text-ink-hi">{c.title}</figcaption>
      <blockquote className="m-0 mt-1 text-[12px] leading-snug text-ink-3 [display:-webkit-box] [-webkit-line-clamp:3] [-webkit-box-orient:vertical] overflow-hidden">{c.text}</blockquote>
    </figure>
  );
}

function Trust() {
  const rows = [
    { k: "Every sentence cites a source", v: "Evidence Guard", d: "The copilot answers from read-only tools over the snapshot. Each sentence must cite a tool result from that run, and its numbers and dates must appear in the cited excerpt, or it is struck through. Reference questions: 6 of 6 supported after one fix, 0 unsupported sentences." },
    { k: "Diagnosis with the answer hidden", v: "Masked investigator", d: "With the RCA withheld and gold labels registered first, the documented cause was in the top three in 9 of 9 runs and ranked first in 7 of 9." },
    { k: "We tested a failure predictor. It lost.", v: "No failure dates", d: "Earlier failure families predicted later incidents 5.2%, 4.4% and 4.8% of the time, against a 5.6% chance share, and no asset repeats in the 380 records. So PlantPulse gives a window to act in, never a date a machine will fail." },
  ];
  const cols = [WALL.filter((_, i) => i % 3 === 0), WALL.filter((_, i) => i % 3 === 1), WALL.filter((_, i) => i % 3 === 2)];
  return (
    <section id="trust" data-stamp="4" aria-labelledby="trust-h" className="relative overflow-hidden border-y border-fg/[0.06]">
      <div className="mx-auto grid max-w-[1320px] gap-12 px-4 py-28 sm:px-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-16">
        <div className="relative z-10">
          <h2 id="trust-h" className="font-display text-[clamp(2rem,4vw,3.2rem)] leading-[1.02] text-ink-hi">AI that shows the limits of its evidence.</h2>
          <p className="mt-5 max-w-[50ch] text-[17px] leading-relaxed text-ink-2">An engineer will take apart any claim that cannot be traced. So the AI is held to the same rule as everyone else: show the source, or say you do not know.</p>
          <ul className="mt-10 flex flex-col">
            {rows.map((r) => (
              <li key={r.k} className="border-t border-fg/[0.08] py-6">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgb(var(--ai-rgb)/0.35)] bg-[rgb(var(--ai-rgb)/0.1)] px-2.5 py-0.5 text-[12px] font-medium text-ai-ink"><Quote className="size-3" aria-hidden="true" />{r.v}</span>
                <h3 className="mt-3 text-[22px] font-semibold leading-tight tracking-[-0.02em] text-ink-hi">{r.k}</h3>
                <p className="mt-2 text-[15.5px] leading-relaxed text-ink-2">{r.d}</p>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[13.5px] text-ink-3">All results are internal checks by the team. No independent reviewer, user study or pilot has run yet.</p>
        </div>
        <div className="lp-wall relative hidden h-[760px] items-center justify-center overflow-hidden lg:flex" aria-label={`Wall of ${WALL.length} real citations from the snapshot`} role="img">
          <div className="lp-wall-plane flex gap-4">
            <Marquee vertical pauseOnHover repeat={3} className="[--duration:46s]">{cols[0].map((c) => <EvidenceCard key={c.id} c={c} />)}</Marquee>
            <Marquee vertical pauseOnHover reverse repeat={3} className="[--duration:52s]">{cols[1].map((c) => <EvidenceCard key={c.id} c={c} />)}</Marquee>
            <Marquee vertical pauseOnHover repeat={3} className="[--duration:40s]">{cols[2].map((c) => <EvidenceCard key={c.id} c={c} />)}</Marquee>
          </div>
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1/4 lp-fade-t" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/4 lp-fade-b" />
          <div className="pointer-events-none absolute inset-y-0 left-0 w-1/5 lp-fade-l" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-1/5 lp-fade-r" />
        </div>
        <div className="lg:hidden">
          <Marquee pauseOnHover repeat={3} className="-mx-4 [--duration:50s]">{WALL.slice(0, 10).map((c) => <EvidenceCard key={c.id} c={c} />)}</Marquee>
        </div>
      </div>
    </section>
  );
}

function Value() {
  const roles = [
    { r: "Plant manager", g: "One honest picture of recorded loss and what is still open, with every number traceable to its row.", where: "overview" },
    { r: "Reliability engineer", g: "A defensible order of work, the sources and their conflicts side by side, and a cited brief to start from.", where: "queue/KO-3201" },
    { r: "Maintenance planner", g: "Owners, due dates and escalating reminders, plus the sister assets that need the same fix.", where: "actions/KO-3201" },
    { r: "Data owner", g: "A validated snapshot pipeline: publish a new register and every screen updates from the same source.", where: "foundation" },
  ];
  return (
    <section id="value" data-stamp="5" aria-labelledby="value-h" className="mx-auto max-w-[1320px] px-4 py-28 sm:px-8">
      <div className="grid gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-20">
        <div>
          <h2 id="value-h" className="font-display text-[clamp(2rem,4vw,3.4rem)] leading-[1.02] text-ink-hi">The value is a loss that does not come back.</h2>
          <div className="mt-6 flex flex-col gap-4 text-[17px] leading-relaxed text-ink-2">
            <p>A single breakdown of the {FACTS.first.label.toLowerCase()} recorded <b className="font-semibold text-ink-hi">{FACTS.first.actual}</b> of actual loss and <b className="font-semibold text-ink-hi">{FACTS.first.downtime} hours</b> of downtime. The records still open carry <b className="font-semibold text-ink-hi">{FACTS.openActual}</b>. Preventing even one repeat on a sister unit is where the money is.</p>
            <p>We do not publish a savings figure we have not measured. The business case screen computes break-even from inputs your company supplies, and labels the example scenario as an example.</p>
          </div>
          <ul className="mt-8 flex flex-col gap-2.5 text-[15px] text-ink-soft">
            {["Read-only towards the plant: no DCS, SAP or control-system writes", "SAP PM export as a CSV for a person to import", "Runs fully offline on the bundled snapshot for demos and audits"].map((t) => (
              <li key={t} className="flex gap-3"><span className="mt-[9px] h-px w-4 shrink-0 bg-accent" aria-hidden="true" />{t}</li>
            ))}
          </ul>
          <a href="#/business/KO-3201" className="mt-8 inline-flex items-center gap-2 text-[15.5px] font-semibold text-accent-ink underline decoration-accent-ink/40 hover:decoration-accent-ink">
            Open the business case <ArrowUpRight className="size-4" aria-hidden="true" />
          </a>
        </div>
        <div>
          <h3 className="text-[13px] font-medium text-ink-3">Who opens it, and what they get</h3>
          <ul className="mt-4 flex flex-col gap-2">
            {roles.map((x) => (
              <li key={x.r}>
                <a href={`#/${x.where}`} className="group grid grid-cols-[1fr_auto] items-start gap-4 rounded-2xl border border-fg/[0.07] bg-fg/[0.02] p-5 no-underline transition-[border-color,background-color] duration-200 hover:border-[rgb(var(--accent-ink-rgb)/0.35)] hover:bg-[rgb(var(--accent-rgb)/0.06)]">
                  <span>
                    <span className="block text-[21px] font-semibold leading-tight tracking-[-0.02em] text-ink-hi">{x.r}</span>
                    <span className="mt-1.5 block max-w-[52ch] text-[15px] leading-relaxed text-ink-2">{x.g}</span>
                  </span>
                  <ArrowUpRight className="mt-1 size-5 text-ink-4 transition-[color,transform] duration-200 ease-out group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent-ink" aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function Close() {
  return (
    <section aria-labelledby="close-h" className="relative overflow-hidden border-t border-fg/[0.06]">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[42vh] opacity-90"><PlantDrawing className="h-full w-full" /></div>
      <div className="pointer-events-none absolute left-[30%] top-0 h-[60%] w-[60%] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(closest-side,rgb(var(--accent-2-rgb)/0.22),transparent)]" />
      <div className="relative mx-auto flex max-w-[1320px] flex-col items-start gap-12 px-4 pb-40 pt-28 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-[660px]">
          <h2 id="close-h" className="font-display text-[clamp(2.3rem,5vw,4.2rem)] leading-[0.98] text-ink-hi">Pick up the {FACTS.first.short.toLowerCase()} where the register left it.</h2>
          <p className="mt-5 max-w-[48ch] text-[17px] leading-relaxed text-ink-2">The workspace opens on the same snapshot you just scrolled through. No sign-in during the trial.</p>
          <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-4">
            <PrimaryButton>{CTA}</PrimaryButton>
            <a href="?offline=1#/overview" className="text-[15.5px] text-ink-soft underline decoration-ink-soft/35 hover:decoration-ink-soft">or run the offline demo</a>
          </div>
        </div>
        <div className="lp-shadow-tag rotate-[4deg] self-center lg:mr-16" aria-hidden="true">
          <div className="lp-cord mx-auto -mt-28 hidden h-28 w-[2px] lg:block" />
          <div className="lp-tag" style={{ ["--w" as string]: "228px" }}>
            <div className="lp-tag-band is-amber">Follow-up review</div>
            <span className="lp-tag-hole" />
            <div className="lp-tag-body">
              <div className="lp-tag-name" style={{ ["--nm" as string]: "22px" }}>{FACTS.first.label}</div>
              <div className="lp-tag-line">{FACTS.first.plantLabel}</div>
              <div className="lp-tag-sign"><span className="lp-stamp ink">Logged</span><span className="lp-stamp ink">Prioritised</span><span className="lp-stamp red">Hold for evidence</span></div>
            </div>
          </div>
        </div>
      </div>
      <footer className="relative border-t border-fg/[0.06]">
        <div className="mx-auto flex max-w-[1320px] flex-col gap-2 px-4 py-8 text-[13px] text-ink-4 sm:flex-row sm:justify-between sm:px-8">
          <span className="flex items-center gap-2"><Mark size={22} />PlantPulse · CALIBER 2026, Case 2: Intelligence Manufacturing · Team Heisenberg</span>
          <span>Figures from the case dataset snapshot, review date {FACTS.review}. Source update time unknown.</span>
        </div>
      </footer>
    </section>
  );
}

/** The signature: a case tag that follows the reader and collects a stamp at each stage of the argument. */
const RECEIPT = [
  { s: "Logged", tone: "ink" },
  { s: "Prioritised", tone: "ink" },
  { s: "Investigated", tone: "ink" },
  { s: "Hold: evidence missing", tone: "red" },
  { s: "Every claim cited", tone: "green" },
] as const;

function useStampStage() {
  const [stage, setStage] = useState(-1);
  const [show, setShow] = useState(false);
  const update = useCallback(() => {
    const vh = window.innerHeight;
    let st = -1;
    document.querySelectorAll<HTMLElement>("[data-stamp]").forEach((el) => {
      if (el.getBoundingClientRect().top < vh * 0.55) st = Math.max(st, Number(el.dataset.stamp));
    });
    const tri = document.getElementById("triage")?.getBoundingClientRect();
    if (tri && tri.top < vh * 0.55) st = Math.max(st, 1);
    const inTriage = !!tri && tri.top < vh * 0.4 && tri.bottom > vh * 0.6;
    const close = document.getElementById("close-h")?.getBoundingClientRect();
    const atClose = !!close && close.top < vh * 0.9;
    setStage(Math.min(st, RECEIPT.length - 1));
    setShow(st >= 0 && !inTriage && !atClose);
  }, []);
  useEffect(() => {
    let raf = 0;
    const on = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(update); };
    on(); window.addEventListener("scroll", on, { passive: true }); window.addEventListener("resize", on);
    return () => { window.removeEventListener("scroll", on); window.removeEventListener("resize", on); cancelAnimationFrame(raf); };
  }, [update]);
  return { stage, show };
}

/** Wide screens only, where the gutter beside the 1320px column can hold it without covering copy. */
function Receipt({ stage, show }: { stage: number; show: boolean }) {
  return (
    <div aria-hidden="true" className={cn("pointer-events-none fixed bottom-6 right-6 z-40 hidden transition-[opacity,transform] duration-300 ease-out min-[1680px]:block",
      show ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0")}>
      <div className="lp-shadow-tag rotate-[3deg]">
        <div className="lp-tag" style={{ ["--w" as string]: "172px" }}>
          <div className="lp-tag-band is-blue">Case file</div>
          <span className="lp-tag-hole" />
          <div className="lp-tag-body">
            <div className="lp-tag-name">{FACTS.first.short}</div>
            <div className="lp-tag-sign">
              {RECEIPT.slice(0, stage + 1).map((r) => <span key={r.s} className={`lp-stamp ${r.tone}`}>{r.s}</span>)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Landing() {
  const { stage, show } = useStampStage();
  useEffect(() => { document.title = "PlantPulse · Evidence-backed reliability follow-through"; }, []);
  return (
    <div className="lp tw min-h-screen">
      <a href="#problem" onClick={(e) => jump(e, "#problem")} className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[80] focus:rounded-md focus:bg-ink-hi focus:px-4 focus:py-2 focus:text-canvas">Skip to content</a>
      <Navigation stage={stage} />
      <main>
        <Hero />
        <Problem />
        <Triage />
        <Workflow />
        <Inside />
        <States />
        <Trust />
        <Value />
        <Close />
      </main>
      <Receipt stage={stage} show={show} />
      <div className="lp-grain" aria-hidden="true" />
    </div>
  );
}
