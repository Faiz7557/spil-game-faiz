import { useEffect, useRef } from 'react';

/**
 * GridPulse — SPIL Maritime Interactive Background
 *
 * Canvas-rendered 24px coordinate grid that illuminates where the pointer moves
 * and has gentle ambient random breathing pulses.
 *
 * Color tuning: Dominant PT SPIL Sea Green (#2E7D4E) and SPIL Red (#D21E20),
 * interspersed with Maritime Blue (#0072B2) and Port Amber (#E69F00).
 *
 * Zero-idle overhead: Canvas sleeps whenever no cells are active.
 */

// SPIL Maritime Palette for lit cells
// Weighting: 55% SPIL Green, 30% SPIL Red, 10% Maritime Blue, 5% Port Amber
const SPIL_PALETTE = [
  // SPIL Sea Greens (Dominant)
  { h: 144, s: 65, l: 42 }, // #2E7D4E primary
  { h: 145, s: 70, l: 36 }, // Deep sea green
  { h: 142, s: 60, l: 52 }, // Emerald highlight
  { h: 148, s: 75, l: 45 }, // Vibrant maritime green
  { h: 140, s: 55, l: 48 }, // Mint sea green

  // SPIL Reds (Dominant brand flag & alerts)
  { h: 359, s: 76, l: 47 }, // #D21E20 primary flag red
  { h: 358, s: 80, l: 41 }, // Crimson red
  { h: 356, s: 85, l: 54 }, // Bright SPIL vermilion
  { h: 360, s: 70, l: 38 }, // Deep burgundy

  // Maritime Navigation Blue (Okabe-Ito Surabaya Port)
  { h: 202, s: 100, l: 38 }, // #0072B2 ocean blue
  { h: 198, s: 90, l: 46 },  // Azure blue

  // Port Cargo Amber (Okabe-Ito Makassar Port)
  { h: 41,  s: 100, l: 46 }, // #E69F00 warm amber
];

const FAINT = 0.15;
const FADE = 2.2;
const PAD = 6;
const FADE_IN = 160;
const FADE_OUT = 750;

const easeOut = (t) => 1 - (1 - t) ** 2;
const easeIn = (t) => t * t;

