import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
// `?offline=1` forces the bundled snapshot even on the hosted build, so the demo still works if a backend is down.
const forcedOffline = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("offline");

/** null = offline demo mode (bundled snapshot, browser-only simulation). */
export const supabase = url && key && !forcedOffline ? createClient(url, key) : null;
export const LIVE = supabase !== null;
/** Open mode (VITE_AUTH_MODE=open): no sign-in; the API treats every visitor as the shared demo account. */
export const OPEN = LIVE && import.meta.env.VITE_AUTH_MODE === "open";
