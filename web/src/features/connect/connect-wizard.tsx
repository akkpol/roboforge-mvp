"use client";

import { createElement, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Clipboard, FileCode2, Laptop, RotateCcw, Router, Usb, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Status } from "@/components/ui/status";
import { Stepper, type StepperItem } from "@/components/ui/stepper";
import { AppShell } from "@/features/shell/app-shell";
import {
  MICROPYTHON_AGENT_FILES,
  MICROPYTHON_RUNTIME_MANIFEST_URL,
  buildMicroPythonFileWriteCommands,
  createRobotId,
} from "./protocol";
import {
  SETUP_STEPS,
  createSetupState,
  parseSetupProgress,
  reduceSetupState,
  serializeSetupProgress,
  type SetupStepId,
} from "./setup-state";

const STORAGE_KEY = "roboforge-setup-progress-v1";
const STEP_LABELS: Record<SetupStepId, string> = {
  agent: "อัปโหลด RoboForge Agent",
  handoff: "เชื่อมต่อผ่าน Wi-Fi",
  prepare: "เตรียมอุปกรณ์",
  runtime: "ติดตั้ง MicroPython",
};

type SerialPortLike = {
  close: () => Promise<void>;
  open: (options: { baudRate: number }) => Promise<void>;
  readable?: ReadableStream<Uint8Array> | null;
  writable?: WritableStream<Uint8Array> | null;
};

type NavigatorWithSerial = Navigator & {
  serial?: { requestPort: () => Promise<SerialPortLike> };
};

function delay(milliseconds: number) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

function readStoredProgress() {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function persistProgress(progress: ReturnType<typeof createSetupState>["progress"]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, serializeSetupProgress(progress));
  } catch {
    // Setup remains usable when storage is blocked or full.
  }
}

async function writeSerialText(port: SerialPortLike, text: string) {
  const writer = port.writable?.getWriter();
  if (!writer) throw new Error("ไม่พบช่องทางเขียนข้อมูลผ่าน USB");
  try {
    await writer.write(new TextEncoder().encode(text));
  } finally {
    writer.releaseLock();
  }
}

class SerialReplyMonitor {
  private readonly decoder = new TextDecoder();
  private readonly reader: ReadableStreamDefaultReader<Uint8Array>;
  private readonly waiters = new Set<() => void>();
  private buffer = "";
  private done = false;
  private error: Error | null = null;
  private readonly pumpPromise: Promise<void>;

  constructor(readable: ReadableStream<Uint8Array>) {
    this.reader = readable.getReader();
    this.pumpPromise = this.pump();
  }

  private notify() {
    for (const waiter of this.waiters) waiter();
    this.waiters.clear();
  }

  private async pump() {
    try {
      while (true) {
        const { done, value } = await this.reader.read();
        if (done) break;
        this.buffer += this.decoder.decode(value, { stream: true });
        this.notify();
      }
      this.buffer += this.decoder.decode();
    } catch (caught) {
      this.error = caught instanceof Error ? caught : new Error("อ่านข้อมูลจาก ESP32 ไม่สำเร็จ");
    } finally {
      this.done = true;
      this.notify();
    }
  }

  async waitFor(expected: string, timeoutMs = 4_000) {
    const deadline = Date.now() + timeoutMs;
    while (true) {
      const index = this.buffer.indexOf(expected);
      if (index >= 0) {
        this.buffer = this.buffer.slice(index + expected.length);
        return;
      }
      if (this.error) throw this.error;
      if (this.done) throw new Error(`ESP32 ปิดการเชื่อมต่อก่อนยืนยัน ${expected}`);

      const remaining = deadline - Date.now();
      if (remaining <= 0) throw new Error(`ไม่ได้รับการยืนยันจาก ESP32: ${expected}`);
      await new Promise<void>((resolve, reject) => {
        const wake = () => {
          window.clearTimeout(timer);
          resolve();
        };
        const timer = window.setTimeout(() => {
          this.waiters.delete(wake);
          reject(new Error(`ไม่ได้รับการยืนยันจาก ESP32: ${expected}`));
        }, remaining);
        this.waiters.add(wake);
      });
    }
  }

  async close() {
    try {
      await this.reader.cancel();
      await this.pumpPromise;
    } finally {
      this.reader.releaseLock();
    }
  }
}

async function writeAcknowledgedCommand(
  port: SerialPortLike,
  monitor: SerialReplyMonitor,
  command: { acknowledgment: string; text: string },
) {
  await writeSerialText(port, command.text);
  await monitor.waitFor(command.acknowledgment);
  await monitor.waitFor(">>>");
}

