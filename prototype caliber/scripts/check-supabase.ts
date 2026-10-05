// Reports how far the Supabase setup has got: migrations, storage buckets, published snapshot, demo account.
//   npm run check:db
import { db } from "../server/db.js";
import { OPEN_DEMO_EMAIL } from "../server/env.js";

const ok = (b: boolean) => (b ? "ok     " : "MISSING");

async function main() {
  const tables = ["profiles", "snapshots", "incidents", "actions", "review_events", "ai_runs", "rca_drafts", "failure_patterns", "anomaly_events"];
  for (const t of tables) {
    const { error } = await db().from(t).select("*", { count: "exact", head: true });
    console.log(ok(!error), `table ${t}`, error ? `(${error.message})` : "");
  }
  const { error: e5 } = await db().from("rca_drafts").select("is_demo, created_by").limit(1);
  console.log(ok(!e5), "migration 0005_hardening (rca_drafts.is_demo)");
  const { data: buckets } = await db().storage.listBuckets();
  for (const b of ["evidence", "sources"]) console.log(ok(!!buckets?.some((x) => x.id === b)), `storage bucket ${b} (migration 0004)`);
  const { data: snap } = await db().from("snapshots").select("id, label").eq("status", "published").maybeSingle();
  console.log(ok(!!snap), "published snapshot", snap ? snap.id : "(run npm run seed)");
  if (snap) {
    const { count } = await db().from("incidents").select("id", { count: "exact", head: true }).eq("snapshot_id", snap.id);
    console.log(ok(count === 380), `incidents in snapshot: ${count}`);
    for (const t of ["failure_patterns", "anomaly_events"]) {
      const { count: n } = await db().from(t).select("id", { count: "exact", head: true }).eq("snapshot_id", snap.id);
      console.log(ok(!!n), `${t}: ${n ?? 0}${n ? "" : " (run the analytics jobs)"}`);
    }
  }
  const { data: demo } = await db().from("profiles").select("role, is_demo").eq("display_name", OPEN_DEMO_EMAIL).maybeSingle();
  console.log(ok(!!demo), "open-mode demo account", demo ? `${demo.role}, sandbox=${demo.is_demo}` : "(run npm run seed)");
  const { data: chain } = await db().rpc("verify_review_chain");
  console.log(ok(chain === null), "review log hash chain intact", chain === null ? "" : `(first broken id ${chain})`);
}
main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
