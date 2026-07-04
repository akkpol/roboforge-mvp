"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

type LyraChatCtx = { open: boolean; setOpen: (v: boolean) => void; toggle: () => void };

const Ctx = createContext<LyraChatCtx>({ open: false, setOpen: () => {}, toggle: () => {} });

export function LyraChatProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const toggle = () => setOpen((p) => !p);
  return <Ctx.Provider value={{ open, setOpen, toggle }}>{children}</Ctx.Provider>;
}

export function useLyraChat() {
  return useContext(Ctx);
}
