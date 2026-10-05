// The search overlay from the 21st.dev dashboard-sidebar demo, made functional: filtering, grouped results,
// arrow-key selection, Enter to run, Escape or a click outside to close.
import { useEffect, useMemo, useRef, useState, type ElementType, type KeyboardEvent } from "react";
import { CornerDownLeft, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CommandItem {
  id: string;
  group: string;
  title: string;
  hint?: string;
  icon: ElementType;
  /** Extra words that should match, e.g. plant codes or record numbers. */
  keywords?: string;
  run: () => void;
}

const norm = (s: string) => s.toLowerCase().replace(/[\s·_-]+/g, " ").trim();

export function CommandPalette({ open, onClose, items, placeholder = "Search…", emptyHint, limitPerGroup = 8 }: {
  open: boolean; onClose: () => void; items: CommandItem[]; placeholder?: string; emptyHint?: string; limitPerGroup?: number;
}) {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);

  useEffect(() => { if (open) { setQ(""); setSel(0); requestAnimationFrame(() => input.current?.focus()); } }, [open]);

  const results = useMemo(() => {
    const terms = norm(q).split(" ").filter(Boolean);
    const hits = items.filter((it) => {
      const hay = norm(`${it.title} ${it.hint ?? ""} ${it.keywords ?? ""} ${it.group}`);
      return terms.every((t) => hay.includes(t));
    });
    const groups = new Map<string, CommandItem[]>();
    for (const h of hits) {
      const g = groups.get(h.group) ?? [];
      if (g.length < limitPerGroup) g.push(h);
      groups.set(h.group, g);
    }
    return [...groups.entries()];
  }, [q, items, limitPerGroup]);
  const flat = results.flatMap(([, g]) => g);

  useEffect(() => { setSel(0); }, [q]);
  useEffect(() => {
    list.current?.querySelector(`[data-index="${sel}"]`)?.scrollIntoView({ block: "nearest" });
  }, [sel]);

  if (!open) return null;
  const run = (it?: CommandItem) => { if (!it) return; onClose(); it.run(); };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(s + 1, flat.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); run(flat[sel]); }
    else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); onClose(); }
  };

  let index = -1;
  return (
    <div className="tw fixed inset-0 z-[60] flex items-start justify-center px-4 pt-[12vh]" role="presentation">
      <div className="absolute inset-0 bg-[#02060e]/65 backdrop-blur-[3px] [animation:pp-fade_150ms_ease-out]" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-label="Search PlantPulse" onKeyDown={onKey}
        className="relative w-full max-w-[600px] overflow-hidden rounded-2xl border border-line-strong [background:linear-gradient(180deg,rgb(var(--glass-rgb)/0.07),rgb(var(--glass-rgb)/0.02)),var(--popover-solid)] text-card-foreground shadow-[0_30px_80px_-20px_rgb(var(--shade-rgb)/calc(0.85*var(--shade-k)))] [animation:pp-pop_180ms_cubic-bezier(0.23,1,0.32,1)]">
        <div className="flex items-center gap-3 border-b border-border px-4">
          <Search className="size-[18px] shrink-0 text-muted-foreground" strokeWidth={1.7} aria-hidden="true" />
          <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder}
            role="combobox" aria-expanded="true" aria-controls="pp-cmd-list" aria-activedescendant={flat[sel] ? `pp-cmd-${flat[sel].id}` : undefined}
            className="h-[52px] flex-1 border-0 bg-transparent text-[15px] text-foreground outline-none placeholder:text-muted-foreground" />
          <kbd className="hidden h-5 items-center rounded-[4px] border border-border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground sm:inline-flex">ESC</kbd>
          <button type="button" onClick={onClose} aria-label="Close search"
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:hidden"><X className="size-[18px]" /></button>
        </div>
        <div ref={list} id="pp-cmd-list" role="listbox" className="max-h-[min(60vh,460px)] overflow-y-auto p-2">
          {flat.length === 0 && (
            <div className="px-4 py-10 text-center">
              <p className="text-[14px] font-semibold text-foreground">Nothing matches “{q}”</p>
              {emptyHint && <p className="mt-1 text-[13px] text-muted-foreground">{emptyHint}</p>}
            </div>
          )}
          {results.map(([group, its]) => (
            <div key={group} className="mb-1" role="group" aria-label={group}>
              <div className="px-2.5 pb-1 pt-2 text-[11px] font-medium uppercase tracking-[0.1em] text-ink-4">{group}</div>
              {its.map((it) => {
                index += 1;
                const i = index;
                const on = i === sel;
                return (
                  <div key={it.id} id={`pp-cmd-${it.id}`} data-index={i} role="option" aria-selected={on}
                    onMouseMove={() => setSel(i)} onClick={() => run(it)}
                    className={cn("flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2", on ? "bg-accent-soft shadow-[inset_0_0_0_1px_rgb(var(--accent-rgb)/0.25)]" : "")}>
                    <span className={cn("grid size-8 shrink-0 place-items-center rounded-md border", on ? "border-line-hot bg-accent/15 text-accent-ink" : "border-border bg-fg/[0.04] text-muted-foreground")}>
                      <it.icon className="size-4" strokeWidth={1.7} aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-medium text-foreground">{it.title}</span>
                      {it.hint && <span className="block truncate text-[12.5px] text-muted-foreground">{it.hint}</span>}
                    </span>
                    {on && <CornerDownLeft className="size-4 shrink-0 text-accent-ink" aria-hidden="true" />}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-4 border-t border-border bg-black/20 px-4 py-2 text-[12px] text-muted-foreground">
          <span><kbd className="font-mono">↑↓</kbd> move</span><span><kbd className="font-mono">Enter</kbd> open</span><span className="ml-auto hidden sm:inline">Ctrl K anywhere</span>
        </div>
      </div>
    </div>
  );
}
