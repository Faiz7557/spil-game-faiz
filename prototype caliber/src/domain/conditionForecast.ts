// prototype/src/domain/conditionForecast.ts
import raw from "../data/condition_forecast.json";

export interface Window { earliest: number | null; likely: number | null; latest: number | null }
export interface ParamForecast {
  name: string; unit: string; direction: "high" | "low"; alarm: number; trip: number;
  q10: number[]; q50: number[]; q90: number[]; alarm_window: Window; trip_window: Window;
  linear_trip_offset: number | null; actual_trip_offset: number | null;
}
export interface ConditionForecast {
  model: string | null; generated_at?: string;
  weekly: Record<string, { cutoff_index: number; cutoff_date: string; params: ParamForecast[] }>;
  backtest: { cases: number; coverage: number; mae_likely: number | null; missed_likely: number; linear_mae: number | null; linear_missed: number } | null;
  energy: Record<string, { p10: number[]; p50: number[]; p90: number[]; wape_pct: number; naive_wape_pct: Record<string, number> }>;
}
export const FORECAST = raw as unknown as ConditionForecast;

export const windowText = (w: Window) =>
  w.earliest === null ? "not within 8 weeks" : `${w.earliest}–${w.latest ?? ">8"} weeks (most likely ${w.likely ?? ">8"})`;
