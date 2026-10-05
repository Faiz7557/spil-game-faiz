import { z } from "zod";
import { requireUser } from "../../../server/auth.js";
import { db } from "../../../server/db.js";
import { HttpError, json, route } from "../../../server/http.js";
import { loadAction } from "../../../server/repo/actions.js";

const Body = z.object({ actionId: z.string().uuid(), fileName: z.string().min(1).max(200), contentType: z.enum(["application/pdf", "image/png", "image/jpeg", "image/webp"]) });

export const POST = route(async (req) => {
  const user = await requireUser(req, "action.write");
  const b = Body.parse(await req.json());
  const { action } = await loadAction(b.actionId, user); // caller must be allowed to see and change this action
  if (!["execution_reported", "evidence_submitted"].includes(action.state)) throw new HttpError(409, "Evidence can be added after execution is reported.");
  const path = `${b.actionId}/${crypto.randomUUID()}-${b.fileName.replace(/[^\w.-]/g, "_")}`;
  const { data, error } = await db().storage.from("evidence").createSignedUploadUrl(path);
  if (error) throw error;
  return json({ path, token: data.token });
});
