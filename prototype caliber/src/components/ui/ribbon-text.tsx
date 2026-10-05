/*
 * Text filled with the 21st.dev "그라데이션" Ribbon Field gradient: hard stripes along 32deg (White, Sky blue,
 * Ultramarine, Iris) with feathered edges, kept moving by the stripe field's wave clock.
 *
 * Text clipping takes a CSS background, and a linear-gradient cannot bend, so the wave is carried as a drift of
 * each band edge along the stripe axis: amplitude (wave / 100) * 0.35 of the field, one static phase per edge, clock
 * 20.75 + ph * 1.2. Every term is written as sin(c + p) - sin(c0 + p), so it is exactly zero at ph = 0 and the
 * gradient never snaps when motion starts. Values are never rounded per frame. Seams are widened (FEATHER) for a
 * softer ribbon than the source CSS.
 */
import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/lib/theme";

const ANGLE = 32;
const WAVE = 14;
const CLOCK0 = 20.75;
/** Width of each seam between ribbons, in per cent of the field. The source has 0.4 to 4.7; this is softer. */
const FEATHER = 9;
/** Band edges from the source CSS (per cent along the stripe axis), each edge feathered by the source softness. */
const BANDS = [
  { hex: "#FFFFFF", from: 4.32, to: 33.18 },
  { hex: "#F4FFC7", from: 37.86, to: 58.14 },
  { hex: "#9BEA86", from: 58.86, to: 79.64 },
  { hex: "#4FD58F", from: 80, to: 100 },
];
/** On the light Pipo ground the white ribbon would vanish: same hue order, starting from navy, sky band deepened for contrast. */
const BANDS_LIGHT = [
  { hex: "#15213A", from: 4.32, to: 33.18 },
  { hex: "#2F7FE0", from: 37.86, to: 58.14 },
  { hex: "#4256F0", from: 58.86, to: 79.64 },
  { hex: "#4D2FF9", from: 80, to: 100 },
];
const PHASE = [0.0, 1.7, 3.1, 4.6, 5.9, 2.3, 0.8, 3.9];

function gradient(ph: number, bands = BANDS) {
  const amp = (WAVE / 100) * 0.35 * 100; // per cent of the field
  const c = CLOCK0 + ph * 1.2;
  const drift = (k: number) => amp * (Math.sin(c + PHASE[k]) - Math.sin(CLOCK0 + PHASE[k]));
  // Each seam is re-centred on the midpoint of the source gap and widened to FEATHER, so neighbouring ribbons
  // melt into each other instead of meeting on a hard diagonal through a letter.
  const seams = bands.slice(1).map((b, i) => (bands[i].to + b.from) / 2 + drift(i));
  const stops: string[] = [];
  bands.forEach((b, i) => {
    const from = i === 0 ? b.from : seams[i - 1] + FEATHER / 2;
    const to = i === bands.length - 1 ? b.to : seams[i] - FEATHER / 2;
    stops.push(`${b.hex} ${from.toFixed(3)}%`, `${b.hex} ${Math.max(to, from).toFixed(3)}%`);
  });
  return `linear-gradient(${ANGLE}deg, ${stops.join(", ")})`;
}

export function RibbonText({ children, className, speed = 1 }: { children: ReactNode; className?: string; speed?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [theme] = useTheme();
  useEffect(() => {
    const bands = theme === "light" ? BANDS_LIGHT : BANDS;
    const el = ref.current;
    if (!el) return;
    el.style.backgroundImage = gradient(0, bands);
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0, start = 0, visible = true;
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; });
    io.observe(el);
    const tick = (now: number) => {
      if (!start) start = now;
      if (visible) el.style.backgroundImage = gradient(((now - start) / 1000) * speed, bands);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); io.disconnect(); };
  }, [speed, theme]);
  return (
    <span ref={ref}
      className={cn("block bg-clip-text text-transparent [-webkit-background-clip:text] [background-size:125%_125%] [background-position:0%_0%]", className)}>
      {children}
    </span>
  );
}
