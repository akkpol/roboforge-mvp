import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/20 disabled:pointer-events-none disabled:opacity-50",
  {
  defaultVariants: {
    size: "default",
    variant: "primary",
  },
  variants: {
    size: {
      default: "min-h-12",
      icon: "size-11 px-0",
      sm: "min-h-10 rounded-xl px-4 text-xs",
    },
    variant: {
      ghost: "bg-transparent text-slate-600 hover:bg-white/70 hover:text-slate-950",
      primary: "bg-brand text-white shadow-lg shadow-brand/20 hover:brightness-90",
      secondary: "border border-brand/20 bg-white/80 text-brand hover:bg-app-wash",
      warm: "bg-amber-400 text-amber-950 shadow-lg shadow-amber-400/20 hover:bg-amber-300",
    },
    },
  },
);

function Button({
  asChild = false,
  className,
  size,
  variant,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      className={cn(buttonVariants({ className, size, variant }))}
      data-slot="button"
      {...props}
    />
  );
}

export { Button, buttonVariants };
