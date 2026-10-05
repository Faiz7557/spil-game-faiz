import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The top of every workspace page: title (with optional badges), one plain-language line on what the page is
 * for, and page-level controls on the right (filters, case switch, primary action).
 */
export function PageHeader({ title, badges, description, actions, className }: {
  title: ReactNode; badges?: ReactNode; description?: ReactNode; actions?: ReactNode; className?: string;
}) {
  return (
    <header className={cn("tw mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-4", className)}>
      <div className="min-w-0 max-w-[82ch]">
        <h1 className="flex flex-wrap items-center gap-2.5 text-[26px] font-semibold leading-tight tracking-[-0.025em] text-ink-hi">
          {title}{badges}
        </h1>
        {description && <p className="mt-2 text-[14.5px] leading-relaxed text-ink-2">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-end gap-2">{actions}</div>}
    </header>
  );
}

/** Small uppercase section label used to group a run of panels ("Condition", "Follow-through"). */
export function SectionLabel({ children, right, className }: { children: ReactNode; right?: ReactNode; className?: string }) {
  return (
    <div className={cn("tw mb-3 mt-8 flex items-center gap-3 first:mt-0", className)}>
      <h2 className="text-[11.5px] font-medium uppercase tracking-[0.12em] text-ink-3">{children}</h2>
      <span className="h-px flex-1 bg-line" aria-hidden="true" />
      {right}
    </div>
  );
}
