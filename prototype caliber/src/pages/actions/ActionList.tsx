// Tracked actions as a list beside one full action. The list is for finding the action that needs you (state, step,
// missing evidence, owner); the detail is the whole action card with every control, at its natural height, so the
// page is the only thing that scrolls.
import { useEffect, useState, type ReactNode } from "react";
import { ChevronRight, Sparkles } from "lucide-react";
import { STATES, STATE_LABEL, ruleCheck, type SimAction } from "../../domain/actionTransitions";
import { cn } from "@/lib/utils";
import ActionCard from "./ActionCard";

const LIFE = STATES.filter((s) => s !== "rework");

export function ActionList({ actions, draft }: { actions: SimAction[]; draft?: { title: string; node: ReactNode } }) {
  const [sel, setSel] = useState<string>(actions[0]?.id ?? (draft ? "draft" : ""));
  // A newly created action (the list grows at the top) becomes the selected one.
  const first = actions[0]?.id;
  useEffect(() => { if (first) setSel(first); }, [first]);
  const current = actions.find((a) => a.id === sel);
  const showDraft = sel === "draft" && draft;

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
      <nav aria-label="Actions" className="tw flex flex-col gap-1.5 lg:sticky lg:top-[132px]">
        {actions.map((a) => {
          const rc = ruleCheck(a);
          const step = a.state === "rework" ? 0 : LIFE.indexOf(a.state) + 1;
          const on = a.id === sel;
          return (
            <button key={a.id} type="button" onClick={() => setSel(a.id)} aria-current={on ? "true" : undefined}
              className={cn("group flex w-full items-start gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors duration-150",
                on ? "border-line-hot bg-accent-soft shadow-[0_0_0_1px_var(--line-hot)]" : "border-line bg-[var(--panel)] hover:border-line-strong")}>
              <span className="min-w-0 flex-1">
                <span className="line-clamp-2 text-[13px] font-medium leading-snug text-ink-hi">{a.title}</span>
                <span className="mt-2 flex gap-0.5" aria-hidden="true">
                  {LIFE.map((s, i) => <span key={s} className={cn("h-1 flex-1 rounded-full", a.state === "verified" ? "bg-ok" : i < step - 1 ? "bg-ok/70" : i === step - 1 ? "bg-accent" : "bg-fg/10")} />)}
                </span>
                <span className="mt-1.5 flex flex-wrap items-center gap-x-2 text-[11.5px] text-ink-3">
                  <span className={a.state === "rework" ? "text-danger-ink" : ""}>{STATE_LABEL[a.state]}</span>
                  {rc.missing.length > 0 && <span className="text-danger-ink">· {rc.missing.length} evidence missing</span>}
                  <span>· {a.owner || "unassigned"}</span>
                </span>
              </span>
              <ChevronRight className={cn("mt-0.5 size-4 shrink-0 transition-transform", on ? "text-accent-ink" : "text-ink-4 group-hover:translate-x-0.5")} aria-hidden="true" />
            </button>
          );
        })}
        {draft && (
          <button type="button" onClick={() => setSel("draft")} aria-current={showDraft ? "true" : undefined}
            className={cn("flex w-full items-start gap-3 rounded-xl border border-dashed px-3.5 py-3 text-left transition-colors",
              showDraft ? "border-ai/60 bg-ai/[0.08]" : "border-ai/35 hover:border-ai/60")}>
            <Sparkles className="mt-0.5 size-4 shrink-0 text-ai" aria-hidden="true" />
            <span className="min-w-0 flex-1">
              <span className="block text-[11.5px] font-medium text-ai-ink">Proposed by the AI brief</span>
              <span className="line-clamp-2 text-[13px] leading-snug text-ink">{draft.title}</span>
            </span>
          </button>
        )}
      </nav>
      <div className="min-w-0">
        {showDraft ? <div className="tw overflow-hidden rounded-2xl border border-ai/35 [background:var(--glass),var(--panel)] shadow-[var(--shadow)]">{draft.node}</div>
          : current ? <ActionCard key={current.id} a={current} /> : null}
      </div>
    </div>
  );
}
