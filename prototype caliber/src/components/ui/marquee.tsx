import React, { type ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

interface MarqueeProps extends ComponentPropsWithoutRef<"div"> {
  reverse?: boolean;
  pauseOnHover?: boolean;
  children: React.ReactNode;
  vertical?: boolean;
  /** Copies of the content laid end to end so the loop never shows a gap. */
  repeat?: number;
  ariaLabel?: string;
}

/** Infinite scrolling strip (the 21st.dev "3d-testimonials" marquee). Decorative copies are hidden from assistive tech. */
export function Marquee({ className, reverse = false, pauseOnHover = false, children, vertical = false, repeat = 4, ariaLabel, ...props }: MarqueeProps) {
  return (
    <div {...props} data-slot="marquee" aria-label={ariaLabel} role={ariaLabel ? "region" : undefined}
      className={cn("group flex overflow-hidden p-2 [--duration:40s] [--gap:1rem] [gap:var(--gap)]", vertical ? "flex-col" : "flex-row", className)}>
      {Array.from({ length: repeat }, (_, i) => (
        <div key={i} aria-hidden={i > 0 ? true : undefined}
          className={cn(
            "flex shrink-0 justify-around [gap:var(--gap)]",
            vertical ? "animate-marquee-vertical flex-col" : "animate-marquee flex-row",
            pauseOnHover && "group-hover:[animation-play-state:paused]",
            reverse && "[animation-direction:reverse]",
            "motion-reduce:[animation-play-state:paused]",
          )}>
          {children}
        </div>
      ))}
    </div>
  );
}
