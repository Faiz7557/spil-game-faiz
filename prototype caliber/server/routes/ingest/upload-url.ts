import { z } from "zod";
import { requireUser } from "../../../server/auth.js";
import { db } from "../../../server/db.js";
import { json, route } from "../../../server/http.js";

const Body = z.object({ fileName: z.string().min(1).max(200).regex(/\.(xlsx|pptx)$/i) });

export const POST = route(async (req) => {
  const user = await requireUser(req, "ingest");
  const { fileName } = Body.parse(await req.json());
  const path = `${user.id}/${Date.now()}-${fileName.replace(/[^\w.() -]/g, "_")}`;
  const { data, error } = await db().storage.from("sources").createSignedUploadUrl(path);
  if (error) throw error;
  return json({ path, token: data.token });
});
