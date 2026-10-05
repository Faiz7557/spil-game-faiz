import { z } from "zod";
import { requireUser } from "../../server/auth.js";
import { db, publishedSnapshotId } from "../../server/db.js";
import { json, route } from "../../server/http.js";

// Read-only views of the published snapshot that the browser used to query directly. Going through the API keeps
// RLS closed to anonymous browsers and works the same with or without sign-in.
const Query = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("patterns") }),
  z.object({ kind: z.literal("anomalies"), tag: z.string().regex(/^[A-Z0-9]{4,12}$/) }),
  z.object({ kind: z.literal("conflicts"), tag: z.string().regex(/^[A-Z]{2}-\d{4}[A-Z]?$/) }),
]);

export const GET = route(async (req) => {
  await requireUser(req, "read");
  const q = Query.parse(Object.fromEntries(new URL(req.url).searchParams));
  const sid = await publishedSnapshotId();
  const res =
    q.kind === "patterns"
      ? await db().from("failure_patterns").select("cluster_key, member_ids, plants, actual_usd, open_count, top_terms, label").eq("snapshot_id", sid).order("cluster_key")
      : q.kind === "anomalies"
        ? await db().from("anomaly_events").select("id, start_at, end_at, lead_hours, peak_score, contributors").eq("snapshot_id", sid).eq("tag", q.tag).order("start_at")
        : await db().from("conflicts").select("id, code, topic, severity, a, b, note, origin, state, owner_role").eq("snapshot_id", sid).eq("case_tag", q.tag).order("code");
  if (res.error) throw res.error;
  return json(res.data ?? [], 200, { "cache-control": "private, max-age=30" });
});
