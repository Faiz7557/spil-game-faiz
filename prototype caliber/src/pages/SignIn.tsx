import { useState } from "react";
import { ArrowRight, Mail, UserRound } from "lucide-react";
import { useSession } from "../lib/session";
import { Note } from "../components/ui";
import { BrandMark } from "../components/shell/Shell";
import { Button } from "@/components/ui/button";

export default function SignIn() {
  const { guest, email } = useSession();
  const [addr, setAddr] = useState("");
  const [msg, setMsg] = useState<{ tone: "ok" | "danger"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<void>, ok: string) => {
    setBusy(true); setMsg(null);
    try { await fn(); setMsg({ tone: "ok", text: ok }); }
    catch (e) { setMsg({ tone: "danger", text: e instanceof Error ? e.message : "Sign-in failed." }); }
    finally { setBusy(false); }
  };
  return (
    <main className="tw relative grid min-h-screen place-items-center overflow-hidden bg-ground px-4 py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_520px_at_12%_-8%,rgb(var(--accent-2-rgb)/0.22),transparent_62%),radial-gradient(700px_420px_at_100%_110%,rgb(var(--info-rgb)/0.07),transparent_60%)]" aria-hidden="true" />
      <section className="panel relative w-full max-w-[440px] animate-rise px-6 pb-6 pt-7 sm:px-8 sm:pb-8">
        <div className="flex flex-col items-center text-center">
          <BrandMark className="size-20" />
          <h1 className="mt-4 text-[26px] font-semibold tracking-[-0.025em] text-ink-hi">PlantPulse</h1>
          <p className="mt-1.5 text-[13.5px] text-ink-3">Reliability decision workspace · CALIBER 2026 Case 2</p>
        </div>

        <div className="mt-7 flex flex-col gap-3">
          <Button variant="primary" size="lg" className="w-full justify-center" disabled={busy} onClick={() => run(guest, "Signed in as guest.")}>
            <UserRound className="size-4" aria-hidden="true" />Continue as guest<ArrowRight className="size-4" aria-hidden="true" />
          </Button>
          <Note>Guests get a private sandbox. Every AI feature and the full action workflow work, and your changes are visible only to you.</Note>
        </div>

        <div className="my-6 flex items-center gap-3 text-[12px] text-ink-3" aria-hidden="true">
          <span className="h-px flex-1 bg-line" />or sign in as a team member<span className="h-px flex-1 bg-line" />
        </div>

        <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); run(() => email(addr.trim()), "Check your inbox for the sign-in link."); }}>
          <label className="field"><span>Team member email</span>
            <input className="input" type="email" autoComplete="email" value={addr} onChange={(e) => setAddr(e.target.value)} placeholder="name@company.com" /></label>
          <Button type="submit" className="w-full justify-center" disabled={busy || !addr.includes("@")}><Mail className="size-4" aria-hidden="true" />Email me a sign-in link</Button>
        </form>

        {msg && <div className="mt-4" role={msg.tone === "danger" ? "alert" : "status"}><Note tone={msg.tone}>{msg.text}</Note></div>}

        <p className="mt-6 border-t border-line pt-4 text-center text-[12.5px] leading-relaxed text-ink-3">
          Prefer no account? <a href="?offline=1" className="font-medium !text-accent-ink hover:underline">Open the offline demo</a>. It runs on the bundled snapshot, and AI features are off.
        </p>
      </section>
    </main>
  );
}
