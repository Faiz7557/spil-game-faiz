import { z } from "zod";
import { requireUser } from "../../../server/auth.js";
import { db } from "../../../server/db.js";
import { HttpError, json, route } from "../../../server/http.js";
import { appendEvent } from "../../../server/repo/actions.js";
import { publishSnapshot } from "../../../server/repo/writeSnapshot.js";

const Body = z.object({ snapshotId: z.string().uuid(), reason: z.string().trim().min(5).max(1000) });

export const POST = route(async (req) => {
  const user = await requireUser(req, "ingest");
  const b = Body.parse(await req.json());
  const { data: s } = await db().from("snapshots").select("id, status, validation").eq("id", b.snapshotId).maybeSingle();
  if (!s || s.status !== "staging") throw new HttpError(409, "Only a staging snapshot can be published.");
  if ((s.validation?.blocking ?? []).length) throw new HttpError(422, "Blocking quality gates failed. Fix the source files and ingest again.");
  await publishSnapshot(s.id);
  await appendEvent({ actor: user.id, type: "snapshot", subject: s.id, from: "staging", to: "published", decision: "Published snapshot", reason: b.reason });
  return json({ ok: true });
});
