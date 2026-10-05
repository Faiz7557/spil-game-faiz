import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, CornerDownLeft, LoaderCircle, Send, Sparkles, X } from "lucide-react";
import { stream } from "../lib/api";
import { LIVE } from "../lib/supabase";
import type { CopilotAnswer, GuardResult } from "../lib/copilotTypes";
import { Note, useDrawer } from "./ui";
import GuardBadge from "./GuardBadge";
import { cn } from "@/lib/utils";

interface Turn { q: string; tools: string[]; answer?: CopilotAnswer; guard?: GuardResult[]; excerpts?: Record<string, string>; error?: string; done?: boolean }

const TOOL_LABEL: Record<string, string> = {
  get_kpis: "KPIs", search_register: "register search", get_case: "case file", get_condition: "condition readings",
  get_rca_slides: "RCA slides", get_priorities: "Problem Tank priorities",
};
const KIND_LABEL: Record<string, string> = { fact: "Fact", documented_finding: "RCA finding", hypothesis: "Hypothesis", recommendation: "Recommendation" };

const SUGGESTIONS = (tag: string) => [
  `What is still open on ${tag}, and what should I verify first?`,
  "Which open records should the reliability team look at this week, and why?",
  `Does the ${tag} RCA agree with the sensor data?`,
];

