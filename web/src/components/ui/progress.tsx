import * as React from "react";
import { cn } from "@/lib/utils";

function Progress({
  className,
  value = 0,
  ...props
}: React.ComponentProps<"div"> & {
  value?: number;
}) {
  const safeValue = Math.max(0, Math.min(100, value));

  return (
    <div
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={safeValue}
      className={cn("rf-progress", className)}
      data-slot="progress"
      role="progressbar"
      {...props}
    >
      <span style={{ inlineSize: `${safeValue}%` }} />
    </div>
  );
}

export { Progress };