export default function GridPulse({
  cell = 24,
  reach = 2.6,
  ambient = 2,
  maxLit = 160,
  avoid = '[data-grid-avoid]',
  className = '',
  style = {}
}) {
  const boxRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const el = boxRef.current;
    const paper = canvasRef.current;
    const ctx = paper?.getContext('2d');
    if (!el || !paper || !ctx) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let cols = 1;
    let rows = 1;
    let width = 0;
    let height = 0;
    let clear = [];
    const cells = new Map();

    // Protect text lines from being crowded by lit cells
    const measureText = () => {
      const bounds = el.getBoundingClientRect();
      const scope = el.parentElement || document;
      clear = [...scope.querySelectorAll(avoid)].flatMap((node) => {
        const range = document.createRange();
        range.selectNodeContents(node);
        const lines = [...range.getClientRects()].filter(
          (r) => r.width > 0 && r.height > 0
        );
        const boxes = lines.length > 0 ? lines : [node.getBoundingClientRect()];
        return boxes.map(
          (r) =>
            new DOMRect(
              r.left - bounds.left - PAD,
              r.top - bounds.top - PAD,
              r.width + PAD * 2,
              r.height + PAD * 2
            )
        );
      });
    };

    const measure = () => {
      width = el.clientWidth;
      height = el.clientHeight;
      cols = Math.max(1, Math.ceil(width / cell));
      rows = Math.max(1, Math.ceil(height / cell));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      paper.width = Math.round(width * dpr);
      paper.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      measureText();
      wake();
    };

    const brightness = (col, row) => {
      const x = col * cell + cell / 2;
      const y = row * cell + cell / 2;
      let nearest = Number.POSITIVE_INFINITY;
      for (const r of clear) {
        const dx = Math.max(r.left - x, 0, x - r.right);
        const dy = Math.max(r.top - y, 0, y - r.bottom);
        nearest = Math.min(nearest, Math.hypot(dx, dy));
        if (nearest === 0) break;
      }
      if (nearest === Number.POSITIVE_INFINITY) return 1;
      return FAINT + (1 - FAINT) * Math.min(1, nearest / (FADE * cell));
    };

    // Pick color from SPIL Maritime Palette with heavy weighting on Green & Red
    const getSpilColor = () => {
      const entry = SPIL_PALETTE[Math.floor(Math.random() * SPIL_PALETTE.length)];
      return `hsl(${entry.h}, ${entry.s}%, ${entry.l}%)`;
    };

    // Active animation loop (runs only while cells are lit)
    let frame = 0;
    const draw = (now) => {
      frame = 0;
      ctx.clearRect(0, 0, width, height);

      for (const [key, c] of cells) {
        let alpha;
        if (now < c.until) {
          alpha = easeOut(Math.min(1, (now - c.born) / FADE_IN));
        } else {
          const t = (now - c.until) / FADE_OUT;
          if (t >= 1) {
            cells.delete(key);
            continue;
          }
          alpha = 1 - easeIn(t);
        }

        const isDark = document.documentElement.classList.contains('dark');
        ctx.globalAlpha = alpha * c.dim * (isDark ? 0.8 : 0.45);
        ctx.fillStyle = c.colour;
        // Inset by 1px so hairline grid borders remain visible
        ctx.fillRect(c.col * cell + 1, c.row * cell + 1, cell - 1, cell - 1);
      }

      ctx.globalAlpha = 1;
      if (cells.size > 0) frame = requestAnimationFrame(draw);
    };

    const wake = () => {
      if (!frame) frame = requestAnimationFrame(draw);
    };

    const light = (col, row, hold) => {
      if (col < 0 || row < 0 || col >= cols || row >= rows) return;
      if (cells.size >= maxLit) return;
      const key = `${col},${row}`;
      const now = performance.now();
      const lit = cells.get(key);
      if (lit && now < lit.until) return;

      let born = now;
      if (lit) {
        const faded = 1 - easeIn(Math.min(1, (now - lit.until) / FADE_OUT));
        born = now - (1 - Math.sqrt(1 - faded)) * FADE_IN;
      }

      cells.set(key, {
        col,
        row,
        colour: lit?.colour || getSpilColor(),
        dim: brightness(col, row),
        born,
        until: now + hold,
      });
      wake();
    };

    // Pointer sweeps across grid
    let pending = 0;
    let at = null;
    const paint = () => {
      pending = 0;
      if (!at) return;
      const cx = Math.floor(at.x / cell);
      const cy = Math.floor(at.y / cell);
      const span = Math.ceil(reach);
      for (let dy = -span; dy <= span; dy++) {
        for (let dx = -span; dx <= span; dx++) {
          const away = Math.hypot(dx, dy);
          if (away > reach) continue;
          if (Math.random() > 1 - away / (reach + 0.6)) continue;
          light(cx + dx, cy + dy, 260 + Math.random() * 850);
        }
      }
    };

    const onMove = (event) => {
      const bounds = el.getBoundingClientRect();
      at = { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
      if (!pending) pending = requestAnimationFrame(paint);
    };

    // Ambient random breathing (so grid feels alive even without pointer move)
    let visible = true;
    let beat = 0;
    const drift = () => {
      beat = window.setTimeout(drift, 1200 + Math.random() * 1600);
      if (!visible || document.hidden) return;
      for (let i = 0; i < ambient; i++) {
        light(
          Math.floor(Math.random() * cols),
          Math.floor(Math.random() * rows),
          900 + Math.random() * 1500
        );
      }
    };
    beat = window.setTimeout(drift, 400);

    const sight = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? true;
    });
    sight.observe(el);

    const resize = new ResizeObserver(measure);
    resize.observe(el);

    measure();
    document.fonts?.ready.then(measureText).catch(() => {});
    window.addEventListener('pointermove', onMove, { passive: true });

    return () => {
      sight.disconnect();
      resize.disconnect();
      cancelAnimationFrame(frame);
      cancelAnimationFrame(pending);
      clearTimeout(beat);
      window.removeEventListener('pointermove', onMove);
    };
  }, [cell, reach, ambient, maxLit, avoid]);

  return (
    <div
      ref={boxRef}
      aria-hidden
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      style={{
        backgroundImage: `
          linear-gradient(to right, var(--grid-hairline, rgba(0, 0, 0, 0.04)) 1px, transparent 1px),
          linear-gradient(to bottom, var(--grid-hairline, rgba(0, 0, 0, 0.04)) 1px, transparent 1px)
        `,
        backgroundSize: `${cell}px ${cell}px`,
        maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 90%, rgba(0,0,0,0.4))',
        WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 90%, rgba(0,0,0,0.4))',
        ...style,
      }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </div>
  );
}
