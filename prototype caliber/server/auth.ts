import { db } from "./db.js";
import { authMode, OPEN_DEMO_EMAIL } from "./env.js";
import { HttpError } from "./http.js";

export type Role = "viewer" | "engineer" | "reviewer" | "manager" | "data_owner";
export interface AppUser { id: string; role: Role; isDemo: boolean; displayName: string }
export type Permission =
  | "read" | "copilot" | "action.write" | "action.verify" | "conflict.decide"
  | "ai.run" | "ingest" | "admin.ai";

const MATRIX: Record<Role, Permission[]> = {
  viewer: ["read", "copilot"],
  engineer: ["read", "copilot", "action.write", "conflict.decide", "ai.run"],
  reviewer: ["read", "copilot", "action.write", "action.verify", "conflict.decide", "ai.run"],
  manager: ["read", "copilot", "action.write", "action.verify", "ai.run", "admin.ai"],
  data_owner: ["read", "copilot", "conflict.decide", "ai.run", "ingest", "admin.ai"],
};
const DEMO_EXTRA: Permission[] = ["action.write", "action.verify", "conflict.decide", "ai.run"];

export function can(user: AppUser, p: Permission): boolean {
  if (MATRIX[user.role].includes(p)) return true;
  return user.isDemo && DEMO_EXTRA.includes(p);
}

export async function requireUser(req: Request, permission: Permission = "read"): Promise<AppUser> {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) {
    if (authMode() !== "open") throw new HttpError(401, "Sign in to continue.");
    const user = await openDemoUser();
    if (!can(user, permission)) throw new HttpError(403, `Your role (${user.role}) cannot do this.`);
    return user;
  }
  const { data, error } = await db().auth.getUser(token);
  if (error || !data.user) throw new HttpError(401, "Your session expired. Sign in again.");
  const { data: p } = await db().from("profiles").select("role, is_demo, display_name").eq("id", data.user.id).single();
  if (!p) throw new HttpError(403, "No profile for this account.");
  const user: AppUser = { id: data.user.id, role: p.role, isDemo: p.is_demo, displayName: p.display_name };
  if (!can(user, permission)) throw new HttpError(403, `Your role (${user.role}) cannot do this.`);
  return user;
}

let openUser: AppUser | null = null;
/** Open mode: the shared sandbox account. It is a demo user, so it never changes team data. */
async function openDemoUser(): Promise<AppUser> {
  if (openUser) return openUser;
  const { data: p } = await db().from("profiles").select("id, role, is_demo, display_name").eq("display_name", OPEN_DEMO_EMAIL).maybeSingle();
  if (!p) throw new HttpError(503, "Open mode is on but the demo account is missing. Run `npm run seed`.");
  return (openUser = { id: p.id, role: p.role, isDemo: p.is_demo, displayName: "Open demo" });
}
