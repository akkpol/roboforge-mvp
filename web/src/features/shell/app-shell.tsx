"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Bell, Bot, Coffee, Flag, Home, MessageCircle, Settings, ShoppingBag, UserRound, Wrench, X } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const LyraDialog = dynamic(() => import("@/features/support/lyra-dialog"), { ssr: false });

const NAV_ITEMS = [
  { href: "/", icon: Home, id: "home", label: "หน้าหลัก", ready: true },
  { icon: Flag, id: "missions", label: "ภารกิจ", ready: false },
  { icon: Wrench, id: "engineer", label: "วิศวกร", ready: false },
  { icon: ShoppingBag, id: "store", label: "ร้านค้า", ready: false },
  { href: "/profile", icon: UserRound, id: "profile", label: "โปรไฟล์", ready: true },
] as const;

type AppShellProps = {
  active: "connect" | "home" | "profile";
  children: React.ReactNode;
  isAuthenticated?: boolean;
};

export function AppShell({ active, children, isAuthenticated = false }: AppShellProps) {
  const [lyraOpen, setLyraOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  return (
    <div className="relative min-h-dvh overflow-x-clip pb-24 lg:pb-0">
      <Image alt="" className="pointer-events-none fixed inset-0 -z-20 size-full object-cover opacity-30" fill priority sizes="100vw" src="/assets/lumina/garage-background-wide.png" />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-b from-white/80 via-app-wash/85 to-app-wash/95" />
      <header className="sticky top-0 z-40 border-b border-white/70 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-5 px-4 sm:px-6 lg:px-8">
          <Link aria-label="RoboForge home" className="flex items-center gap-2 font-bold tracking-wide text-slate-950" href="/"><span className="grid size-9 place-items-center rounded-xl bg-brand text-white"><Bot className="size-5" /></span><span>ROBOFORGE</span></Link>
          <nav aria-label="เมนูหลัก" className="hidden flex-1 items-stretch justify-center lg:flex">
            {NAV_ITEMS.map((item) => item.ready && item.href ? <Link aria-current={active === item.id ? "page" : undefined} className={cn("flex min-w-24 items-center justify-center gap-2 border-b-2 px-3 text-sm font-semibold", active === item.id ? "border-brand text-brand" : "border-transparent text-slate-600 hover:text-slate-950")} href={item.href} key={item.id}><item.icon className="size-4" />{item.label}</Link> : <button aria-disabled="true" className="flex min-w-24 items-center justify-center gap-2 border-b-2 border-transparent px-3 text-sm font-semibold text-slate-400" disabled key={item.id} type="button"><item.icon className="size-4" /><span>{item.label}</span><span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-xs font-normal text-slate-600">เร็ว ๆ นี้</span></button>)}
          </nav>
          <div className="ml-auto flex items-center gap-1">
            <Button aria-label="คุยกับ Lyra" onClick={() => setLyraOpen(true)} size="sm" variant="ghost"><MessageCircle className="size-4" /><span className="hidden sm:inline">คุยกับ Lyra</span></Button>
            <Button aria-label="เลี้ยงกาแฟผู้พัฒนา" onClick={() => setSupportOpen(true)} size="icon" variant="ghost"><Coffee className="size-5" /></Button>
            <Button aria-label="การแจ้งเตือน เร็ว ๆ นี้" aria-disabled="true" disabled size="icon" variant="ghost"><Bell className="size-5" /></Button>
            <div className="relative">
              <Button aria-expanded={settingsOpen} aria-label="ตั้งค่า" onClick={() => setSettingsOpen((value) => !value)} size="icon" variant="ghost"><Settings className="size-5" /></Button>
              {settingsOpen ? <div className="absolute right-0 top-12 w-64 rounded-2xl border border-white bg-white p-3 shadow-xl"><label className="block text-xs font-semibold text-slate-500" htmlFor="theme-select">ธีม</label><select className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" id="theme-select" onChange={(event) => setTheme(event.target.value)} value={theme || "lumina"}>{["lumina", "mint", "peach", "lavender", "sky", "light"].map((value) => <option key={value} value={value}>{value}</option>)}</select>{isAuthenticated ? <Link className="mt-2 block rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" href="/auth/sign-out">ออกจากระบบ</Link> : null}</div> : null}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>

      <nav aria-label="เมนูหลักบนมือถือ" className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-5 rounded-2xl border border-white/80 bg-white/95 p-1.5 shadow-xl backdrop-blur lg:hidden">
        {NAV_ITEMS.map((item) => item.ready && item.href ? <Link aria-current={active === item.id ? "page" : undefined} className={cn("grid min-h-14 place-items-center rounded-xl text-xs font-semibold", active === item.id ? "bg-app-wash text-brand" : "text-slate-500")} href={item.href} key={item.id}><item.icon className="size-5" /><span>{item.label}</span></Link> : <button aria-disabled="true" className="grid min-h-16 place-items-center rounded-xl text-xs font-semibold text-slate-400" disabled key={item.id} type="button"><item.icon className="size-5" /><span>{item.label}</span><span className="font-normal text-slate-500">เร็ว ๆ นี้</span></button>)}
      </nav>

      {lyraOpen ? <LyraDialog isAuthenticated={isAuthenticated} onOpenChange={setLyraOpen} open={lyraOpen} /> : null}
      <Dialog labelledBy="support-title" onOpenChange={setSupportOpen} open={supportOpen}><div className="p-6 text-center" onClick={(event) => event.stopPropagation()}><Button aria-label="ปิด" className="ml-auto" onClick={() => setSupportOpen(false)} size="icon" variant="ghost"><X className="size-5" /></Button><Coffee className="mx-auto size-10 text-amber-500" /><h2 className="mt-3 text-2xl font-bold" id="support-title">เลี้ยงกาแฟผู้พัฒนา</h2><p className="mt-2 text-sm text-slate-600">ขอบคุณที่สนับสนุนการพัฒนา RoboForge</p><Image alt="QR Code เลี้ยงกาแฟผู้พัฒนา" className="mx-auto mt-5 size-72 max-w-full rounded-2xl" height={280} src="/assets/qr-coffee.jpg" width={280} /><Button asChild className="mt-5" variant="warm"><a download="roboforge-coffee-qr.jpg" href="/assets/qr-coffee.jpg">ดาวน์โหลด QR</a></Button></div></Dialog>
    </div>
  );
}
