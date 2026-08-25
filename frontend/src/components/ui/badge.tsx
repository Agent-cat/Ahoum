import * as React from "react";
import { cn } from "@/lib/utils";

function badgeVariants({
  variant = "default",
  className,
}: {
  variant?: "default" | "secondary" | "destructive" | "outline";
  className?: string;
} = {}) {
  return cn(
    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2",
    {
      "border-transparent bg-indigo-100 text-indigo-700":
        variant === "default",
      "border-transparent bg-zinc-100 text-zinc-600":
        variant === "secondary",
      "border-transparent bg-red-100 text-red-700":
        variant === "destructive",
      "border-zinc-200 text-zinc-600":
        variant === "outline",
    },
    className
  );
}

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline";
}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
