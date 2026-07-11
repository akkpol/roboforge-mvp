"use client";

import { useEffect, useRef, type MouseEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type DialogProps = {
  children: ReactNode;
  className?: string;
  labelledBy: string;
  onOpenChange: (open: boolean) => void;
  open: boolean;
};

export function Dialog({ children, className, labelledBy, onOpenChange, open }: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      dialog.showModal();
    }
    if (!open && dialog.open) {
      dialog.close();
      openerRef.current?.focus();
    }
    return () => {
      if (dialog.open) dialog.close();
      openerRef.current?.focus();
    };
  }, [open]);

  function closeFromBackdrop(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget) onOpenChange(false);
  }

  return (
    <dialog
      aria-labelledby={labelledBy}
      className={cn(
        "m-auto max-h-dvh w-full max-w-xl overflow-hidden rounded-3xl border border-white/70 bg-white/95 p-0 text-slate-950 shadow-2xl backdrop:bg-slate-950/35 backdrop:backdrop-blur-sm",
        className,
      )}
      onCancel={(event) => {
        event.preventDefault();
        onOpenChange(false);
      }}
      onClick={closeFromBackdrop}
      ref={dialogRef}
    >
      {children}
    </dialog>
  );
}
