import { requireUser } from "../../server/auth.js";
import { env } from "../../server/env.js";
import { json, route } from "../../server/http.js";

/** Who the caller is, and whether the deployment runs without sign-in. */
export const GET = route(async (req) => {
  const user = await requireUser(req, "read");
  return json({ role: user.role, is_demo: user.isDemo, display_name: user.displayName, auth_mode: env().AUTH_MODE });
});
