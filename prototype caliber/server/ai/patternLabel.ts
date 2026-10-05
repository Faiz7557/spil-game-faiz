import { z } from "zod";
import { parseStructured } from "./client.js";

export const Label = z.object({
  name: z.string().describe("Short family name, e.g. 'Pump mechanical seal leakage'"),
  shared_mechanism_hypothesis: z.string().describe("What may link these records; a hypothesis, not a finding"),
  evidence_needed: z.array(z.string()),
  fleet_action: z.string().describe("One proactive action across the plants involved"),
  coherence: z.enum(["coherent", "mixed", "incoherent"]).describe("Whether the members really belong together"),
});
export type PatternLabel = z.infer<typeof Label>;

export async function labelCluster(members: { id: string; plant: string; title: string; eq_type: string; component: string; mechanism: string }[]) {
  const out = await parseStructured({
    schema: Label, name: "failure_family", tier: "light", effort: "low", maxTokens: 4000, what: "cluster label",
    system: "You name a cluster of equipment incident records for a reliability team. Base everything on the records listed. If they do not belong together, say so with coherence 'incoherent'.",
    content: members.slice(0, 40).map((m) => `${m.id} · ${m.plant} · ${m.eq_type}/${m.component} · ${m.mechanism} · ${m.title}`).join("\n"),
  });
  return { label: out.data, usage: out.usage, model: out.model };
}
