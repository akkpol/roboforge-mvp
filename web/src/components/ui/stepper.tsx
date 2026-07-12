import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type StepperItem = {
  id: string;
  label: string;
  state: "active" | "complete" | "upcoming";
};

export function Stepper({ items }: { items: readonly StepperItem[] }) {
  return (
    <ol aria-label="ขั้นตอนการตั้งค่า" className="grid gap-3">
      {items.map((item, index) => (
        <li className="flex items-start gap-3" key={item.id}>
          <span
            aria-hidden="true"
            className={cn(
              "grid size-8 place-items-center rounded-full border text-xs font-bold",
              item.state === "active" && "border-blue-600 bg-blue-600 text-white",
              item.state === "complete" && "border-emerald-500 bg-emerald-500 text-white",
              item.state === "upcoming" && "border-slate-300 bg-white text-slate-600",
            )}
          >
            {item.state === "complete" ? <Check className="size-4" /> : index + 1}
          </span>
          <div className="pt-1">
            <p className={cn("font-semibold", item.state === "upcoming" ? "text-slate-600" : "text-slate-900")}>{item.label}</p>
            <p className="text-xs text-slate-500">
              {item.state === "active" ? "กำลังดำเนินการ" : item.state === "complete" ? "เสร็จแล้ว" : "รออยู่"}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
