// Names every unlabelled failure family of the published snapshot with the light model.
//   npx tsx --env-file=.env scripts/label-patterns.ts
import { db } from "../server/db.js";
import { labelCluster } from "../server/ai/patternLabel.js";
import { logAiRun } from "../server/ai/runLog.js";

async function main() {
  const { data: snap } = await db().from("snapshots").select("id").eq("status", "published").single();
  if (!snap) throw new Error("No published snapshot.");
  const { data: fps } = await db().from("failure_patterns").select("*").eq("snapshot_id", snap.id).is("label", null);
  const { data: inc } = await db().from("incidents").select("id,plant,title,eq_type,component,mechanism").eq("snapshot_id", snap.id);
  if (!fps?.length) { console.log("No unlabelled families. Run `python -m analytics.patterns` first if the table is empty."); return; }
  for (const fp of fps) {
    const started = Date.now();
    const { label, usage, model } = await labelCluster((inc ?? []).filter((i) => fp.member_ids.includes(i.id)));
    await db().from("failure_patterns").update({ label }).eq("id", fp.id);
    await logAiRun({ model, feature: "pattern_label", ref: fp.cluster_key, usage, startedAt: started, stopReason: "end_turn", validation: { coherence: label.coherence } });
    console.log(fp.cluster_key, label.name, label.coherence);
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
