import { db } from "../db.js";
import { env } from "../env.js";
import { HttpError } from "../http.js";
import type { AppUser } from "../auth.js";
import { MODELS } from "./client.js";

export interface Usage { input_tokens: number; output_tokens: number; cache_read_input_tokens?: number | null; cache_creation_input_tokens?: number | null }
// OpenAI standard-tier list prices, US$ per million tokens: [input, cached input, output]. Checked 2 Oct 2026.
const PRICES: Record<string, [number, number, number]> = {
  "gpt-6.1-sol": [2, 0.1, 10], "gpt-6-sol": [2, 0.2, 10], "gpt-6-luna": [0.1, 0.01, 0.5], "gpt-6-astra": [10, 1, 50],
  "gpt-5.6-sol": [4, 0.4, 20], "gpt-5.6-terra": [2, 0.2, 12], "gpt-5.6-luna": [0.2, 0.02, 1.2],
  "gpt-5.5": [5, 0.5, 30], "gpt-5.4": [2.5, 0.25, 15], "gpt-5.4-mini": [0.75, 0.075, 4.5], "gpt-5.4-nano": [0.2, 0.02, 1.25], "gpt-5-mini": [0.25, 0.025, 2],
};

/** Unknown models are priced like the main model, so a new model is never logged as free. */
export function estimateCostUsd(u: Usage, model: string = MODELS.main): number {
  const [inp, cached, out] = PRICES[model] ?? PRICES[MODELS.main] ?? [2, 0.1, 10];
  return (u.input_tokens * inp + (u.cache_read_input_tokens ?? 0) * cached + u.output_tokens * out) / 1e6;
}

/** Sum usage across the requests of one feature run (agent loops make several). */
export function addUsage(a: Usage, b: Usage): Usage {
  return {
    input_tokens: a.input_tokens + b.input_tokens, output_tokens: a.output_tokens + b.output_tokens,
    cache_read_input_tokens: (a.cache_read_input_tokens ?? 0) + (b.cache_read_input_tokens ?? 0),
    cache_creation_input_tokens: (a.cache_creation_input_tokens ?? 0) + (b.cache_creation_input_tokens ?? 0),
  };
}
export const ZERO: Usage = { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 };

const HOURLY_LIMIT = { member: 30, guest: 10, open: 60 };
/** Share of the daily budget all guests together may spend, so anonymous sign-ins cannot starve the team. */
export const GUEST_SHARE = 0.25;
/** Held against the budget while a call runs, so parallel requests cannot all slip past the check. */
const RESERVE_USD: Record<string, number> = { copilot: 0.15, rca_auditor: 0.1, evidence_reader: 0.05, rca_draft: 0.03, anomaly_explain: 0.01, diagnosis: 0.08 };

/**
 * Checks the caps and reserves the run before the model is called. Returns the reservation id, which
 * logAiRun later fills with the real usage. A failed call keeps its reservation: spend is over-counted, never under.
 */
export async function assertBudget(user: AppUser, feature: string, ref?: string): Promise<string> {
  const since = new Date(Date.now() - 86_400_000).toISOString();
  const { data, error } = await db().from("ai_runs").select("cost_usd, is_demo").gte("created_at", since);
  if (error) throw new HttpError(503, "Could not check the AI budget. Try again shortly.");
  const spent = (data ?? []).reduce((s, r) => s + Number(r.cost_usd), 0);
  const guestSpent = (data ?? []).filter((r) => r.is_demo).reduce((s, r) => s + Number(r.cost_usd), 0);
  const budget = env().AI_DAILY_BUDGET_USD;
  if (spent >= budget) throw new HttpError(429, "Daily AI budget reached. Try again tomorrow.");
  const open = env().AUTH_MODE === "open";
  if (user.isDemo && !open && guestSpent >= budget * GUEST_SHARE) throw new HttpError(429, "The guest AI allowance for today is used up. Try again tomorrow.");
  const hour = new Date(Date.now() - 3_600_000).toISOString();
  const { count } = await db().from("ai_runs").select("id", { count: "exact", head: true }).eq("user_id", user.id).gte("created_at", hour);
  if ((count ?? 0) >= (open ? HOURLY_LIMIT.open : user.isDemo ? HOURLY_LIMIT.guest : HOURLY_LIMIT.member))
    throw new HttpError(429, "Too many AI requests. Wait a few minutes.");
  const { data: row, error: e2 } = await db().from("ai_runs").insert({
    feature, model: MODELS.main, ref: ref ?? null, user_id: user.id, is_demo: user.isDemo, cost_usd: RESERVE_USD[feature] ?? 0.2, stop_reason: "in_flight",
  }).select("id").single();
  if (e2 || !row) throw new HttpError(503, "Could not reserve the AI run. Try again shortly.");
  return row.id as string;
}

/** Records the real usage. With a reservation it updates that row; scripts without one insert a new row. */
export async function logAiRun(r: { reservation?: string; model?: string; feature: string; ref?: string; userId?: string | null; usage: Usage; startedAt: number; stopReason: string | null; validation: unknown }) {
  const row = {
    feature: r.feature, model: r.model ?? MODELS.main, ref: r.ref ?? null, user_id: r.userId ?? null,
    input_tokens: r.usage.input_tokens, output_tokens: r.usage.output_tokens, cache_read_tokens: r.usage.cache_read_input_tokens ?? 0,
    cost_usd: estimateCostUsd(r.usage, r.model).toFixed(4), latency_ms: Date.now() - r.startedAt, stop_reason: r.stopReason, validation: r.validation,
  };
  const q = r.reservation ? db().from("ai_runs").update(row).eq("id", r.reservation) : db().from("ai_runs").insert(row);
  const { data, error } = await q.select("id").single();
  if (error) console.error("ai_runs write failed", error);
  return (data?.id as string | undefined) ?? r.reservation;
}
