import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Scroll-driven progress hook (inspired by Caliber's motion.ts).
 *
 * Tracks how far `ref` has travelled through the viewport and exposes the
 * value both as React state (`progress`) and as a `--p` CSS custom property
 * set directly on the DOM node — so pure-CSS transforms and opacity fades
 * can react to scroll without any JS tween library.
 *
 * @param {Object}  opts
 * @param {'enter-exit'|'center'|'top'} opts.mode
 *   - 'enter-exit' (default): 0 when el top meets viewport bottom → 1 when el bottom meets viewport top
 *   - 'center': 0 when el center is at viewport bottom → 1 when el center is at viewport top
 *   - 'top': 0 when el top meets viewport bottom → 1 when el top meets viewport top
 * @param {number}  opts.clamp  Upper bound for --p (default 1)
 */
export function useScrollProgress({ mode = 'enter-exit', clamp = 1 } = {}) {
  const ref = useRef(null);
  const [progress, setProgress] = useState(0);
  const rafRef = useRef(null);

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const vh = window.innerHeight;
    let p;

    switch (mode) {
      case 'center': {
        const center = rect.top + rect.height / 2;
        p = 1 - center / vh;
        break;
      }
      case 'top': {
        p = 1 - rect.top / vh;
        break;
      }
      case 'enter-exit':
      default: {
        const total = rect.height + vh;
        const scrolled = vh - rect.top;
        p = scrolled / total;
        break;
      }
    }

    p = Math.max(0, Math.min(clamp, p));
    setProgress(p);
    el.style.setProperty('--p', p.toFixed(4));
  }, [mode, clamp]);

  useEffect(() => {
    const onScroll = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(update);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    // Initial measurement
    update();

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [update]);

  return { ref, progress };
}

/**
 * Lightweight hook for pointer-reactive perspective shift.
 * Returns a ref to attach to the container; sets --mx and --my
 * CSS variables (normalised -1..1 from center).
 */
export function usePointerReactive() {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onMove = (e) => {
      const rect = el.getBoundingClientRect();
      const mx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      const my = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
      el.style.setProperty('--mx', mx.toFixed(3));
      el.style.setProperty('--my', my.toFixed(3));
    };

    const onLeave = () => {
      el.style.setProperty('--mx', '0');
      el.style.setProperty('--my', '0');
    };

    el.addEventListener('pointermove', onMove, { passive: true });
    el.addEventListener('pointerleave', onLeave);

    return () => {
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  return ref;
}
