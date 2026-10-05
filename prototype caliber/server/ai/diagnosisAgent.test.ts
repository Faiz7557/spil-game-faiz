// prototype/server/ai/diagnosisAgent.test.ts
import { afterEach, describe, expect, it } from "vitest";
import type OpenAI from "openai";
import type { Snapshot } from "../../src/domain/types.js";
import { setOpenAIForTests } from "./client.js";
import { runDiagnosis } from "./diagnosisAgent.js";
import { toGuardSentences, type DiagnosisBriefT } from "../../src/domain/diagnosisBrief.js";
import snapJson from "../../src/data/case2.json";

const snap = snapJson as unknown as Snapshot;
const BRIEF: DiagnosisBriefT = {
  hypotheses: [
    { mode_id: "CO-1", title: "Water contamination", standing: "plausible", for: [{ text: "Vibration is above its baseline band.", refs: ["PP:diag:KO-3201:w8"] }], against: [] },
    { mode_id: "ZZ-9", title: "Invented", standing: "unlikely", for: [], against: [] },
  ],
  next_check: { test: "Sample lube oil for water.", separates: ["CO-1", "CO-4", "CO-5"], if_positive: "Ingress likely.", if_negative: "Look at alignment.", refs: ["FM:CO-1"] },
  abstentions: ["No oil sample result is available."],
};
function fakeClient(parsed: unknown) {
  return { responses: { parse: async () => ({ output: [], status: "completed", output_parsed: parsed, usage: { input_tokens: 100, output_tokens: 20, input_tokens_details: { cached_tokens: 0 } } }) } } as unknown as OpenAI;
}

describe("runDiagnosis", () => {
  afterEach(() => setOpenAIForTests(null as unknown as OpenAI));
  it("returns the brief, flags mode ids outside the library and keeps the masked context", async () => {
    setOpenAIForTests(fakeClient(BRIEF));
    const out = await runDiagnosis({ snap, tag: "KO-3201", week: 7 });
    expect(out.brief.hypotheses[0].mode_id).toBe("CO-1");
    expect(out.invalidModeIds).toEqual(["ZZ-9"]);
    expect(out.differential.leading).toEqual(["CO-1", "CO-4", "CO-5"]);
    expect(out.ledger.resolve("FM:CO-1")).toMatch(/Karl Fischer/);
  });
  it("orders guard sentences for-then-against per hypothesis, then the check", () => {
    const s = toGuardSentences(BRIEF);
    expect(s.map((x) => x.kind)).toEqual(["fact", "recommendation"]);
  });
});
