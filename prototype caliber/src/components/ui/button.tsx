import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/** shadcn's Button API over the design-system .btn vocabulary, so JSX and class-based pages render identically. */
const buttonVariants = cva("btn", {
  variants: {
    variant: { default: "", primary: "primary", ghost: "ghost", danger: "danger", ai: "ai", outline: "" },
    size: { default: "", sm: "sm", lg: "lg", icon: "!w-[34px] !px-0", "icon-sm": "sm !w-7 !px-0" },
  },
  defaultVariants: { variant: "default", size: "default" },
});

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, asChild = false, type, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";
  return <Comp ref={ref} type={asChild ? undefined : (type ?? "button")} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
});
Button.displayName = "Button";

export { Button, buttonVariants };
