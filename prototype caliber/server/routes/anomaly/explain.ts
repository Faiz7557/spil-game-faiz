import { z } from "zod";
import { requireUser } from "../../../server/auth.js";
import { db, publishedSnapshotId } from "../../../server/db.js";
import { HttpError, json, route } from "../../../server/http.js";
import { explainAnomaly } from "../../../server/ai/anomalyExplain.js";
import { assertBudget, logAiRun } from "../../../server/ai/runLog.js";

const Body = z.object({ eventId: z.string().uuid() });

export const POST = route(async (req) => {
  const user = await requireUser(req, "ai.run");
  const { eventId } = Body.parse(await req.json());
  const { data: ev } = await db().from("anomaly_events").select("*").eq("id", eventId).maybeSingle();
  if (!ev || ev.snapshot_id !== (await publishedSnapshotId())) throw new HttpError(404, "Anomaly event not found.");
  if (ev.explanation) return json(ev.explanation); // explanations are cached on the event
  const reservation = await assertBudget(user, "anomaly_explain", ev.id);
  const [{ data: h }, { data: eq }] = await Promise.all([
    db().from("hourly_series").select("doc").eq("snapshot_id", ev.snapshot_id).eq("tag_prefix", ev.tag).maybeSingle(),
    db().from("equipment").select("doc").eq("snapshot_id", ev.snapshot_id).eq("tag", ev.tag.replace(/^([A-Z]{2})(\d)/, "$1-$2")).maybeSingle(),
  ]);
  const units = Object.fromEntries((h?.doc.pi_tags ?? []).map((t: { name: string; unit: string }) => [t.name, t.unit]));
  const started = Date.now();
  const { explanation, usage, model } = await explainAnomaly({ tag: ev.tag, equipment: eq?.doc.name ?? ev.tag, start_at: ev.start_at, end_at: ev.end_at, contributors: ev.contributors, units });
  await logAiRun({ reservation, model, feature: "anomaly_explain", ref: ev.id, userId: user.id, usage, startedAt: started, stopReason: "end_turn", validation: { causes: explanation.possible_causes.length } });
  if (!user.isDemo) await db().from("anomaly_events").update({ explanation }).eq("id", ev.id);
  return json(explanation);
});
