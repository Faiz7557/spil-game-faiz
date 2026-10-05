// The light theme's ground: the "Pipo" mesh (21st.dev, Bloom Field). One radial bloom per colour anchored at its own
// point over a paper backdrop, with a fine grain on top. Animated from an elapsed-seconds clock; every offset is
// written to be exactly 0 at t = 0, so nothing snaps when motion starts. Only runs while the light theme is on.
import { useEffect, useRef } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

const GRAIN = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.305'/%3E%3C/svg%3E")`;
const BLOOMS = [
  { rgb: "230, 176, 147", x: 68.1, y: 46.03, r: 41.1 }, // Apricot
  { rgb: "163, 206, 255", x: 25.17, y: 75.99, r: 44.6 }, // Sky blue
  { rgb: "250, 249, 239", x: 53.11, y: 12.71, r: 66.65 }, // Paper
];
const SEED = 1;
// A static phase per bloom, hashed once from the seed. The seed itself is never animated.
const hash = (n: number) => { const v = Math.sin(n * 12.9898 + SEED * 78.233) * 43758.5453; return (v - Math.floor(v)) * Math.PI * 2; };
const PHASE = BLOOMS.map((_, i) => [hash(i + 1), hash(i + 11)] as const);
const AMT = 0.72;

function frame(t: number) {
  const ph = t * 0.86;
  const layers = BLOOMS.map((b, i) => {
    const [p, p2] = PHASE[i];
    const x = b.x + (Math.sin(ph * 0.55 + p) - Math.sin(p)) * 14 * AMT;
    const y = b.y + (Math.sin(ph * 0.43 + p2) - Math.sin(p2)) * 14 * AMT;
    const s = (k: number) => `${(b.r * k).toFixed(3)}%`;
    return `radial-gradient(circle at ${x.toFixed(3)}% ${y.toFixed(3)}%, rgba(${b.rgb}, 1) 0%, rgba(${b.rgb}, 0.844) ${s(0.25)}, rgba(${b.rgb}, 0.5) ${s(0.5)}, rgba(${b.rgb}, 0.156) ${s(0.75)}, rgba(${b.rgb}, 0) ${s(1)})`;
  });
  return `${GRAIN}, ${layers.join(", ")}`;
}

export function ThemeBackdrop() {
  const ref = useRef<HTMLDivElement>(null);
  const [theme] = useTheme();
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.backgroundImage = frame(0);
    if (theme !== "light" || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0, start = 0, last = 0;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (document.hidden) return;
      if (!start) start = now;
      if (now - last < 33) return; // ~30 fps is plenty for a drift this slow
      last = now;
      el.style.backgroundImage = frame((now - start) / 1000);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [theme]);
  return (
    <div ref={ref} aria-hidden="true" className="pipo-backdrop"
      style={{ backgroundColor: "#FAF9EF", backgroundSize: "120px 120px, auto, auto, auto", backgroundBlendMode: "overlay, normal, normal, normal" }} />
  );
}

/** Sun / moon switch, used in the landing navigation and the workspace header. */
export function ThemeToggle({ className }: { className?: string }) {
  const [theme, toggle] = useTheme();
  const light = theme === "light";
  return (
    <button type="button" onClick={toggle} aria-label={light ? "Switch to the dark theme" : "Switch to the light theme"} title={light ? "Dark theme" : "Light theme"}
      className={cn("relative grid size-9 shrink-0 place-items-center overflow-hidden rounded-[10px] border border-line bg-fg/[0.03] text-ink-2 transition-colors duration-150 hover:border-line-strong hover:text-ink-hi", className)}>
      <Sun className={cn("absolute size-[17px] transition-[transform,opacity] duration-300 ease-out-soft", light ? "rotate-0 opacity-100" : "-rotate-90 scale-50 opacity-0")} strokeWidth={1.7} aria-hidden="true" />
      <Moon className={cn("absolute size-[16px] transition-[transform,opacity] duration-300 ease-out-soft", light ? "rotate-90 scale-50 opacity-0" : "rotate-0 opacity-100")} strokeWidth={1.7} aria-hidden="true" />
    </button>
  );
}
