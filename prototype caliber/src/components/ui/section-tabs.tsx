// Sub-pages inside a page: a sticky tab bar with a sliding indicator, and panels that slide in from the side the
// reader is moving towards. The open tab lives in the hash query (?tab=…) so a link can open a section directly;
// it is written with replaceState, so switching tabs never fires the router's scroll-to-top.
import { useEffect, useLayoutEffect, useRef, useState, type ElementType, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface SectionTab {
  id: string;
  label: string;
  icon?: ElementType;
  /** A small count or flag after the label. */
  badge?: ReactNode;
  badgeTone?: "default" | "danger" | "warn" | "ai";
  render: () => ReactNode;
}

const readTab = (key: string) => new URLSearchParams(window.location.hash.split("?")[1] ?? "").get(key);

function writeTab(key: string, id: string) {
  const [path, q] = window.location.hash.split("?");
  const params = new URLSearchParams(q ?? "");
  params.set(key, id);
  history.replaceState(null, "", `${path}?${params}`);
}

/** Open a tab from anywhere on the page (e.g. a teaser card's "Open" button). */
export const openSectionTab = (id: string, key = "tab") => window.dispatchEvent(new CustomEvent("plantpulse:tab", { detail: { id, key } }));

const BADGE = {
  default: "bg-fg/[0.08] text-ink-2",
  danger: "bg-danger/15 text-danger-ink",
  warn: "bg-caution/15 text-caution-ink",
  ai: "bg-ai/15 text-ai-ink",
};

export function SectionTabs({ tabs, param = "tab", label, className }: { tabs: SectionTab[]; param?: string; label: string; className?: string }) {
  const initial = readTab(param);
  const [active, setActive] = useState(tabs.some((t) => t.id === initial) ? initial! : tabs[0].id);
  const [dir, setDir] = useState(0);
  const bar = useRef<HTMLDivElement>(null);
  const top = useRef<HTMLDivElement>(null);
  const [ind, setInd] = useState({ x: 0, w: 0 });
  const idx = Math.max(0, tabs.findIndex((t) => t.id === active));

  const pick = (id: string, scroll = false) => {
    const next = tabs.findIndex((t) => t.id === id);
    if (next < 0) return;
    setDir(Math.sign(next - idx));
    setActive(id);
    writeTab(param, id);
    // Keep the bar in view when the panel above it is long.
    const el = top.current;
    if (el && (scroll || el.getBoundingClientRect().top < 0)) el.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  };

  useEffect(() => {
    const on = (e: Event) => { const d = (e as CustomEvent).detail; if (d?.key === param) pick(d.id, true); };
    window.addEventListener("plantpulse:tab", on);
    return () => window.removeEventListener("plantpulse:tab", on);
  });

  // A link to another tab on the same page (e.g. #/actions/KO-3201?tab=source) switches the tab in place.
  // One stable listener reading the latest state through a ref: the router re-renders the page during the same
  // hashchange, and a listener swapped mid-dispatch would never see the event.
  const onHash = useRef<() => void>(() => {});
  onHash.current = () => { const t = readTab(param); if (t && t !== active && tabs.some((x) => x.id === t)) pick(t); };
  useEffect(() => {
    const on = () => onHash.current();
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);

  useLayoutEffect(() => {
    const measure = () => {
      const b = bar.current?.querySelector<HTMLElement>(`[data-tab="${active}"]`);
      if (b) setInd({ x: b.offsetLeft, w: b.offsetWidth });
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (bar.current) ro.observe(bar.current);
    return () => ro.disconnect();
  }, [active]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const n = tabs[(idx + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
    pick(n.id);
    bar.current?.querySelector<HTMLElement>(`[data-tab="${n.id}"]`)?.focus();
  };

  const tab = tabs[idx];
  return (
    <div className={cn("tw", className)}>
      <div ref={top} className="scroll-mt-[72px]" />
      <div className="tabbar-fade sticky top-[60px] z-10 -mx-1 mb-4 px-1 pb-1 pt-2">
        <div ref={bar} role="tablist" aria-label={label} onKeyDown={onKey}
          className="relative flex gap-1 overflow-x-auto rounded-xl border border-line bg-[rgb(var(--panel-rgb)/0.85)] p-1 shadow-[var(--shadow)] backdrop-blur-xl [scrollbar-width:none]">
          <span aria-hidden="true" className="absolute bottom-1 top-1 rounded-lg bg-accent-soft shadow-[inset_0_0_0_1px_var(--line-hot)] transition-[transform,width] duration-300 ease-out-soft"
            style={{ transform: `translateX(${ind.x - 4}px)`, width: ind.w, left: 4 }} />
          {tabs.map((t) => {
            const on = t.id === active;
            return (
              <button key={t.id} data-tab={t.id} type="button" role="tab" aria-selected={on} tabIndex={on ? 0 : -1} onClick={() => pick(t.id)}
                className={cn("relative z-[1] flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3.5 py-2 text-[13.5px] font-medium transition-colors duration-150",
                  on ? "text-ink-hi" : "text-ink-3 hover:text-ink")}>
                {t.icon && <t.icon className={cn("size-4", on ? "text-accent-ink" : "")} strokeWidth={1.8} aria-hidden="true" />}
                {t.label}
                {t.badge !== undefined && <span className={cn("rounded-full px-1.5 py-px text-[11px] font-semibold tabular-nums", BADGE[t.badgeTone ?? "default"])}>{t.badge}</span>}
              </button>
            );
          })}
        </div>
      </div>
      <div key={tab.id} role="tabpanel" aria-label={tab.label}
        className="min-w-0 [animation:pp-tab-in_320ms_cubic-bezier(0.16,1,0.3,1)_both] motion-reduce:[animation:none]"
        style={{ ["--tab-from" as string]: `${dir * 28}px` }}>
        {tab.render()}
      </div>
    </div>
  );
}
