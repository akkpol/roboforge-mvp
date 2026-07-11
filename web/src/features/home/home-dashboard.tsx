import Image from "next/image";
import Link from "next/link";
import { BatteryCharging, Cable, CheckCircle2, ChevronRight, Circle, Cpu, Flag, Gauge, Radio, Usb, Wifi, Wrench } from "lucide-react";
import { AppShell } from "@/features/shell/app-shell";
import { Button } from "@/components/ui/button";
import { Section, SectionRow } from "@/components/ui/section";
import { Status } from "@/components/ui/status";
import { Stepper } from "@/components/ui/stepper";

const hardware = [
  { detail: "ESP32 DevKit/WROOM", icon: Cpu, label: "บอร์ดควบคุม" },
  { detail: "สายที่ส่งข้อมูลได้", icon: Usb, label: "สาย USB data" },
  { detail: "L298N + มอเตอร์ 4 ตัว", icon: Wrench, label: "ชุดขับเคลื่อน" },
  { detail: "2S 18650 พร้อม BMS", icon: BatteryCharging, label: "แหล่งจ่ายไฟ" },
] as const;

type HomeDashboardProps = {
  isConnected: boolean;
  justConnected: boolean;
  userName: string | null;
};

export function HomeDashboard({ isConnected, justConnected, userName }: HomeDashboardProps) {
  const greeting = isConnected ? `ยินดีต้อนรับ${userName ? ` ${userName}` : ""}` : "Rover ของคุณยังไม่ได้เชื่อมต่อ";
  return (
    <AppShell active="home" isAuthenticated={isConnected}>
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="overflow-hidden rounded-3xl border border-white/80 bg-white/90 shadow-xl shadow-blue-950/5 lg:col-span-2">
          <section className="relative isolate min-h-96 overflow-hidden p-6 sm:p-8 lg:p-10" aria-labelledby="home-task-title">
            <Image alt="" className="-z-20 object-cover opacity-75" fill priority sizes="(min-width: 1024px) 65vw, 100vw" src="/assets/lumina/garage-background-wide.png" />
            <div className="absolute inset-0 -z-10 bg-gradient-to-r from-white via-white/90 to-white/20" />
            <div className="relative z-10 max-w-md">
              <Status tone={isConnected ? "ready" : "danger"}>{isConnected ? "บัญชีพร้อม" : "ยังไม่ได้เชื่อมต่อ"}</Status>
              <p className="mt-5 text-sm font-semibold text-blue-700">{justConnected ? "เชื่อมต่อบัญชีสำเร็จ" : greeting}</p>
              <h1 className="mt-2 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl" id="home-task-title">เชื่อมต่อ Rover</h1>
              <p className="mt-4 text-base leading-7 text-slate-600">ติดตั้ง MicroPython และ RoboForge Agent แล้วเชื่อมต่อ Rover ให้พร้อมควบคุมจากมือถือ</p>
              <ul className="mt-6 grid gap-2 text-sm text-slate-700"><li className="flex items-center gap-2"><Cable className="size-4 text-blue-600" />ใช้คอม Chrome/Edge และสาย USB data</li><li className="flex items-center gap-2"><Radio className="size-4 text-blue-600" />หลังติดตั้ง ใช้มือถือเชื่อมต่อ Wi-Fi ของ Rover</li></ul>
              <Button asChild className="mt-7 w-full sm:w-auto"><Link href="/connect"><Cable className="size-4" />เชื่อมต่อ Rover<ChevronRight className="size-4" /></Link></Button>
            </div>
            <Image alt="Rover-01 พร้อมเชื่อมต่อ" className="absolute bottom-0 right-0 z-0 w-72 translate-x-10 sm:w-96" height={900} priority sizes="(min-width: 1024px) 32rem, 20rem" src="/assets/lumina/rover-v3-cutout.png" width={1365} />
          </section>

          <div className="px-5 sm:px-8">
            <Section title="ความพร้อมของฮาร์ดแวร์">
              {hardware.map(({ detail, icon: Icon, label }) => <SectionRow key={label}><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700"><Icon className="size-5" /></span><div className="min-w-0 flex-1"><p className="font-semibold text-slate-900">{label}</p><p className="text-sm text-slate-500">{detail}</p></div><Status tone="ready">พร้อม</Status></SectionRow>)}
            </Section>
            <Section title="ภารกิจปัจจุบัน"><SectionRow><span className="grid size-12 place-items-center rounded-2xl bg-violet-50 text-violet-700"><Flag className="size-6" /></span><div className="min-w-0 flex-1"><p className="font-semibold text-slate-900">ขับ Rover ครั้งแรก</p><p className="text-sm text-slate-500">เตรียมอุปกรณ์ ติดตั้ง และเชื่อมต่อให้ครบ</p></div><span className="text-sm font-semibold text-slate-500">0/4 ขั้นตอน</span></SectionRow></Section>
            <Section title="หุ่นยนต์ของฉัน"><SectionRow><Image alt="Rover-01" className="h-14 w-20 object-contain" height={90} src="/assets/lumina/rover-v3-cutout.png" width={136} /><div className="flex-1"><p className="font-semibold text-slate-900">Rover-01</p><p className="text-sm text-slate-500">ESP32 Rover</p></div><Status tone={isConnected ? "ready" : "danger"}>{isConnected ? "พร้อม" : "ออฟไลน์"}</Status></SectionRow><button className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-blue-700" type="button"><Circle className="size-4" />เพิ่ม Rover</button></Section>
          </div>
        </div>

        <aside className="grid content-start gap-5">
          <section className="rounded-3xl border border-white/80 bg-white/90 p-6 shadow-xl shadow-blue-950/5"><h2 className="text-lg font-bold text-slate-950">ความคืบหน้าเส้นทางของคุณ</h2><div className="mt-5"><Stepper items={[{ id: "prepare", label: "เตรียมฮาร์ดแวร์", state: "active" }, { id: "install", label: "ติดตั้ง Firmware", state: "upcoming" }, { id: "connect", label: "เชื่อมต่อ Rover", state: "upcoming" }, { id: "drive", label: "ควบคุมผ่านมือถือ", state: "upcoming" }]} /></div><Link className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-blue-700" href="/connect">ดูเส้นทางทั้งหมด<ChevronRight className="size-4" /></Link></section>
          <section className="relative overflow-hidden rounded-3xl border border-white/80 bg-violet-50/90 p-6 shadow-xl shadow-blue-950/5"><div className="relative z-10 max-w-52"><h2 className="text-lg font-bold text-slate-950">Lyra พร้อมช่วยคุณ</h2><p className="mt-2 text-sm leading-6 text-slate-600">ถามเรื่องอุปกรณ์ การติดตั้ง และการแก้ปัญหาได้ตลอดเส้นทาง</p></div><Image alt="Lyra ผู้ช่วย RoboForge" className="absolute bottom-0 right-0 h-full w-44 object-contain object-bottom" height={420} sizes="11rem" src="/assets/lumina/lyra-guide-thigh-up.png" width={320} /></section>
          <section className="rounded-3xl border border-white/80 bg-white/90 p-5"><div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-2xl bg-slate-100 text-slate-700"><Gauge className="size-5" /></span><div><p className="font-semibold text-slate-900">สำหรับนักพัฒนา</p><a className="text-sm font-semibold text-blue-700" href="https://akkapol-systems.vercel.app" rel="noreferrer" target="_blank">เอกสารและผู้พัฒนา</a></div></div></section>
          <div className="sr-only" aria-live="polite"><CheckCircle2 />{isConnected ? "บัญชีเชื่อมต่อแล้ว" : "ยังไม่ได้เข้าสู่ระบบ"}<Wifi /></div>
          <p className="text-center text-xs font-semibold text-slate-600">Missions · Engineer · Store — เร็ว ๆ นี้</p>
        </aside>
      </div>
    </AppShell>
  );
}
