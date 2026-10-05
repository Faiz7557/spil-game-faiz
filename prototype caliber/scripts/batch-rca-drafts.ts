// Drafts an RCA starter for every open record past its RCA due date, through the OpenAI Batch API (50 % cost).
//   npx tsx --env-file=.env scripts/batch-rca-drafts.ts                  → submits, prints the batch id
//   npx tsx --env-file=.env scripts/batch-rca-drafts.ts --collect <id>   → stores the results once it has ended
import OpenAI, { toFile } from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import type { Incident } from "../src/domain/types.js";
import { db } from "../server/db.js";
import { MODELS } from "../server/ai/client.js";
import { DRAFT_SYSTEM, Draft, draftPrompt, sanitizeDraft, similarCandidates } from "../server/ai/rcaDraft.js";

const OPEN = ["NEW REGISTERED", "RCA PROCESS", "CA/PA EXECUTION", "MONITORING RESULT"];
const client = new OpenAI();

async function published() {
  const { data: snap, error } = await db().from("snapshots").select("id, review_date").eq("status", "published").single();
  if (error || !snap) throw new Error("No published snapshot. Run `npm run seed` first.");
  const { data: all } = await db().from("incidents").select("*").eq("snapshot_id", snap.id);
  return { snap, all: (all ?? []) as Incident[] };
}

async function submit() {
  const { snap, all } = await published();
  const { data: existing } = await db().from("rca_drafts").select("incident_id").eq("snapshot_id", snap.id).eq("is_demo", false);
  const done = new Set((existing ?? []).map((d) => d.incident_id));
  const targets = all.filter((i) => OPEN.includes(i.status) && i.rca_due && i.rca_due < snap.review_date && !done.has(i.id));
  if (!targets.length) { console.log("Nothing to draft: every eligible record already has a draft."); return; }
  const format = JSON.parse(JSON.stringify(zodTextFormat(Draft, "rca_draft"))); // plain JSON schema for the JSONL file
  const lines = targets.map((t) => JSON.stringify({
    custom_id: t.id, method: "POST", url: "/v1/responses",
    body: { model: MODELS.main, instructions: DRAFT_SYSTEM, input: draftPrompt(t, similarCandidates(t, all)),
      reasoning: { effort: "low" }, max_output_tokens: 8000, text: { format } },
  }));
  const file = await client.files.create({ file: await toFile(Buffer.from(lines.join("\n")), "rca-drafts.jsonl"), purpose: "batch" });
  const batch = await client.batches.create({ input_file_id: file.id, endpoint: "/v1/responses", completion_window: "24h" });
  console.log(`Batch ${batch.id} submitted for ${targets.length} records. When it ends, run with --collect ${batch.id}.`);
}

async function collect(id: string) {
  const b = await client.batches.retrieve(id);
  if (b.status !== "completed") { console.log(`Batch is ${b.status}:`, b.request_counts); return; }
  if (!b.output_file_id) { console.log("Batch completed without an output file."); return; }
  const { snap, all } = await published();
  const text = await (await client.files.content(b.output_file_id)).text();
  let ok = 0, failed = 0;
  // Results arrive in any order: key by custom_id, never by position.
  for (const line of text.split("\n").filter(Boolean)) {
    const r = JSON.parse(line);
    const body = r.response?.status_code === 200 ? r.response.body : null;
    const out = body?.output?.find((o: any) => o.type === "message")?.content?.find((c: any) => c.type === "output_text")?.text;
    let parsed: ReturnType<typeof Draft.safeParse> | null = null;
    try { parsed = out ? Draft.safeParse(JSON.parse(out)) : null; } catch { parsed = null; }
    const target = all.find((i) => i.id === r.custom_id);
    if (!parsed?.success || !target) { failed++; continue; }
    const offered = new Set(similarCandidates(target, all).map((s) => `L3:row${s.src.row}`));
    const { error } = await db().from("rca_drafts").insert({ snapshot_id: snap.id, incident_id: r.custom_id, draft: sanitizeDraft(parsed.data, offered) });
    if (error) failed++; else ok++;
  }
  console.log(`Stored ${ok} drafts, ${failed} failed.`);
}

const i = process.argv.indexOf("--collect");
(i > 0 ? collect(process.argv[i + 1]) : submit()).catch((e) => { console.error(e); process.exit(1); });
