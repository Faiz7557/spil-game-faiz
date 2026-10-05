// Adapted from the 21st.dev "dashboard-sidebar" component: same anatomy (switcher, grouped items, nested
// groups, badges, shortcut hints, bottom items), but data-driven instead of mock data, real links instead of
// clickable divs, and an icon-only collapsed mode instead of hiding the rail completely.
import { useEffect, useState, type ElementType, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type NavItemData = {
  id: string;
  title: string;
  icon: ElementType;
  /** A real destination. Items without one call onSelect (search, reset, sign out...). */
  href?: string;
  onSelect?: () => void;
  badge?: number | string;
  badgeTone?: "default" | "warn" | "danger";
  /** Small trailing tag such as "offline" for features that need the hosted build. */
  flag?: string;
  shortcut?: string;
  /** One-line description, shown as the tooltip and to screen readers. */
  hint?: string;
  children?: NavItemData[];
};

export type NavGroupData = { heading?: string; items: NavItemData[] };

const BADGE_TONE = {
  default: "bg-fg/[0.08] text-ink-2",
  warn: "bg-caution-soft text-caution-ink",
  danger: "bg-danger-soft text-danger-ink",
};

const contains = (item: NavItemData, id: string): boolean =>
  item.id === id || !!item.children?.some((c) => contains(c, id));

function NavItem({ item, activeId, collapsed, level = 0, onNavigate }: {
  item: NavItemData; activeId: string; collapsed: boolean; level?: number; onNavigate?: () => void;
}) {
  const isActive = activeId === item.id;
  const hasChildren = !!item.children?.length;
  const holdsActive = hasChildren && contains(item, activeId);
  const [open, setOpen] = useState(holdsActive);
  useEffect(() => { if (holdsActive) setOpen(true); }, [holdsActive]);

  const rowClass = cn(
    "group relative flex w-full items-center gap-2.5 rounded-md py-[7px] text-left text-[13.5px] no-underline outline-none select-none",
    "transition-[background-color,color] duration-150 ease-out-soft focus-visible:ring-2 focus-visible:ring-sidebar-ring",
    collapsed ? "justify-center px-0" : "px-2.5",
    isActive
      ? "bg-[linear-gradient(90deg,rgb(var(--accent-rgb)/0.2),rgb(var(--accent-rgb)/0.06))] font-medium text-ink-hi shadow-[inset_0_0_0_1px_rgb(var(--accent-rgb)/0.28)] before:absolute before:left-[-3px] before:top-1.5 before:bottom-1.5 before:w-[3px] before:rounded-r-full before:bg-accent before:shadow-[0_0_12px_var(--accent)]"
      : holdsActive && !open
        ? "bg-sidebar-accent text-ink-hi"
        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-ink-hi",
  );
  const label = item.hint ? `${item.title}: ${item.hint}` : item.title;

  const inner = (
    <>
      <item.icon
        className={cn("size-[17px] shrink-0 transition-colors", isActive ? "text-accent-ink" : "text-sidebar-muted group-hover:text-ink-hi")}
        strokeWidth={1.7} aria-hidden="true"
      />
      {!collapsed && (
        <>
          <span className="min-w-0 flex-1 truncate tracking-[0.01em]">{item.title}</span>
          {item.flag && (
            <span className={cn("rounded-[3px] border px-1 py-px font-mono text-[9.5px] font-medium uppercase tracking-[0.06em]",
              "border-sidebar-border text-sidebar-muted")}>{item.flag}</span>
          )}
          {item.shortcut && (
            <kbd className={cn("hidden h-5 shrink-0 items-center whitespace-nowrap rounded-[4px] border px-1.5 font-mono text-[10px] group-hover:inline-flex",
              "border-sidebar-border text-sidebar-muted")}>{item.shortcut}</kbd>
          )}
          {item.badge !== undefined && (
            <span className={cn("inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold tabular-nums",
              isActive ? "bg-accent/25 text-ink-hi" : BADGE_TONE[item.badgeTone ?? "default"])}>{item.badge}</span>
          )}
          {hasChildren && (
            <ChevronRight className={cn("size-3.5 text-sidebar-muted transition-transform duration-200 ease-out-soft", open && "rotate-90")} strokeWidth={2} aria-hidden="true" />
          )}
        </>
      )}
      {collapsed && item.badge !== undefined && (
        <span className={cn("absolute right-1.5 top-1 size-1.5 rounded-full", item.badgeTone === "danger" ? "bg-danger" : item.badgeTone === "warn" ? "bg-caution" : "bg-sidebar-primary")} aria-hidden="true" />
      )}
    </>
  );

  if (hasChildren) {
    // Collapsed: the parent acts as a shortcut to its first child, since there is no room to expand.
    const first = item.children![0];
    if (collapsed) {
      return (
        <a href={first.href} className={rowClass} title={label} aria-label={label} onClick={onNavigate}>{inner}</a>
      );
    }
    return (
      <div className="flex flex-col">
        <button type="button" className={rowClass} style={{ paddingLeft: level * 12 + 10 }} aria-expanded={open} title={item.hint}
          onClick={() => setOpen((o) => !o)}>{inner}</button>
        <div className={cn("grid transition-[grid-template-rows,opacity] duration-300 ease-out-soft", open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}
          {...({ inert: open ? undefined : "" } as Record<string, string | undefined>)}>
          <div className="relative mt-0.5 flex min-h-0 flex-col gap-0.5 overflow-hidden">
            <div className="absolute inset-y-1 border-l border-sidebar-border" style={{ left: level * 12 + 18 }} aria-hidden="true" />
            {item.children!.map((c) => (
              <NavItem key={c.id} item={c} activeId={activeId} collapsed={false} level={level + 1} onNavigate={onNavigate} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const pad = collapsed ? undefined : { paddingLeft: level * 12 + 10 };
  if (item.href) {
    return (
      <a href={item.href} className={rowClass} style={pad} aria-current={isActive ? "page" : undefined}
        title={collapsed ? label : item.hint} aria-label={collapsed ? label : undefined} onClick={onNavigate}>{inner}</a>
    );
  }
  return (
    <button type="button" className={rowClass} style={pad} title={collapsed ? label : item.hint} aria-label={collapsed ? label : undefined}
      onClick={() => { item.onSelect?.(); onNavigate?.(); }}>{inner}</button>
  );
}

export function SidebarNav({ groups, bottomItems = [], activeId, collapsed = false, header, footer, onNavigate, className }: {
  groups: NavGroupData[];
  bottomItems?: NavItemData[];
  activeId: string;
  collapsed?: boolean;
  header?: ReactNode;
  footer?: ReactNode;
  /** Called after any item is used, e.g. to close the mobile drawer. */
  onNavigate?: () => void;
  className?: string;
}) {
  return (
    <div className={cn("flex h-full flex-col border-r border-sidebar-border bg-sidebar font-sans text-sidebar-foreground backdrop-blur-xl", collapsed ? "w-[64px] px-2 py-3" : "w-[252px] p-3", className)}>
      {header}
      <nav aria-label="Workspace" className="-mx-1 mt-2 flex flex-1 flex-col gap-4 overflow-y-auto px-1 [scrollbar-width:thin]">
        {groups.map((g, i) => (
          <div key={g.heading ?? i} className="flex flex-col gap-0.5">
            {g.heading && (collapsed
              ? <div className="mx-2 mb-1 border-t border-sidebar-border" role="presentation" />
              : <span className="mb-1 px-2.5 text-[12px] font-medium text-ink-4">{g.heading}</span>)}
            {g.items.map((item) => (
              <NavItem key={item.id} item={item} activeId={activeId} collapsed={collapsed} onNavigate={onNavigate} />
            ))}
          </div>
        ))}
      </nav>
      {bottomItems.length > 0 && (
        <div className="mt-3 flex flex-col gap-0.5 border-t border-sidebar-border pt-3">
          {bottomItems.map((item) => (
            <NavItem key={item.id} item={item} activeId={activeId} collapsed={collapsed} onNavigate={onNavigate} />
          ))}
        </div>
      )}
      {footer}
    </div>
  );
}
