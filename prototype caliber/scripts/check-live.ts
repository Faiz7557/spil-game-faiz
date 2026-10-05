// End-to-end check of the real handlers against the configured Supabase and OpenAI, in open mode (no sign-in).
//   npm run check:live            (makes real model calls: a few US cents)
//   npm run check:live -- --no-ai (database routes only)
import { pathToFileURL } from "node:url";

process.env.AUTH_MODE = "open";
const noAi = process.argv.includes("--no-ai");
const route = async (path: string) => import(pathToFileURL(`server/routes/${path}.ts`).href);
const call = async (path: string, verb: "GET" | "POST", url: string, body?: unknown) => {
  const t = Date.now();
  const res: Response = await (await route(path))[verb](new Request(`http://localhost${url}`, { method: verb, body: body ? JSON.stringify(body) : undefined }));
  return { status: res.status, ms: Date.now() - t, res };
};
let failed = 0;
const check = (name: string, pass: boolean, detail: string) => { if (!pass) failed++; console.log(pass ? "PASS" : "FAIL", name.padEnd(34), detail); };

async function main() {
  const me = await call("me", "GET", "/api/me");
  const meBody = await me.res.json();
  check("open-mode identity", me.status === 200 && meBody.is_demo, JSON.stringify(meBody));

  const snap = await call("snapshot", "GET", "/api/snapshot");
  const s = await snap.res.json();
  const actual = (s.incidents ?? []).reduce((n: number, i: { actual_usd: number }) => n + i.actual_usd, 0);
  check("published snapshot", snap.status === 200 && s.incidents?.length === 380 && actual === 61_886_460, `${s.incidents?.length} incidents, actual US$${actual.toLocaleString("en-US")}, ${snap.ms} ms`);

  for (const [kind, q] of [["patterns", ""], ["anomalies", "&tag=KO3201"], ["conflicts", "&tag=KO-3201"]] as const) {
    const r = await call("live", "GET", `/api/live?kind=${kind}${q}`);
    const rows = await r.res.json();
    check(`live ${kind}`, r.status === 200 && rows.length > 0, `${rows.length} rows`);
  }

  const created = await call("actions/index", "POST", "/api/actions", { caseTag: "KO-3201", title: "Live check: verify sensor installation", sourceRefs: ["EV-11"], rationale: "check-live script" });
  const { id } = await created.res.json();
  check("create action (sandbox)", created.status === 201 && !!id, id ?? "");
  const skip = await call("actions/transition", "POST", "/api/actions/transition", { actionId: id, to: "verified", reason: "" });
  check("guard blocks skipping to verified", skip.status === 422, JSON.stringify(await skip.res.json()).slice(0, 90));

  if (noAi) return;

  const audit = await call("audit/rca", "POST", "/api/audit/rca", { tag: "KO-3201" });
  const a = await audit.res.json();
  const conflicts = (a.findings ?? []).filter((f: { verdict: string }) => f.verdict === "conflict");
  check("RCA auditor on KO-3201", audit.status === 200 && conflicts.length > 0, `${a.findings?.length} claims, ${conflicts.length} conflicts, ${a.dropped?.length} dropped, ${audit.ms} ms ${a.error ?? ""}`);

  const cp = await call("copilot", "POST", "/api/copilot", { question: "What is still open on KO-3201, and what should I verify first?", caseTag: "KO-3201" });
  const text = await cp.res.text();
  const events = [...text.matchAll(/^event: (\w+)$/gm)].map((m) => m[1]);
  const guard = /event: guard\ndata: (.*)/.exec(text)?.[1];
  const verdicts = guard ? (JSON.parse(guard) as { status: string }[]).map((g) => g.status) : [];
  const count = (v: string) => verdicts.filter((x) => x === v).length;
  check("copilot + Evidence Guard", events.includes("done") && verdicts.length > 0,
    `${events.filter((e) => e === "tool").length} tool calls · ${count("supported")} supported, ${count("partial")} partly, ${count("unsupported")} unsupported · ${cp.ms} ms ${events.includes("error") ? /event: error\ndata: (.*)/.exec(text)?.[1] : ""}`);

  const tank = s.incidents.find((i: { status: string; rca_due: string }) => i.status === "RCA PROCESS" && /^\d{4}/.test(i.rca_due) && i.rca_due < s.meta.review_date);
  const draft = await call("rca/draft", "POST", "/api/rca/draft", { incidentId: tank.id });
  const d = await draft.res.json();
  const allNotAssessed = (d.draft?.checklist ?? []).every((c: { status: string }) => c.status === "Not assessed");
  check("RCA backlog draft", draft.status === 200 && allNotAssessed, `${tank.id}: ${d.draft?.checklist?.length} checklist rows, ${d.draft?.similar?.length} comparable, ${draft.ms} ms ${d.error ?? ""}`);

  const q = await call("admin/ai-quality", "GET", "/api/admin/ai-quality");
  const qb = await q.res.json();
  check("AI quality log", q.status === 200 && qb.features.length > 0, qb.features.map((f: { feature: string; runs: number; avg_cost: number }) => `${f.feature} ${f.runs}× ~US$${f.avg_cost.toFixed(4)}`).join(" · "));
}
main().then(() => { console.log(failed ? `${failed} check(s) failed` : "all checks passed"); process.exit(failed ? 1 : 0); })
  .catch((e) => { console.error(e); process.exit(1); });
