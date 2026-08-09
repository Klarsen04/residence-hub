import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary/15 text-primary dark:text-[hsl(var(--sage-soft))]",
        secondary: "border-transparent bg-black/[0.05] dark:bg-white/[0.07] text-muted-foreground",
        destructive: "border-transparent bg-destructive/15 text-destructive dark:text-[hsl(8_60%_66%)]",
        outline: "border-black/[0.14] dark:border-white/[0.14] text-foreground",
        accent: "border-transparent bg-accent/15 text-[hsl(var(--terracotta))] dark:text-[hsl(var(--terracotta-soft))]",
        success: "border-transparent bg-[hsl(var(--sage)/0.15)] text-[hsl(var(--sage))] dark:text-[hsl(var(--sage-soft))]",
        warning: "border-transparent bg-[hsl(var(--warm-yellow)/0.2)] text-[hsl(38_70%_38%)] dark:text-[hsl(var(--warm-yellow))]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
