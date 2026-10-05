import * as React from "react";
import { cn } from "@/lib/utils";

/** A smoked-glass plate (.panel). Header, title and description follow shadcn's anatomy. */
const Card = React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement> & { as?: "div" | "section" | "article" }>(
  ({ className, as: As = "section", ...props }, ref) => <As ref={ref as React.Ref<HTMLDivElement>} className={cn("panel tw", className)} {...props} />,
);
Card.displayName = "Card";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { action?: React.ReactNode }>(
  ({ className, action, children, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-wrap items-start justify-between gap-x-4 gap-y-2 px-5 pt-4", className)} {...props}>
      <div className="min-w-0 flex-1">{children}</div>
      {action && <div className="flex min-w-0 max-w-full shrink-0 flex-wrap items-center gap-2">{action}</div>}
    </div>
  ),
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement> & { icon?: React.ElementType; as?: "h2" | "h3" }>(
  ({ className, icon: Icon, as: As = "h2", children, ...props }, ref) => (
    <As ref={ref} className={cn("flex items-center gap-2 text-[15px] font-semibold tracking-[-0.01em] text-ink", className)} {...props}>
      {Icon && <Icon className="size-4 shrink-0 text-ink-3" strokeWidth={1.8} aria-hidden="true" />}
      {children}
    </As>
  ),
);
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => <p ref={ref} className={cn("mt-1 max-w-[72ch] text-[13px] leading-snug text-ink-3", className)} {...props} />,
);
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("px-5 pb-5 pt-4", className)} {...props} />,
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("flex flex-wrap items-center gap-2 border-t border-line px-5 py-3", className)} {...props} />,
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
