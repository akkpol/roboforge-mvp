import { cn } from "@/lib/utils";

export function Section({ children, className, title }: { children: React.ReactNode; className?: string; title: string }) {
  return (
    <section className={cn("border-t border-slate-200/80 py-6", className)}>
      <h2 className="mb-4 text-lg font-bold text-slate-950">{title}</h2>
      {children}
    </section>
  );
}

export function SectionRow({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("flex min-h-14 items-center gap-4 border-b border-slate-100 py-3 last:border-b-0", className)}>{children}</div>;
}
