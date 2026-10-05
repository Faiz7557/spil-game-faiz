import { z } from "zod";
import { parseStructured } from "./client.js";

export const Explanation = z.object({
  what_changed: z.string(),
  possible_causes: z.array(z.object({ cause: z.string(), check: z.string() })),
  operations_note: z.string().describe("What to raise with operations; urgency is decided by the site procedure"),
});
export type AnomalyExplanation = z.infer<typeof Explanation>;

export async function explainAnomaly(e: { tag: string; equipment: string; start_at: string; end_at: string; contributors: { tag: string; z: number }[]; units: Record<string, string> }) {
  const out = await parseStructured({
    schema: Explanation, name: "anomaly_explanation", tier: "light", effort: "low", maxTokens: 4000, what: "anomaly explanation",
    system: "You explain an anomaly flag on plant sensor data to a reliability engineer. Use only the contributor z-scores and units given. Possible causes are hypotheses, each with a concrete check. Do not predict failure times.",
    content: `${e.equipment} (${e.tag}), abnormal from ${e.start_at} to ${e.end_at}.\nContributors (robust z-score against the reference week):\n${e.contributors.map((c) => `${c.tag} [${e.units[c.tag] ?? "unit unknown"}]: z=${c.z}`).join("\n")}`,
  });
  return { explanation: out.data, usage: out.usage, model: out.model };
}
