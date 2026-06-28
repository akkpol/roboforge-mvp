import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva("rf-button", {
  defaultVariants: {
    size: "default",
    variant: "primary",
  },
  variants: {
    size: {
      default: "rf-button--default",
      icon: "rf-button--icon",
      sm: "rf-button--sm",
    },
    variant: {
      ghost: "rf-button--ghost",
      primary: "rf-button--primary",
      secondary: "rf-button--secondary",
      warm: "rf-button--warm",
    },
  },
});

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
