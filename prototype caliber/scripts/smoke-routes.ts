// Calls every API route without credentials and prints the status. Every route must refuse (401) or reject
// input (400) before touching the database or the model.   npx tsx scripts/smoke-routes.ts
import { pathToFileURL } from "node:url";

const routes = ["snapshot", "copilot", "audit/rca", "actions/index", "actions/transition", "evidence/add", "evidence/remove", "evidence/upload-url",
  "evidence/check", "rca/draft", "rca/review", "ingest/index", "ingest/publish", "ingest/upload-url", "export/sap-pm", "admin/ai-quality",
  "anomaly/explain", "conflicts/decide", "diagnosis/run"];

let bad = 0;
for (const r of routes) {
  const m = await import(pathToFileURL(`server/routes/${r}.ts`).href);
  for (const verb of ["GET", "POST"] as const) {
    if (!m[verb]) continue;
    const res: Response = await m[verb](new Request(`http://localhost/api/${r}`, { method: verb, body: verb === "POST" ? "{}" : undefined }));
    if (res.status !== 401) bad++;
    console.log(verb.padEnd(4), r.padEnd(20), res.status, (await res.text()).slice(0, 70));
  }
}
console.log(bad ? `${bad} route(s) did not answer 401 without a token` : "every route refuses an unauthenticated call");
process.exit(bad ? 1 : 0);
