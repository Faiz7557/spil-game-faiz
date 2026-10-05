import { useCallback, useEffect, useState } from "react";

export type Load<T> = { status: "idle" | "loading" | "ok" | "error"; data: T | null; error: string | null };

/** Runs `fn` on mount (and when `deps` change) unless `enabled` is false. `reload` re-runs it. */
export function useLoad<T>(fn: () => Promise<T>, deps: unknown[], enabled = true) {
  const [state, setState] = useState<Load<T>>({ status: enabled ? "loading" : "idle", data: null, error: null });
  const [tick, setTick] = useState(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(fn, deps);
  useEffect(() => {
    if (!enabled) { setState({ status: "idle", data: null, error: null }); return; }
    let alive = true;
    setState((s) => ({ ...s, status: "loading", error: null }));
    run().then(
      (data) => alive && setState({ status: "ok", data, error: null }),
      (e) => alive && setState({ status: "error", data: null, error: e instanceof Error ? e.message : String(e) }),
    );
    return () => { alive = false; };
  }, [run, enabled, tick]);
  return { ...state, reload: () => setTick((t) => t + 1), set: (data: T) => setState({ status: "ok", data, error: null }) };
}

export const errorText = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback);
