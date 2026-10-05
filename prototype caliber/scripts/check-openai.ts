// Checks that OPENAI_API_KEY works and that the configured models return schema-valid structured output.
//   npx tsx --env-file=.env scripts/check-openai.ts        (costs well under US$0.01)
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import { MODELS } from "../server/ai/client.js";

const Out = z.object({ answer: z.string(), confidence: z.enum(["low", "medium", "high"]) });

async function main() {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not set.");
  const client = new OpenAI();
  for (const model of [...new Set(Object.values(MODELS))]) {
    const t = Date.now();
    const res = await client.responses.parse({
      model, reasoning: { effort: "low" }, max_output_tokens: 2000,
      instructions: "Answer in one short sentence.",
      input: "A pump trips on high vibration two days after a bearing temperature rise. Name one check to do first.",
      text: { format: zodTextFormat(Out, "check") },
    });
    console.log(`${model.padEnd(14)} ${res.status} ${Date.now() - t} ms · in ${res.usage?.input_tokens} out ${res.usage?.output_tokens} · ${JSON.stringify(res.output_parsed)}`);
  }
}
main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
