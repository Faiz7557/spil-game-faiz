// The peak of the page: the whole incident register, one dot per real record, narrowed by scroll to the one
// case the Problem Tank reviews first, which a claw then lifts out. Every filter step is a real attribute of
// the record (status, RCA due date, evidence package); nothing is sampled or invented.
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { DOTS, FACTS } from "./facts";
import { clamp, easeInOut, easeOut, seg, useReducedMotion, useScrollProgress } from "./motion";

const PHASES = [
  { n: FACTS.records, label: "records in the incident register", note: `${FACTS.plants} plants, ${FACTS.from} to ${FACTS.to}. Every dot is one row.` },
  { n: FACTS.open, label: "are still open", note: "Closed and cancelled risks step aside. The rest still need someone." },
  { n: FACTS.rcaDuePassed, label: "are past their RCA due date", note: `As of the review date, ${FACTS.review}. This is where follow-through usually stalls.` },
  { n: FACTS.packages, label: "carry a full evidence package", note: "Condition history, hourly plant data and an RCA deck, so a decision can cite its sources." },
  { n: 1, label: "gets reviewed first", note: "Ranked by the register's own lifecycle, criticality and the earliest missed plan date. No invented risk score." },
] as const;
const phaseAt = (p: number) => (p < 0.2 ? 0 : p < 0.38 ? 1 : p < 0.56 ? 2 : p < 0.75 ? 3 : 4);

/** Slot order for the five tags: first in queue sits in the middle, under the claw. */
const SLOT_OF = [2, 1, 3, 0, 4];
/** Canvas cannot read CSS variables: resolve a theme token to its current value at draw time. */
const tokenCache = new Map<string, string>();
const resolve = (v: string) => {
  const m = /^var\((--[\w-]+)\)$/.exec(v);
  if (!m) return v;
  let c = tokenCache.get(m[1]);
  if (!c) { c = getComputedStyle(document.documentElement).getPropertyValue(m[1]).trim() || "#888"; tokenCache.set(m[1], c); }
  return c;
};
const BAND: Record<string, string> = { followup: "is-amber", operational: "", investigation: "is-blue", pending: "is-violet", planned: "is-steel" };

