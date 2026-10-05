import { requireUser } from "../../../server/auth.js";
import { db } from "../../../server/db.js";
import { json, route } from "../../../server/http.js";

interface RunRow { feature: string; cost_usd: number | string; latency_ms: number; validation: any; stop_reason: string | null }

/** Aggregates of ai_runs over 30 days. Averages only, so every signed-in role may read them. */
export const GET = route(async (req) => {
  await requireUser(req, "read");
  const since = new Date(Date.now() - 30 * 86400000).toISOString();
  const { data, error } = await db().from("ai_runs").select("feature, cost_usd, latency_ms, validation, stop_reason").gte("created_at", since).limit(5000);
  if (error) throw error;
  const by = new Map<string, RunRow[]>();
  for (const r of (data ?? []) as RunRow[]) by.set(r.feature, [...(by.get(r.feature) ?? []), r]);
  const features = [...by].map(([feature, rs]) => {
    const guard = rs.map((r) => r.validation?.guard).filter(Boolean);
    const sum = (k: string) => guard.reduce((s, g) => s + (g[k] ?? 0), 0);
    const lat = rs.map((r) => r.latency_ms).sort((a, b) => a - b);
    return {
      feature, runs: rs.length,
      total_cost: rs.reduce((s, r) => s + Number(r.cost_usd), 0),
      avg_cost: rs.reduce((s, r) => s + Number(r.cost_usd), 0) / rs.length,
      p50_latency_ms: lat[Math.floor(lat.length / 2)],
      refusals: rs.filter((r) => r.stop_reason === "refusal").length,
      guard: guard.length ? { supported: sum("supported"), partial: sum("partial"), unsupported: sum("unsupported"), not_required: sum("not_required") } : null,
    };
  }).sort((a, b) => b.runs - a.runs);
  return json({ since, features });
});
