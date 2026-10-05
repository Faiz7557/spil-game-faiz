// Coverflow carousel for content cards, adapted from the 21st.dev coverflow-carousel: the centre card sits flat and
// is fully interactive; neighbours tilt back and recede. Positions are painted straight to the DOM from one
// fractional index, settled with an exponential ease-out. Changes from the source: cards hold any React content,
// a drag only starts after the pointer travels (so buttons and links inside the centre card still click), a side
// card comes to the centre when clicked, and there is no looping (a list of findings has a first and a last).
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CoverflowItem { key: string; label: string; node: ReactNode }

export function Coverflow({ items, cardWidth = "min(560px, 82vw)", cardHeight = "auto", rotate = 38, depth = 0.5, fade = 0.22, gap = 0.04,
  label, start = 0, onChange, className }: {
  items: CoverflowItem[]; cardWidth?: string; cardHeight?: string; rotate?: number; depth?: number; fade?: number; gap?: number;
  label: string; start?: number; onChange?: (i: number) => void; className?: string;
}) {
  const count = items.length;
  const frame = useRef<HTMLDivElement>(null);
  const cards = useRef<(HTMLDivElement | null)[]>([]);
  const pos = useRef(start);
  const target = useRef(start);
  const width = useRef(0);
  const raf = useRef<number | null>(null);
  const drag = useRef<{ id: number; x: number; pos: number; v: number; t: number; live: boolean } | null>(null);
  const [sel, setSel] = useState(start);
  // "auto": the stage is as tall as the tallest card, so no card ever scrolls inside itself.
  const auto = cardHeight === "auto";
  const [fit, setFit] = useState(0);
  const inner = useRef<(HTMLDivElement | null)[]>([]);
  const reduced = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

  const clamp = (p: number) => Math.max(0, Math.min(count - 1, p));

  const paint = useCallback(() => {
    const w = width.current;
    if (!w) return;
    const pitch = w * (0.62 + gap);
    cards.current.forEach((card, i) => {
      if (!card) return;
      const off = i - pos.current, d = Math.abs(off);
      const ramp = Math.pow(d, 0.6);
      const tilt = Math.min(rotate * ramp, 70) * Math.sign(off);
      card.style.transform = `translateX(calc(-50% + ${off * pitch}px)) translateZ(${-depth * w * ramp}px) rotateY(${-tilt}deg)`;
      card.style.opacity = String(Math.max(0, 1 - fade * d));
      card.style.zIndex = String(100 - Math.round(d * 2));
      card.style.visibility = d > 3.2 ? "hidden" : "visible";
      const centre = d < 0.5;
      card.dataset.centre = centre ? "1" : "0";
      card.setAttribute("aria-hidden", centre ? "false" : "true");
    });
  }, [depth, fade, gap, rotate]);

  const settle = useCallback((to: number) => {
    if (raf.current !== null) cancelAnimationFrame(raf.current);
    target.current = to;
    const i = Math.round(to);
    setSel(i); onChange?.(i);
    if (reduced) { pos.current = to; paint(); return; }
    const step = () => {
      const r = to - pos.current;
      if (Math.abs(r) < 0.0005) { pos.current = to; paint(); raf.current = null; return; }
      pos.current += r * 0.16;
      paint();
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
  }, [onChange, paint, reduced]);

  const nudge = (by: number) => settle(clamp(Math.round(target.current) + by));

  useLayoutEffect(() => {
    const measure = () => {
      const c = cards.current[0];
      if (c) { width.current = c.offsetWidth; paint(); }
      if (auto) setFit(Math.max(0, ...inner.current.map((n) => n?.scrollHeight ?? 0)));
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (frame.current) ro.observe(frame.current);
    inner.current.forEach((n) => n && ro.observe(n));
    return () => ro.disconnect();
  }, [paint, count, auto]);
  useEffect(() => () => { if (raf.current !== null) cancelAnimationFrame(raf.current); }, []);
  // A new list (e.g. a filter changed) starts again from its first card.
  useEffect(() => { pos.current = clamp(Math.min(pos.current, count - 1)); settle(clamp(Math.round(pos.current))); }, [count]); // eslint-disable-line react-hooks/exhaustive-deps

  const onDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("a, button, input, textarea, select, [data-no-drag]") && (e.target as HTMLElement).closest("[data-centre='1']")) return;
    drag.current = { id: e.pointerId, x: e.clientX, pos: pos.current, v: 0, t: performance.now(), live: false };
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    if (!d.live) {
      if (Math.abs(e.clientX - d.x) < 6) return;
      d.live = true;
      if (raf.current !== null) { cancelAnimationFrame(raf.current); raf.current = null; }
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }
    const pitch = width.current * 0.66;
    const now = performance.now(), prev = pos.current;
    pos.current = clamp(d.pos - (e.clientX - d.x) / pitch);
    d.v = ((pos.current - prev) / Math.max(now - d.t, 1)) * 1000;
    d.t = now;
    paint();
  };
  const onUp = (e: React.PointerEvent) => {
    const d = drag.current;
    drag.current = null;
    if (!d || d.id !== e.pointerId || !d.live) return;
    settle(clamp(Math.round(pos.current + Math.max(-2, Math.min(2, d.v * 0.18)))));
  };

  if (!count) return null;
  return (
    <div className={cn("relative w-full", className)} role="region" aria-roledescription="carousel" aria-label={label}
      style={{ ["--cf-w" as string]: cardWidth, ["--cf-h" as string]: cardHeight }}>
      <div ref={frame} tabIndex={0}
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
        onKeyDown={(e) => { if (e.key === "ArrowLeft") { e.preventDefault(); nudge(-1); } else if (e.key === "ArrowRight") { e.preventDefault(); nudge(1); } }}
        className="relative cursor-grab overflow-hidden rounded-2xl py-6 outline-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
        style={{ perspective: "calc(var(--cf-w) * 3)", touchAction: "pan-y" }}>
        <div className="relative select-none" style={{ height: auto ? fit || 240 : "var(--cf-h)", transformStyle: "preserve-3d" }}>
          {items.map((it, i) => (
            <div key={it.key} ref={(n) => { cards.current[i] = n; }} role="group" aria-roledescription="slide" aria-label={`${i + 1} of ${count}: ${it.label}`}
              className="group/cf absolute left-1/2 top-0 h-full will-change-transform" style={{ width: "var(--cf-w)" }}>
              <div className="h-full overflow-hidden rounded-2xl border border-line bg-[var(--popover-solid)] shadow-[var(--shadow-pop)]">
                <div ref={(n) => { inner.current[i] = n; }} className={auto ? "" : "h-full overflow-y-auto"}>{it.node}</div>
              </div>
              {/* a side card is a button to itself */}
              <button type="button" tabIndex={-1} aria-label={`Show ${it.label}`} onClick={() => settle(i)}
                className="absolute inset-0 rounded-2xl group-data-[centre=1]/cf:hidden" />
            </div>
          ))}
        </div>
      </div>
      <div className="mt-1 flex items-center justify-center gap-3">
        <button type="button" onClick={() => nudge(-1)} disabled={sel === 0} aria-label="Previous" className="btn sm !px-2"><ChevronLeft aria-hidden="true" /></button>
        {count <= 14 ? (
          <div className="flex items-center gap-1.5">
            {items.map((it, i) => (
              <button key={it.key} type="button" onClick={() => settle(i)} aria-label={`Go to ${i + 1}`} aria-current={i === sel}
                className={cn("h-1.5 rounded-full transition-[width,background-color] duration-300 ease-out-soft", i === sel ? "w-5 bg-accent" : "w-1.5 bg-fg/20 hover:bg-fg/40")} />
            ))}
          </div>
        ) : <span className="min-w-[4.5rem] text-center text-[12.5px] tabular-nums text-ink-3">{sel + 1} / {count}</span>}
        <button type="button" onClick={() => nudge(1)} disabled={sel === count - 1} aria-label="Next" className="btn sm !px-2"><ChevronRight aria-hidden="true" /></button>
      </div>
    </div>
  );
}
