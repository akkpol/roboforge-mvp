import { CheckCircle2, CircleAlert, CircleDashed, CircleX } from "lucide-react";
import { cn } from "@/lib/utils";

type StatusTone = "danger" | "muted" | "ready" | "warning";

const statusStyles: Record<StatusTone, string> = {
  danger: "bg-rose-50 text-rose-700",
  muted: "bg-slate-100 text-slate-600",
  ready: "bg-emerald-50 text-emerald-700",
  warning: "bg-amber-50 text-amber-700",
};

const statusIcons = {
  danger: CircleX,
  muted: CircleDashed,
  ready: CheckCircle2,
  warning: CircleAlert,
};

export function Status({ children, className, tone = "muted" }: { children: React.ReactNode; className?: string; tone?: StatusTone }) {
  const Icon = statusIcons[tone];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold", statusStyles[tone], className)}>
      <Icon aria-hidden="true" className="size-3.5" />
      {children}
    </span>
  );
}
