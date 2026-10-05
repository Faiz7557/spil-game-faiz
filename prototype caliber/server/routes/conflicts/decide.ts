import { z } from "zod";
import { requireUser } from "../../../server/auth.js";
import { db, publishedSnapshotId } from "../../../server/db.js";
import { HttpError, json, route } from "../../../server/http.js";
import { appendEvent } from "../../../server/repo/actions.js";

const Body = z.object({ conflictId: z.string().uuid(), state: z.enum(["resolved", "unresolved"]), authority: z.string().max(300).default(""), reason: z.string().min(3).max(2000) });

export const POST = route(async (req) => {
  const user = await requireUser(req, "conflict.decide");
  const b = Body.parse(await req.json());
  if (b.state === "resolved" && !b.authority.trim()) throw new HttpError(400, "Name the authoritative source and version.");
  const { data: c } = await db().from("conflicts").select("id, code, topic, snapshot_id").eq("id", b.conflictId).maybeSingle();
  if (!c || c.snapshot_id !== (await publishedSnapshotId())) throw new HttpError(404, "Conflict not found.");
  // Guest decisions are logged but never change the shared conflict state.
  if (!user.isDemo) await db().from("conflicts").update({ state: b.state }).eq("id", c.id);
  await appendEvent({ actor: user.id, type: user.isDemo ? "conflict_demo" : "conflict", subject: c.id, to: b.state,
    decision: b.state === "resolved" ? `Resolved — authoritative: ${b.authority}` : "Kept unresolved", reason: b.reason });
  return json({ ok: true });
});
