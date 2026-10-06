import { useCallback, useRef, useState } from 'react';

// Callback-ref based size tracker. Returns [ref, { width, height }] where the
// ref goes on the element to measure; updates on every resize.
export function useElementSize() {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const observer = useRef(null);
  const ref = useCallback((node) => {
    if (observer.current) {
      observer.current.disconnect();
      observer.current = null;
    }
    if (!node) return;
    const measure = () => {
      const { offsetWidth: width, offsetHeight: height } = node;
      setSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
    };
    measure();
    if (typeof ResizeObserver !== 'undefined') {
      observer.current = new ResizeObserver(measure);
      observer.current.observe(node);
    }
  }, []);
  return [ref, size];
}
