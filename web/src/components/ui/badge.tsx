import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("rf-badge", {
  defaultVariants: {
    variant: "soft",
  },
  variants: {
    variant: {
      lavender: "rf-badge--lavender",
      mint: "rf-badge--mint",
      peach: "rf-badge--peach",
      soft: "rf-badge--soft",
    },
  },
});

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span
      className={cn(badgeVariants({ className, variant }))}
      data-slot="badge"
      {...props}
    />
  );
}

export { Badge, badgeVariants };