export default function Triage() {
  const reduced = useReducedMotion();
  const section = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const tags = useRef<(HTMLDivElement | null)[]>([]);
  const claw = useRef<HTMLDivElement>(null);
  const size = useRef({ w: 0, h: 0, dpr: 1 });
  const pRef = useRef(reduced ? 1 : 0);
  const [phase, setPhase] = useState(reduced ? 4 : 0);
  const [closed, setClosed] = useState(reduced);

  const geometry = () => {
    const { w, h } = size.current;
    const narrow = w < 640;
    const cols = narrow ? 19 : 20;
    const rows = Math.ceil(DOTS.length / cols);
    const gap = Math.min(w / (cols + 1), (h * (narrow ? 0.78 : 0.8)) / rows);
    const ox = (w - gap * (cols - 1)) / 2, oy = (h - gap * (rows - 1)) / 2;
    const slotGap = Math.min(w / 5.2, 190);
    const slotY = h * (narrow ? 0.6 : 0.58);
    const slot = (i: number) => ({ x: w / 2 + (i - 2) * slotGap, y: slotY });
    return { cols, gap, ox, oy, slot, slotGap, slotY };
  };

  const draw = useCallback((p: number) => {
    pRef.current = p;
    const c = canvas.current;
    if (!c || !size.current.w) return;
    const ctx = c.getContext("2d")!;
    const { w, h, dpr } = size.current;
    const g = geometry();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const f1 = seg(p, 0.12, 0.24), f2 = seg(p, 0.3, 0.42), f3 = easeInOut(seg(p, 0.48, 0.64)), f4 = seg(p, 0.62, 0.7);
    const r0 = Math.max(1.6, g.gap * 0.2);
    let fullIdx = 0;
    DOTS.forEach((d, i) => {
      const gx = g.ox + (i % g.cols) * g.gap, gy = g.oy + Math.floor(i / g.cols) * g.gap;
      let alpha = 1, x = gx, y = gy, r = r0;
      let color = d.open ? "var(--ink-soft)" : "var(--ink-5)";
      if (!d.open) alpha *= 1 - 0.82 * f1;
      if (d.pastDue) color = f2 > 0.5 ? "var(--caution)" : "var(--ink-soft)";
      if (d.pastDue) alpha *= 1;
      else if (d.open) alpha *= 1 - 0.55 * f2;
      if (d.full) {
        const q = FACTS.queue.findIndex((x2) => x2.tag === d.tag);
        const s = g.slot(SLOT_OF[q >= 0 ? q : fullIdx]);
        fullIdx++;
        x = gx + (s.x - gx) * f3; y = gy + (s.y - gy) * f3; r = r0 + (r0 * 3.2) * f3;
        color = f3 > 0.05 ? "var(--accent-ink)" : color;
        alpha = (d.open ? 1 : 1 - 0.82 * f1 * (1 - f3)) * (1 - f4);
      } else {
        alpha *= (1 - 0.7 * f3) * (1 - 0.6 * seg(p, 0.74, 0.86));
      }
      if (alpha <= 0.01) return;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = resolve(color);
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalAlpha = 1;

    // HTML layers: tags fade in where the dots landed, the claw descends and lifts the first case.
    const f5 = easeOut(seg(p, 0.74, 0.85)), f6 = easeInOut(seg(p, 0.87, 0.96));
    const lift = h * 0.22 * f6;
    FACTS.queue.forEach((_q, qi) => {
      const el = tags.current[qi];
      if (!el) return;
      const s = g.slot(SLOT_OF[qi]);
      const isFirst = qi === 0;
      const tw = Math.min(150, g.slotGap - 8);
      el.style.setProperty("--w", `${tw}px`);
      el.style.setProperty("--nm", `${Math.max(12, Math.min(17, tw * 0.115))}px`);
      el.style.opacity = String(f4);
      el.style.filter = isFirst ? "" : `brightness(${1 - 0.6 * seg(p, 0.8, 0.9)}) saturate(${1 - 0.5 * seg(p, 0.8, 0.9)})`;
      el.style.transform = `translate3d(${s.x}px, ${s.y - (isFirst ? lift : 0)}px, 0) translate(-50%, -50%) scale(${0.92 + 0.08 * f4})`;
    });
    if (claw.current) {
      const s = g.slot(2);
      const grab = s.y - 112; // claw tips (78px tall) close on the tag's top edge
      const y = -h * 0.5 + (grab + h * 0.5) * f5 - lift;
      claw.current.style.transform = `translate3d(${s.x}px, ${y}px, 0) translateX(-50%)`;
      claw.current.style.opacity = String(clamp(f5 * 3));
    }
    setClosed(p > 0.85);
    setPhase(phaseAt(p));
  }, []);

  useEffect(() => {
    const el = stage.current, c = canvas.current;
    if (!el || !c) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      size.current = { w: r.width, h: r.height, dpr };
      c.width = Math.round(r.width * dpr); c.height = Math.round(r.height * dpr);
      draw(pRef.current);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [draw]);
  useEffect(() => { if (reduced) draw(1); }, [reduced, draw]);
  useEffect(() => {
    // Theme switch: forget the resolved colours and repaint the current frame.
    const mo = new MutationObserver(() => { tokenCache.clear(); draw(pRef.current); });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => mo.disconnect();
  }, [draw]);
  useScrollProgress(section, draw, "pin", !reduced);

  const cur = PHASES[phase];
  return (
    <section id="triage" ref={section} aria-labelledby="triage-h" className="relative" style={{ height: reduced ? "auto" : "520vh" }}>
      <div className={reduced ? "relative" : "sticky top-0 h-[100svh] overflow-hidden"}>
        <div className="mx-auto grid h-full max-w-[1320px] grid-rows-[auto_1fr] gap-2 px-4 pt-20 pb-6 sm:px-8 lg:grid-cols-[minmax(300px,380px)_1fr] lg:grid-rows-1 lg:gap-10 lg:pt-24 lg:pb-10">
          <div className="flex flex-col justify-center">
            <h2 id="triage-h" className="text-[14px] font-medium text-ink-3">From the register to one decision</h2>
            <p className="mt-3 font-display text-[clamp(4rem,10vw,8.4rem)] leading-[0.86] text-ink-hi tabular-nums" aria-live="polite">
              {cur.n}
            </p>
            <p className="mt-2 text-[clamp(1.35rem,2.3vw,1.9rem)] font-semibold tracking-[-0.02em] leading-tight text-ink-hi">{phase === 4 ? <><span className="text-accent-ink">The {FACTS.first.label.toLowerCase()}</span> {cur.label}</> : cur.label}</p>
            <p className="mt-2 max-w-[38ch] text-[15.5px] leading-relaxed text-ink-2">{cur.note}</p>
            <ol className="mt-6 hidden flex-col gap-1.5 border-l border-[rgba(255,255,255,0.08)] pl-4 text-[14px] lg:flex" aria-label="Filter steps">
              {PHASES.map((ph, i) => (
                <li key={i} className={`transition-colors duration-200 ${i === phase ? "text-ink-hi" : i < phase ? "text-ink-4" : "text-ink-5"}`}>
                  <span className="inline-block w-12 font-mono font-semibold tabular-nums">{ph.n}</span>{ph.label}
                </li>
              ))}
            </ol>
            <div className={`mt-6 transition-[opacity,transform] duration-300 ease-out ${phase === 4 ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0"}`}>
              <ul className="flex flex-col gap-1 text-[14px] leading-snug text-ink-soft">
                {FACTS.first.reasons.slice(0, 4).map((r) => <li key={r} className="flex gap-2"><span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-caution" aria-hidden="true" />{r}</li>)}
              </ul>
              <a href={`#/queue/${FACTS.first.tag}`} tabIndex={phase === 4 ? 0 : -1}
                className="mt-4 inline-flex items-center gap-2 text-[15px] font-semibold text-accent-ink underline decoration-accent-ink/40 hover:decoration-accent-ink">
                Open this case in the Problem Tank <ArrowRight className="size-4" aria-hidden="true" />
              </a>
            </div>
          </div>
          <div ref={stage} className={`relative min-h-0 overflow-hidden ${reduced ? "h-[70vh]" : ""}`} aria-hidden="true">
            <canvas ref={canvas} className="absolute inset-0 h-full w-full" />
            <div ref={claw} className={`lp-claw absolute left-0 top-0 w-[96px] opacity-0 ${closed ? "is-closed" : ""}`}>
              <div className="lp-cord absolute bottom-full left-1/2 h-[100vh] w-[3px] -translate-x-1/2" />
              <svg width="96" height="78" viewBox="0 0 96 78" className="-mt-px">
                <rect x="36" y="0" width="24" height="16" rx="3" fill="var(--ink-3)" />
                <rect x="30" y="14" width="36" height="10" rx="2" fill="var(--ink-soft)" />
                <g className="lp-claw-arm l"><path d="M34 24 L16 46 L22 72" fill="none" stroke="var(--ink-soft)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" /></g>
                <g className="lp-claw-arm r"><path d="M62 24 L80 46 L74 72" fill="none" stroke="var(--ink-soft)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" /></g>
                <circle cx="48" cy="20" r="3" fill="var(--canvas)" />
              </svg>
            </div>
            {FACTS.queue.map((q, i) => (
              <div key={q.tag} ref={(el) => { tags.current[i] = el; }} className="lp-shadow-tag absolute left-0 top-0 opacity-0 will-change-transform">
                <div className="lp-tag">
                  <div className={`lp-tag-band ${BAND[q.category] ?? ""}`}><span className="hidden sm:inline">{q.plant}</span></div>
                  <span className="lp-tag-hole" />
                  <div className="lp-tag-body">
                    <div className="lp-tag-name">{q.short}</div>
                    <div className="lp-tag-line hidden sm:block">{q.plant}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
