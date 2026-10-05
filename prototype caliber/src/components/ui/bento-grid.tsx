import type { ElementType, ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Bento grid after Magic UI's, rebuilt so nothing is clipped and nothing floats: the grid holds stacked columns,
 * each card takes its natural height, and a column's leftover height is shared by its cards (flex-grow on an auto
 * basis), so the instrument on top only gains a little air instead of sitting in an oversized fixed row.
 */
export function BentoGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("grid w-full grid-cols-1 items-stretch gap-4 md:grid-cols-2 lg:grid-cols-3", className)}>{children}</div>;
}

export function BentoColumn({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex min-w-0 flex-col gap-4 [&>*]:grow", className)}>{children}</div>;
}

export function BentoCard({ name, className, background, Icon, description, href, cta, visualClassName }: {
  name: string; className?: string; background: ReactNode; Icon: ElementType; description: ReactNode; href: string; cta: string; visualClassName?: string;
}) {
  return (
    <article className={cn(
      "group relative flex min-w-0 flex-col overflow-hidden rounded-2xl border border-line",
      "[background:linear-gradient(180deg,rgb(var(--glass-rgb)/0.06),rgb(var(--glass-rgb)/0.015)),var(--panel)] shadow-[var(--shadow)]",
      "transition-[border-color,box-shadow] duration-300 ease-out-soft hover:border-line-strong",
      className,
    )}>
      <div className={cn("relative flex flex-1 items-center justify-center px-5 pt-5", visualClassName)} aria-hidden="true">
        {background}
      </div>
      <div className="relative flex flex-col gap-1 px-5 pb-5 pt-4">
        <Icon className="mb-1 size-6 text-accent-ink" strokeWidth={1.5} aria-hidden="true" />
        <h3 className="text-[18px] font-semibold leading-snug tracking-[-0.01em] text-ink-hi">{name}</h3>
        <p className="max-w-[46ch] text-[14.5px] leading-relaxed text-ink-2">{description}</p>
        <a href={href} className="mt-2 inline-flex w-fit items-center gap-1.5 text-[14px] font-medium text-accent-ink no-underline after:absolute after:inset-0 after:content-[''] hover:text-accent-hover">
          {cta}<ArrowRight className="size-4 transition-transform duration-200 ease-out-soft group-hover:translate-x-0.5" aria-hidden="true" />
        </a>
      </div>
    </article>
  );
}
