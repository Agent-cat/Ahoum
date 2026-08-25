import * as React from "react";
import { cn } from "@/lib/utils";

function buttonVariants({
  variant = "default",
  size = "default",
  className,
}: {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
} = {}) {
  return cn(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
    {
      "bg-indigo-600 text-white shadow-sm hover:bg-indigo-700 hover:shadow-md":
        variant === "default",
      "bg-red-500 text-white shadow-sm hover:bg-red-600":
        variant === "destructive",
      "border border-zinc-200 bg-white text-zinc-700 shadow-sm hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900":
        variant === "outline",
      "bg-zinc-100 text-zinc-700 hover:bg-zinc-200/80":
        variant === "secondary",
      "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900":
        variant === "ghost",
      "text-indigo-600 underline-offset-4 hover:underline":
        variant === "link",
    },
    {
      "h-9 px-4 py-2": size === "default",
      "h-8 rounded-lg px-3 text-xs": size === "sm",
      "h-11 rounded-xl px-8 text-base": size === "lg",
      "h-9 w-9 rounded-xl": size === "icon",
    },
    className
  );
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