export function ConnectWizard({ isAuthenticated }: { isAuthenticated: boolean }) {
  const [setup, setSetup] = useState(() => createSetupState("rf-rover"));
  const [hydrated, setHydrated] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const fallbackRobotId = createRobotId();
    const progress = parseSetupProgress(readStoredProgress(), fallbackRobotId);
    setSetup(createSetupState(progress.robotId, progress));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) persistProgress(setup.progress);
  }, [hydrated, setup.progress]);

  useEffect(() => {
    if (setup.step !== "runtime") return;
    if (document.querySelector('script[data-rf-esp-tools="true"]')) return;
    const script = document.createElement("script");
    script.dataset.rfEspTools = "true";
    script.src = "https://unpkg.com/esp-web-tools@10/dist/web/install-button.js?module";
    script.type = "module";
    document.body.appendChild(script);
  }, [setup.step]);

  function succeed(step: SetupStepId) {
    setSetup((current) => reduceSetupState(current, { step, type: "succeed" }));
  }

  function resetProgress() {
    const next = createSetupState(createRobotId());
    setSetup(next);
    persistProgress(next.progress);
  }

  async function copyDesktopLink() {
    await navigator.clipboard?.writeText("https://roboforge.app/connect");
  }

  async function uploadAgent() {
    const serial = (navigator as NavigatorWithSerial).serial;
    if (!serial) {
      setSetup((current) => reduceSetupState(current, {
        message: "Web Serial ใช้งานได้บน Chrome หรือ Edge desktop เท่านั้น",
        type: "unsupported",
      }));
      return;
    }

    setUploading(true);
    setSetup((current) => reduceSetupState(current, { type: "retry" }));
    let port: SerialPortLike | null = null;
    let monitor: SerialReplyMonitor | null = null;
    try {
      const files = await Promise.all(MICROPYTHON_AGENT_FILES.map(async (file) => {
        const response = await fetch(file.sourceUrl);
        if (!response.ok) throw new Error(`ดาวน์โหลด ${file.devicePath} ไม่สำเร็จ`);
        return { ...file, source: await response.text() };
      }));

      port = await serial.requestPort();
      await port.open({ baudRate: 115200 });
      if (!port.readable) throw new Error("ไม่พบช่องทางอ่านข้อมูลตอบกลับจาก ESP32");
      monitor = new SerialReplyMonitor(port.readable);
      await writeSerialText(port, "\x03\x03\r\n");
      await monitor.waitFor(">>>");
      for (const file of files) {
        const upload = buildMicroPythonFileWriteCommands(file.devicePath, file.source);
        for (const command of upload.commands) {
          await writeAcknowledgedCommand(port, monitor, command);
        }
      }
      await writeSerialText(port, "import machine\r\nmachine.reset()\r\n");
      await delay(300);
      await monitor.close();
      monitor = null;
      await port.close();
      port = null;
      succeed("agent");
    } catch (caught) {
      if (monitor) {
        try { await monitor.close(); } catch { /* Reader may already be closed. */ }
      }
      if (port) {
        try { await port.close(); } catch { /* Port may already be closed. */ }
      }
      setSetup((current) => reduceSetupState(current, {
        message: caught instanceof Error ? caught.message : "อัปโหลด Agent ไม่สำเร็จ กด EN/RST แล้วลองใหม่",
        type: "fail",
      }));
    } finally {
      setUploading(false);
    }
  }

  const stepperItems: StepperItem[] = SETUP_STEPS.map((step) => ({
    id: step,
    label: STEP_LABELS[step],
    state: setup.progress.completed.includes(step) ? "complete" : setup.step === step ? "active" : "upcoming",
  }));

  return (
    <AppShell active="connect" isAuthenticated={isAuthenticated}>
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div><p className="text-sm font-semibold text-blue-700">Setup · {setup.progress.robotId}</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">ตั้งค่า Rover ทีละขั้น</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">ใช้คอมติดตั้งครั้งแรก แล้วส่งต่อไปควบคุมผ่านมือถือโดยไม่ต้องจัดการไฟล์หรือคำสั่งเอง</p></div>
          <Button onClick={resetProgress} size="sm" variant="ghost"><RotateCcw className="size-4" />เริ่มใหม่</Button>
        </header>

        <div className="grid gap-5 lg:grid-cols-3">
          <section className="rounded-3xl border border-white/80 bg-white/95 p-5 shadow-xl shadow-blue-950/5 sm:p-8 lg:col-span-2" aria-live="polite">
            <div className="mb-6 flex items-center justify-between gap-3"><Status tone={setup.status === "error" ? "danger" : setup.status === "unsupported" ? "warning" : setup.status === "success" ? "ready" : "muted"}>ขั้นตอน {Math.min(SETUP_STEPS.indexOf(setup.step) + 1, 4)}/4</Status><span className="text-sm font-semibold text-slate-500">{STEP_LABELS[setup.step]}</span></div>

            {setup.step === "prepare" ? <div><span className="grid size-14 place-items-center rounded-2xl bg-blue-50 text-blue-700"><Laptop className="size-7" /></span><h2 className="mt-5 text-2xl font-bold text-slate-950">เตรียมอุปกรณ์</h2><p className="mt-2 text-sm leading-6 text-slate-600">ตรวจสอบสามอย่างนี้ก่อนเริ่ม เพื่อไม่ให้การติดตั้งหยุดกลางทาง</p><ul className="mt-6 divide-y divide-slate-100 rounded-2xl border border-slate-200">{[[Usb, "สาย USB data ที่ส่งข้อมูลได้"], [Laptop, "คอมที่ใช้ Chrome หรือ Edge"], [CheckCircle2, "ESP32 DevKit/WROOM"]].map(([Icon, label]) => <li className="flex items-center gap-3 p-4 text-sm font-semibold text-slate-800" key={String(label)}><Icon className="size-5 text-emerald-600" />{String(label)}</li>)}</ul><Button className="mt-7 w-full sm:w-auto" onClick={() => succeed("prepare")}><CheckCircle2 className="size-4" />พร้อม เริ่มติดตั้ง</Button></div> : null}

            {setup.step === "runtime" ? <div><span className="grid size-14 place-items-center rounded-2xl bg-violet-50 text-violet-700"><Router className="size-7" /></span><h2 className="mt-5 text-2xl font-bold text-slate-950">ติดตั้ง MicroPython</h2><p className="mt-2 text-sm leading-6 text-slate-600">เสียบ ESP32 แล้วเปิด installer จากปุ่มด้านล่าง เลือกพอร์ตและรอจนเสร็จ</p><div className="mt-6 rounded-2xl border border-violet-100 bg-violet-50 p-5">{createElement("esp-web-install-button", { manifest: MICROPYTHON_RUNTIME_MANIFEST_URL } as Record<string, string>)}</div><Button className="mt-6" onClick={() => succeed("runtime")} variant="secondary"><CheckCircle2 className="size-4" />ติดตั้ง MicroPython เสร็จแล้ว</Button></div> : null}

            {setup.step === "agent" ? <div><span className="grid size-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-700"><FileCode2 className="size-7" /></span><h2 className="mt-5 text-2xl font-bold text-slate-950">อัปโหลด RoboForge Agent</h2><p className="mt-2 text-sm leading-6 text-slate-600">ระบบจะอัปโหลด boot.py, main.py และ WebSocket libraries ผ่าน USB แล้วรีสตาร์ตบอร์ด</p><div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">อนุญาตเลือกพอร์ตเมื่อ browser ถาม และอย่าถอดสายจนกว่าจะเสร็จ</div>{setup.message ? <div className={setup.status === "unsupported" ? "mt-5 rounded-2xl bg-amber-50 p-4 text-sm text-amber-800" : "mt-5 rounded-2xl bg-rose-50 p-4 text-sm text-rose-700"} role="alert"><p className="font-semibold">{setup.message}</p>{setup.status === "unsupported" ? <Button className="mt-3" onClick={() => void copyDesktopLink()} size="sm" variant="secondary"><Clipboard className="size-4" />คัดลอกลิงก์ไปคอม</Button> : null}</div> : null}<Button className="mt-6 w-full sm:w-auto" disabled={uploading} onClick={() => void uploadAgent()}><FileCode2 className="size-4" />{uploading ? "กำลังอัปโหลด…" : setup.status === "error" ? "ลองอัปโหลดอีกครั้ง" : "อัปโหลด Agent"}</Button></div> : null}

            {setup.step === "handoff" ? <div><span className="grid size-14 place-items-center rounded-2xl bg-cyan-50 text-cyan-700"><Wifi className="size-7" /></span><h2 className="mt-5 text-2xl font-bold text-slate-950">เชื่อมต่อผ่าน Wi-Fi</h2><p className="mt-2 text-sm leading-6 text-slate-600">ถอด USB รอให้ Rover สร้าง Wi-Fi แล้วทำตามลำดับนี้บนมือถือ</p><ol className="mt-6 grid gap-3">{["เชื่อมต่อ Wi-Fi Rover-XXXX ด้วยรหัส 12345678", "เปิด http://192.168.4.1", "ตั้งค่า hotspot 2.4GHz แล้วเริ่มควบคุม"].map((label, index) => <li className="flex gap-3 rounded-2xl border border-slate-200 p-4 text-sm text-slate-700" key={label}><span className="grid size-7 shrink-0 place-items-center rounded-full bg-blue-600 font-bold text-white">{index + 1}</span>{label}</li>)}</ol>{setup.status === "success" ? <div className="mt-6 rounded-2xl bg-emerald-50 p-5"><p className="font-bold text-emerald-800">Setup เสร็จแล้ว</p><Button asChild className="mt-3"><Link href="/">กลับหน้าหลัก</Link></Button></div> : <Button className="mt-6" onClick={() => succeed("handoff")}><CheckCircle2 className="size-4" />ตั้งค่าเสร็จแล้ว</Button>}</div> : null}
          </section>

          <aside className="grid content-start gap-5">
            <section className="rounded-3xl border border-white/80 bg-white/95 p-6 shadow-xl shadow-blue-950/5"><h2 className="text-lg font-bold text-slate-950">เส้นทาง Setup</h2><div className="mt-5"><Stepper items={stepperItems} /></div></section>
            <section className="rounded-3xl border border-blue-100 bg-blue-50/90 p-5"><p className="font-bold text-slate-950">ครั้งแรกใช้คอม หลังจากนั้นใช้มือถือ</p><p className="mt-2 text-sm leading-6 text-slate-600">รหัส Wi-Fi จะถูกส่งตรงให้ ESP32 และไม่ถูกเก็บใน browser</p></section>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
