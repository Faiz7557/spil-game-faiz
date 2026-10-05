import { json } from "../server/http.js";
import { ROUTES } from "../server/routes/index.js";

// vercel.json rewrites /api/<path> to /api/router?__route=<path>.
async function dispatch(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const name = (url.searchParams.get("__route") ?? "").replace(/^\/+|\/+$/g, "");
  const mod = ROUTES[name];
  if (!mod) return json({ error: "No such route." }, 404);
  const handler = mod[req.method as "GET" | "POST"];
  if (!handler) return json({ error: "Method not allowed." }, 405);
  return handler(req);
}

export const GET = dispatch;
export const POST = dispatch;
