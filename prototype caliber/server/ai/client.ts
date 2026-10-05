import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import type { z } from "zod";
import { env } from "../env.js";
import { AiOutputError, HttpError } from "../http.js";
import type { Usage } from "./runLog.js";

export { AiOutputError } from "../http.js";

/**
 * Two tiers. `main` does the reasoning-heavy work (RCA claim extraction, copilot, evidence reading, guard judge,
 * RCA drafts); `light` does short, low-stakes text (failure-family names, anomaly explanations).
 * Override per deployment with OPENAI_MODEL / OPENAI_MODEL_LIGHT.
 */
export const MODELS = {
  main: process.env.OPENAI_MODEL || "gpt-6.1-sol",
  light: process.env.OPENAI_MODEL_LIGHT || "gpt-6-luna",
} as const;
export type Tier = keyof typeof MODELS;
export type Effort = "none" | "low" | "medium" | "high";

let client: OpenAI | null = null;
export function openai(): OpenAI {
  if (client) return client;
  const key = env().OPENAI_API_KEY;
  if (!key) throw new HttpError(503, "AI features are not configured on this deployment (OPENAI_API_KEY is missing).");
  return (client = new OpenAI({ apiKey: key, maxRetries: 3, timeout: 240_000 }));
}
export function setOpenAIForTests(c: OpenAI) { client = c; }

/** OpenAI reports cached tokens inside input_tokens; split them so cost is priced correctly. */
export function toUsage(u: OpenAI.Responses.ResponseUsage | undefined | null): Usage {
  const cached = u?.input_tokens_details?.cached_tokens ?? 0;
  return { input_tokens: (u?.input_tokens ?? 0) - cached, output_tokens: u?.output_tokens ?? 0, cache_read_input_tokens: cached };
}

export type InputContent = OpenAI.Responses.ResponseInputContent[];

/**
 * One structured-output call: the response is validated against `schema` and returned typed.
 * Refusals, truncation and unparseable output become AiOutputError (shown to the user as a 502), never a guess.
 */
export async function parseStructured<S extends z.ZodType>(p: {
  schema: S; name: string; system: string; content: string | InputContent; effort: Effort;
  tier?: Tier; maxTokens?: number; what: string;
}): Promise<{ data: z.infer<S>; usage: Usage; stopReason: string | null; model: string }> {
  const model = MODELS[p.tier ?? "main"];
  const res = await openai().responses.parse({
    model, instructions: p.system, max_output_tokens: p.maxTokens ?? 16000,
    reasoning: { effort: p.effort },
    input: typeof p.content === "string" ? p.content : [{ role: "user", content: p.content }],
    text: { format: zodTextFormat(p.schema, p.name) },
  });
  const usage = toUsage(res.usage);
  const refused = res.output.some((o) => o.type === "message" && o.content.some((c) => c.type === "refusal"));
  if (refused) throw new AiOutputError(`The model declined to produce ${p.what}.`);
  if (res.status === "incomplete") throw new AiOutputError(`The ${p.what} was cut off before it finished (${res.incomplete_details?.reason ?? "incomplete"}).`);
  if (res.output_parsed == null) throw new AiOutputError(`The model returned no parseable ${p.what}.`);
  return { data: res.output_parsed as z.infer<S>, usage, stopReason: res.status ?? null, model };
}
