import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "./env.js";

let client: SupabaseClient | null = null;
export function db(): SupabaseClient {
  return (client ??= createClient(env().SUPABASE_URL, env().SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  }));
}
export function setDbForTests(c: SupabaseClient) { client = c; }

export async function publishedSnapshotId(): Promise<string> {
  const { data, error } = await db().from("snapshots").select("id").eq("status", "published").single();
  if (error || !data) throw new Error("No published snapshot. Run `npm run seed`.");
  return data.id as string;
}