export default function CopilotPanel({ tag, page }: { tag: string; page: string }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  useEffect(() => {
    const show = (e: Event) => { setOpen(true); const d = (e as CustomEvent).detail; if (d?.question) setQ(d.question); };
    window.addEventListener("plantpulse:copilot", show);
    return () => window.removeEventListener("plantpulse:copilot", show);
  }, []);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const [threadId, setThreadId] = useState<string | undefined>();
  const [showUnsupported, setShowUnsupported] = useState(false);
  const drawer = useDrawer();
  const input = useRef<HTMLTextAreaElement>(null);
  const body = useRef<HTMLDivElement>(null);

  useEffect(() => { if (open) input.current?.focus(); }, [open]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !document.querySelector(".drawer")) setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  useEffect(() => { body.current?.scrollTo({ top: body.current.scrollHeight, behavior: "smooth" }); }, [turns]);

  const ask = async (question: string) => {
    if (question.trim().length < 3 || busy || !LIVE) return;
    setBusy(true); setQ("");
    setTurns((xs) => [...xs, { q: question, tools: [] }]);
    const patch = (f: (t: Turn) => void) => setTurns((xs) => { const c = [...xs]; const last = { ...c[c.length - 1] }; f(last); c[c.length - 1] = last; return c; });
    try {
      await stream("/api/copilot", { question, caseTag: tag, threadId }, (ev, data) => {
        if (ev === "tool") patch((x) => { x.tools = [...x.tools, data.name]; });
        if (ev === "answer") patch((x) => { x.answer = data; });
        if (ev === "excerpts") patch((x) => { x.excerpts = data; });
        if (ev === "guard") patch((x) => { x.guard = data; });
        if (ev === "error") patch((x) => { x.error = data.message; });
        if (ev === "done") { patch((x) => { x.done = true; }); setThreadId(data.threadId); }
      });
    } catch (e) { patch((x) => { x.error = e instanceof Error ? e.message : "The copilot failed."; }); }
    finally { setBusy(false); }
  };

  if (!open) {
    return (
      <button className="copilot-fab" onClick={() => setOpen(true)} aria-label="Ask PlantPulse" data-page={page}>
        <img src="/mascot.png" alt="" aria-hidden="true" draggable={false} className="copilot-fab-pipo" /> <span>Ask PlantPulse</span>
      </button>
    );
  }

  return (
    <aside className="copilot tw" aria-label="Ask PlantPulse">
      {/* header: violet means the model wrote what follows */}
      <div className="relative border-b border-line px-5 pb-4 pt-4">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(420px_170px_at_0%_0%,rgb(var(--ai-rgb)/0.22),transparent_70%)]" aria-hidden="true" />
        <div className="relative flex items-start gap-3">
          <img src="/mascot.png" alt="" aria-hidden="true" draggable={false} className="size-10 shrink-0 select-none object-contain" />
          <div className="min-w-0 flex-1">
            <h2 className="flex flex-wrap items-center gap-2 text-[15px] font-semibold tracking-[-0.01em] text-ink-hi">
              Ask PlantPulse <span className="badge b-ai">AI · model output</span>
            </h2>
            <p className="mt-1 text-[12.5px] leading-snug text-ink-3">Answers from the governed snapshot. Every sentence is checked against the evidence it cites.</p>
          </div>
          <button type="button" onClick={() => setOpen(false)} aria-label="Close"
            className="grid size-8 shrink-0 place-items-center rounded-lg text-ink-3 transition-colors hover:bg-fg/[0.06] hover:text-ink-hi focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 py-5" ref={body}>
        {!LIVE && <Note tone="warn">The copilot calls the AI model, so it needs the hosted version. The Investigation page shows a recorded, reviewed AI brief for KO-3201.</Note>}
        {LIVE && !turns.length && (
          <div className="flex flex-col gap-2.5">
            <p className="text-[13px] text-ink-3">Try one of these, or ask about any asset, plant or open record.</p>
            {SUGGESTIONS(tag).map((s) => (
              <button key={s} type="button" onClick={() => ask(s)}
                className="group flex items-start gap-3 rounded-xl border border-line bg-fg/[0.025] px-3.5 py-3 text-left text-[13.5px] leading-snug text-ink-2 transition-[border-color,background-color,color] duration-150 hover:border-[rgb(var(--ai-rgb)/0.5)] hover:bg-ai-soft hover:text-ink-hi focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <Sparkles className="mt-0.5 size-3.5 shrink-0 text-ai" aria-hidden="true" />
                <span className="min-w-0 flex-1">{s}</span>
                <ArrowUpRight className="mt-0.5 size-3.5 shrink-0 text-ink-4 transition-colors group-hover:text-ai-ink" aria-hidden="true" />
              </button>
            ))}
          </div>
        )}
        {turns.map((t, i) => {
          const unsupported = t.guard?.filter((g) => g.status === "unsupported").length ?? 0;
          const counts = t.guard ? {
            supported: t.guard.filter((g) => g.status === "supported").length,
            partial: t.guard.filter((g) => g.status === "partial").length,
          } : null;
          return (
            <div key={i} className="flex flex-col gap-2.5">
              <div className="max-w-[88%] self-end rounded-[14px_14px_4px_14px] bg-[linear-gradient(180deg,var(--bubble-a),var(--bubble-b))] px-3.5 py-2.5 text-[13.5px] leading-snug text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]">{t.q}</div>
              {(!!t.tools.length || (!t.answer && !t.error)) && (
                <div className="flex flex-wrap items-center gap-1.5" aria-live="polite">
                  {t.tools.map((n, k) => <span key={k} className="tool-chip">{TOOL_LABEL[n] ?? n}</span>)}
                  {!t.answer && !t.error && (
                    <span className="tool-chip pending inline-flex items-center gap-1.5">
                      <LoaderCircle className="size-3 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                      {t.tools.length ? "reasoning…" : "reading the snapshot…"}
                    </span>)}
                </div>
              )}
              {t.error && <Note tone="danger">{t.error}</Note>}
              {t.answer && (
                <div className="flex flex-col gap-3 rounded-[14px_14px_14px_4px] border border-[rgb(var(--ai-rgb)/0.28)] bg-[linear-gradient(180deg,rgb(var(--ai-rgb)/0.09),rgb(var(--ai-rgb)/0.03))] px-4 py-3.5">
                  <div className="flex flex-wrap items-center gap-2 text-[11.5px] text-ai-ink">
                    <Sparkles className="size-3.5" aria-hidden="true" />
                    <span className="font-medium">PlantPulse wrote this</span>
                    {counts && (
                      <span className="ml-auto text-ink-3 tabular-nums">
                        Evidence Guard: {counts.supported} of {counts.supported + counts.partial + unsupported} fully backed
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col divide-y divide-[rgb(var(--ai-rgb)/0.14)]">
                    {t.answer.sentences.map((s, k) => {
                      const g = t.guard?.find((x) => x.index === k);
                      const status = g?.status ?? "pending";
                      if (status === "unsupported" && !showUnsupported) return null;
                      return (
                        <div key={k} className={cn("py-2 first:pt-0 last:pb-0", status === "unsupported" && "opacity-60")}>
                          <div className="mb-1 flex flex-wrap items-center gap-1.5">
                            <span className={`kind k-${s.kind}`}>{KIND_LABEL[s.kind]}</span>
                            <span className="ml-auto"><GuardBadge status={status} reason={g?.reason} /></span>
                          </div>
                          <p className={cn("text-[13.5px] leading-relaxed text-ink", status === "unsupported" && "line-through decoration-danger")}>
                            {s.text}{" "}
                            {s.refs.map((r) => (
                              <button key={r} type="button" className="cite mr-1" onClick={() => drawer({ kind: "info", title: r, body: (
                                <div className="stack"><div className="excerpt">{t.excerpts?.[r] ?? "This ref was not retrieved in this run, so it cannot support the sentence."}</div>
                                  <p className="tiny muted">The exact text the copilot's tool returned for {r} in this answer.</p></div>) })}>{r}</button>
                            ))}
                          </p>
                          {g?.reason && status !== "supported" && <p className="mt-1 text-[11.5px] leading-snug text-ink-3">{g.reason}</p>}
                        </div>
                      );
                    })}
                  </div>
                  {unsupported > 0 && (
                    <button type="button" className="self-start text-[12.5px] font-medium text-danger-ink hover:underline" onClick={() => setShowUnsupported(!showUnsupported)}>
                      {showUnsupported ? "Hide" : "Show"} {unsupported} unsupported sentence{unsupported > 1 ? "s" : ""}
                    </button>
                  )}
                  {!!t.answer.abstentions.length && <Note><b>The data cannot answer:</b> {t.answer.abstentions.join(" ")}</Note>}
                </div>
              )}
              {t.answer && t.done && !!t.answer.follow_ups.length && i === turns.length - 1 && (
                <div className="flex flex-wrap gap-1.5">
                  {t.answer.follow_ups.slice(0, 3).map((f) => (
                    <button key={f} type="button" onClick={() => ask(f)}
                      className="rounded-full border border-line bg-fg/[0.025] px-3 py-1.5 text-left text-[12.5px] leading-snug text-ink-2 transition-colors duration-150 hover:border-[rgb(var(--ai-rgb)/0.5)] hover:bg-ai-soft hover:text-ink-hi focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      {f}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <form className="border-t border-line bg-[rgb(var(--well-rgb)/0.4)] px-4 pb-3 pt-3" onSubmit={(e) => { e.preventDefault(); ask(q); }}>
        <div className="flex items-end gap-2 rounded-xl border border-line-strong bg-[rgb(var(--well-rgb)/0.5)] p-1.5 transition-[border-color,box-shadow] duration-150 focus-within:border-accent focus-within:shadow-[0_0_0_3px_rgb(var(--accent-rgb)/0.25)]">
          <textarea ref={input} className="min-h-[44px] flex-1 resize-none bg-transparent px-2 py-1.5 text-[13.5px] leading-snug text-ink outline-none placeholder:text-ink-4 disabled:opacity-60" rows={2} value={q} onChange={(e) => setQ(e.target.value)} disabled={!LIVE || busy}
            placeholder={LIVE ? `Ask about ${tag} or the whole register…` : "Available in the hosted version"} aria-label="Question"
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(q); } }} />
          <button type="submit" className="btn primary !h-9 !w-9 !px-0" disabled={!LIVE || busy || q.trim().length < 3} aria-label="Ask">
            {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Send className="size-4" aria-hidden="true" />}
          </button>
        </div>
        <p className="mt-1.5 flex items-center gap-1 px-1 text-[11px] text-ink-4"><CornerDownLeft className="size-3" aria-hidden="true" />Enter to ask · Shift+Enter for a new line</p>
      </form>
    </aside>
  );
}
