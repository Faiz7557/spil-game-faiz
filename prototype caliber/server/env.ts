import { z } from "zod";

const Env = z.object({
  OPENAI_API_KEY: z.string().min(1).optional(),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  RESEND_API_KEY: z.string().optional(),
  NOTIFY_FROM: z.string().optional(),
  CRON_SECRET: z.string().optional(),
  AI_DAILY_BUDGET_USD: z.coerce.number().positive().default(20),
  /** "open": no sign-in; every request without a token acts as the shared demo account (trial phase). */
  AUTH_MODE: z.enum(["required", "open"]).default("required"),
});

/** The shared account used in open mode. Created by `npm run seed` through the admin API, so no email is sent. */
export const OPEN_DEMO_EMAIL = "open-demo@plantpulse.invalid";

let cached: z.infer<typeof Env> | null = null;
/** A missing or malformed variable is a server misconfiguration (500 naming the variable), never a user input error. */
export class ConfigError extends Error {}
export function env() {
  if (cached) return cached;
  const r = Env.safeParse(process.env);
  if (!r.success) throw new ConfigError(`Server configuration is incomplete: ${r.error.issues.map((i) => i.path.join(".")).join(", ")}.`);
  return (cached = r.data);
}
/** Read without validating the rest, so the sign-in decision never depends on unrelated variables. */
export const authMode = () => (process.env.AUTH_MODE === "open" ? "open" : "required");
