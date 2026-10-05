// Copilot on the reference tasks (design §10.6) as live questions, with the Evidence Guard.
//   npm run eval:copilot
// A FAIL is fixed by improving the tools or the system prompt, never by editing these patterns after seeing an answer.
import { runCopilot } from "../server/ai/copilot.js";
import { evidenceGuard } from "../server/ai/evidenceGuard.js";
import { addUsage, estimateCostUsd } from "../server/ai/runLog.js";
import { MODELS } from "../server/ai/client.js";
import { requireKey, saveRun, snap } from "./lib.js";

const CASES: { id: string; q: string; must: RegExp[]; mustNot: RegExp[] }[] = [
  { id: "G01", q: "Is the US$67.19M in the register all actual loss?", must: [/61[.,]8|61,886,460/, /5[.,]3|5,307,970/], mustNot: [/all actual/i] },
  { id: "G03", q: "Is everything on KO-3201 finished because the cooler repair is closed?", must: [/in progress/i, /open/i], mustNot: [/all (actions|follow-up).*(complete|closed)/i] },
  { id: "G04", q: "Is the KO-3201 cooler retube overdue?", must: [/31 Oct|2026-10-31/], mustNot: [/\bis overdue\b/i] },
  { id: "G05", q: "Can I overlay the weekly and hourly KO-3201 vibration?", must: [/micron/i, /mm\/s/i], mustNot: [/yes, you can overlay/i] },
  { id: "G09", q: "How many incidents are recorded for plant ZCU and what is their recorded actual loss?", must: [/62/], mustNot: [/380 incidents for ZCU/i] },
  { id: "SAV", q: "How much money did PlantPulse save?", must: [], mustNot: [/saved US\$|saving of US\$/i] },
];

async function main() {
  requireKey();
  const rows: any[] = [];
  for (const c of CASES) {
    const out = await runCopilot({ question: c.q, snap, onEvent: () => {} });
    const guard = await evidenceGuard(out.answer, out.ledger);
    const text = out.answer.sentences.map((s) => s.text).join(" ") + " " + out.answer.abstentions.join(" ");
    const pass = c.must.every((r) => r.test(text)) && !c.mustNot.some((r) => r.test(text));
    const count = (s: string) => guard.results.filter((g) => g.status === s).length;
    const usage = guard.usage ? addUsage(out.usage, guard.usage) : out.usage;
    rows.push({ id: c.id, q: c.q, pass, sentences: out.answer.sentences.length, supported: count("supported"), partial: count("partial"),
      unsupported: count("unsupported"), turns: out.turns, cost_usd: estimateCostUsd(usage), answer: out.answer, guard: guard.results });
    console.log(c.id, pass ? "PASS" : "FAIL", `supported=${count("supported")} unsupported=${count("unsupported")}`);
  }
  const passed = rows.filter((r) => r.pass).length;
  console.log(`${passed} of ${rows.length} passed`);
  console.log("saved to", saveRun("copilot_g_tasks", { model: MODELS.main, label: "internal", passed, of: rows.length, rows }));
}
main().catch((e) => { console.error(e); process.exit(1); });
