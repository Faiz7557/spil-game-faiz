import { requireUser } from "../../server/auth.js";
import { json, route } from "../../server/http.js";
import { loadPublishedSnapshot } from "../../server/repo/snapshot.js";

export const GET = route(async (req) => {
  await requireUser(req, "read");
  return json(await loadPublishedSnapshot(), 200, { "cache-control": "private, max-age=60" });
});
