import { useEffect, useState, type RefObject } from "react";

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
/** Progress of p through the window [a, b], clamped to 0..1. */
export const seg = (p: number, a: number, b: number) => clamp((p - a) / (b - a));
export const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export function useReducedMotion() {
  const q = "(prefers-reduced-motion: reduce)";
  const [reduced, setReduced] = useState(() => typeof matchMedia !== "undefined" && matchMedia(q).matches);
  useEffect(() => {
    const m = matchMedia(q);
    const on = () => setReduced(m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return reduced;
}

/**
 * Scroll progress of a section, written to `--p` on the element and passed to `onFrame`, once per animation
 * frame and only while the section is near the viewport. `mode: "pin"` measures a tall section whose child is
 * sticky (0 when its top reaches the viewport top, 1 when its bottom reaches the viewport bottom); `"exit"`
 * measures how far a natural-flow section has scrolled out over one viewport height.
 */
export function useScrollProgress(ref: RefObject<HTMLElement>, onFrame?: (p: number) => void, mode: "pin" | "exit" = "pin", enabled = true) {
  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;
    let raf = 0, last = -1, visible = true;
    const measure = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const p = mode === "pin" ? clamp(-r.top / Math.max(1, r.height - vh)) : clamp(-r.top / vh);
      if (Math.abs(p - last) < 0.0005) return;
      last = p;
      el.style.setProperty("--p", p.toFixed(4));
      onFrame?.(p);
    };
    const req = () => { if (visible && !raf) raf = requestAnimationFrame(measure); };
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) req(); }, { rootMargin: "200px 0px" });
    io.observe(el);
    window.addEventListener("scroll", req, { passive: true });
    window.addEventListener("resize", req);
    measure();
    return () => { io.disconnect(); window.removeEventListener("scroll", req); window.removeEventListener("resize", req); cancelAnimationFrame(raf); };
  }, [ref, onFrame, mode, enabled]);
}
