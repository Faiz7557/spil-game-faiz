import { describe, expect, it } from "vitest";
import { SNAP } from "../../src/domain/data.js";
import { runCopilot } from "./copilot.js";

function fakeClient(turns: any[]) {
  let i = 0;
  const seen: any[] = [];
  return { client: { responses: { create: async (body: any) => { seen.push(body); return turns[i++]; } } } as any, seen };
}
const usage = { input_tokens: 10, output_tokens: 5, input_tokens_details: { cached_tokens: 0 } };
const call = (id: string, name: string, args: unknown) => ({ type: "function_call", call_id: id, name, arguments: JSON.stringify(args) });

describe("runCopilot", () => {
  it("runs tools, then returns the submitted answer and the ledger", async () => {
    const { client, seen } = fakeClient([
      { id: "r1", status: "completed", usage, output: [call("c1", "get_case", { tag: "KO-3201" })] },
      { id: "r2", status: "completed", usage, output: [call("c2", "submit_answer", {
        sentences: [{ text: "The cooler tube repair is recorded Closed.", refs: ["R2:slide9"], kind: "fact" }], abstentions: [], follow_ups: [] })] },
    ]);
    const events: string[] = [];
    const out = await runCopilot({ question: "What is still open on KO-3201?", snap: SNAP, client, onEvent: (e) => events.push(e) });
    expect(out.answer.sentences[0].refs).toEqual(["R2:slide9"]);
    expect(out.ledger.resolve("R2:slide9")).toContain("Closed");
    expect(events).toContain("tool");
    // The second turn chains on the first and sends only the tool output.
    expect(seen[1].previous_response_id).toBe("r1");
    expect(seen[1].input[0]).toMatchObject({ type: "function_call_output", call_id: "c1" });
    expect(out.usage.input_tokens).toBe(20);
  });
  it("stops after the turn limit with a controlled error", async () => {
    const loop = Array.from({ length: 20 }, (_, k) => ({ id: `r${k}`, status: "completed", usage, output: [call(`c${k}`, "get_kpis", {})] }));
    await expect(runCopilot({ question: "x", snap: SNAP, client: fakeClient(loop).client, onEvent: () => {} })).rejects.toThrow(/did not finish/);
  });
  it("rejects a malformed submit_answer", async () => {
    const { client } = fakeClient([{ id: "r1", status: "completed", usage, output: [{ type: "function_call", call_id: "c", name: "submit_answer", arguments: "{not json" }] }]);
    await expect(runCopilot({ question: "x", snap: SNAP, client, onEvent: () => {} })).rejects.toThrow(/malformed/);
  });
});
