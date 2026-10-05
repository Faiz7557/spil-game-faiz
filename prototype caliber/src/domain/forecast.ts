// Naive forecast baselines for the hourly motor current (port of extract_hourly in pipeline/extract_case2.py).
export const TRAIN_HOURS = 552;

const round = (v: number, d: number) => Math.round(v * 10 ** d) / 10 ** d;

export function baselines(x: number[], train = TRAIN_HOURS) {
  const ref = x.slice(0, train), actual = x.slice(train), n = actual.length;
  // numpy.resize repeats the array to the requested length.
  const resize = (a: number[]) => Array.from({ length: n }, (_, i) => a[i % a.length]);
  const predictions: Record<string, number[]> = {
    last_value: Array(n).fill(ref[ref.length - 1]), repeat_24h: resize(ref.slice(-24)), repeat_168h: resize(ref.slice(-168)),
  };
  const sumAbs = actual.reduce((s, v) => s + Math.abs(v), 0);
  const wape_pct: Record<string, number> = {}, mae_A: Record<string, number> = {};
  for (const [k, p] of Object.entries(predictions)) {
    const err = actual.reduce((s, v, i) => s + Math.abs(v - p[i]), 0);
    wape_pct[k] = round((100 * err) / sumAbs, 2); mae_A[k] = round(err / n, 3);
  }
  const sorted = [...ref].sort((a, b) => a - b);
  const mid = sorted.length / 2;
  const train_median_A = sorted.length % 2 ? sorted[(sorted.length - 1) / 2] : (sorted[mid - 1] + sorted[mid]) / 2;
  return { predictions: Object.fromEntries(Object.entries(predictions).map(([k, p]) => [k, p.map((v) => round(v, 3))])), wape_pct, mae_A, train_median_A };
}
