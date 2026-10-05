// Loads the snapshot the Python pipeline validated (23/23 checks), publishes it, and creates the shared demo
// account used when AUTH_MODE=open. Safe to re-run: an existing published snapshot is kept unless --force.
//   npm run seed            (reads SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env)
//   npm run seed -- --force (publish a fresh copy; the old one is archived)
import { readFileSync } from "node:fs";
import type { EvidenceMap, Snapshot } from "../../src/domain/types.js";
import { db } from "../../server/db.js";
import { OPEN_DEMO_EMAIL } from "../../server/env.js";
import { publishSnapshot, writeSnapshot } from "../../server/repo/writeSnapshot.js";

const snap = JSON.parse(readFileSync("src/data/case2.json", "utf8")) as Snapshot;
const emap = JSON.parse(readFileSync("src/data/evidence_map.json", "utf8")) as EvidenceMap;

async function must(p: PromiseLike<{ error: unknown }>, what: string) {
  const { error } = await p;
  if (error) throw new Error(`${what}: ${JSON.stringify(error)}`);
}

/** The open-mode account: created with the admin API (no email, no sign-in quota), sandboxed as a demo reviewer. */
async function ensureOpenDemoUser() {
  let { data: p } = await db().from("profiles").select("id").eq("display_name", OPEN_DEMO_EMAIL).maybeSingle();
  if (!p) {
    const { data, error } = await db().auth.admin.createUser({ email: OPEN_DEMO_EMAIL, email_confirm: true, user_metadata: { purpose: "open demo" } });
    if (error) throw new Error(`create demo user: ${error.message}`);
    p = { id: data.user.id };
  }
  await must(db().from("profiles").update({ role: "reviewer", is_demo: true }).eq("id", p.id), "demo profile");
  console.log(`Open-mode demo account ready (${OPEN_DEMO_EMAIL}).`);
}

/** A seed that failed half-way leaves an empty staging snapshot; remove those so they do not pile up. */
async function removeEmptyStaging() {
  const { data } = await db().from("snapshots").select("id").eq("status", "staging");
  for (const s of data ?? []) {
    const { count } = await db().from("incidents").select("id", { count: "exact", head: true }).eq("snapshot_id", s.id);
    if (!count) await must(db().from("snapshots").delete().eq("id", s.id), "remove empty staging snapshot");
  }
}

async function main() {
  await removeEmptyStaging();
  const { data: current } = await db().from("snapshots").select("id").eq("status", "published").maybeSingle();
  if (current && !process.argv.includes("--force")) {
    console.log(`A snapshot is already published (${current.id}); keeping it. Use --force to publish a fresh copy.`);
  } else {
    const sid = await writeSnapshot(snap, { label: snap.meta.snapshot, status: "staging", validation: { source: "pipeline/validate_case2.py", passed: "23/23" } });
    await must(db().from("evidence").insert(emap.evidence.map((e) => ({
      snapshot_id: sid, id: e.id, case_tag: emap.case, type: e.type, source_id: e.source, loc: e.loc,
      title: e.title, excerpt: e.excerpt, observed_at: e.timestamp,
    }))), "evidence");
    await must(db().from("conflicts").insert(emap.conflicts.map((c) => ({
      snapshot_id: sid, case_tag: emap.case, code: c.id, topic: c.topic, severity: c.severity, a: c.a, b: c.b,
      note: c.note, origin: "curated", state: c.state, owner_role: c.owner_role,
    }))), "conflicts");
    await publishSnapshot(sid);
    console.log(`Published snapshot ${sid}: ${snap.incidents.length} incidents, ${snap.equipment.length} assets.`);
  }
  await ensureOpenDemoUser();
}
main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
