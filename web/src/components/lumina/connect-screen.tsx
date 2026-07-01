"use client";

import { createElement, useEffect, useState } from "react";
import {
  CheckCircle2,
  FileCode2,
  Laptop,
  Send,
  Smartphone,
  Usb,
  Wifi,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BottomNav } from "./bottom-nav";
import { ConnectionProgress } from "./connection-progress";
import { LyraTip } from "./lyra-tip";
import { TopBar } from "./top-bar";
import {
  MICROPYTHON_AGENT_FILES,
  MICROPYTHON_RUNTIME_MANIFEST_URL,
  buildMicroPythonFileWriteCommand,
  createRobotId,
} from "./connect-protocol";

const STORAGE_KEY = "roboforge-connect-profile";

type InstallState = "agentUploading" | "idle" | "ready" | "runtimeReady" | "unsupported";

type SerialPortLike = {
  close: () => Promise<void>;
  open: (options: { baudRate: number }) => Promise<void>;
  writable?: WritableStream<Uint8Array> | null;
};

type NavigatorWithSerial = Navigator & {
  serial?: {
    requestPort: () => Promise<SerialPortLike>;
  };
};

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function writeSerialText(port: SerialPortLike, text: string) {
  const writer = port.writable?.getWriter();
  if (!writer) {
    throw new Error("Serial writer is not available");
  }
  await writer.write(new TextEncoder().encode(text));
  writer.releaseLock();
}

export function ConnectScreen() {
  const [installState, setInstallState] = useState<InstallState>("idle");
  const [lyraMessage, setLyraMessage] = useState(
    "เสียบ ESP32 ผ่าน USB แล้วทำตามขั้นตอนด้านล่าง หลังจากนั้นใช้มือถือต่อ WiFi \"Rover-XXXX\" แล้วเปิด 192.168.4.1",
  );
  const [robotId, setRobotId] = useState("rf-rover");

  useEffect(() => {
    if (typeof window === "undefined") return;

    window.setTimeout(() => {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (!saved) {
        setRobotId(createRobotId());
        return;
      }
      try {
        const parsed = JSON.parse(saved) as { robotId?: string };
        if (parsed.robotId) setRobotId(parsed.robotId);
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
        setRobotId(createRobotId());
      }
    }, 0);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ robotId }));
  }, [robotId]);

  // Load esp-web-tools web component
  useEffect(() => {
    if (typeof window === "undefined") return;
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-rf-esp-tools="true"]',
    );
    if (existing) return;
    const script = document.createElement("script");
    script.type = "module";
    script.dataset.rfEspTools = "true";
    script.src =
      "https://unpkg.com/esp-web-tools@10/dist/web/install-button.js?module";
    document.body.appendChild(script);
  }, []);

  async function uploadMicroPythonAgent() {
    const serial = typeof navigator !== "undefined"
      ? (navigator as NavigatorWithSerial).serial
      : undefined;
    if (!serial) {
      setInstallState("unsupported");
      setLyraMessage(
        "เครื่องนี้ยังไม่รองรับ Web Serial — ใช้ Chrome หรือ Edge desktop แทน",
      );
      return;
    }

    setInstallState("agentUploading");
    setLyraMessage(
      "กำลังอัปโหลด boot.py, main.py และ MicroWebSrv libraries เข้า MicroPython ผ่าน USB",
    );

    let port: SerialPortLike | null = null;
    try {
      const files = await Promise.all(
        MICROPYTHON_AGENT_FILES.map(async (file) => ({
          ...file,
          source: await fetch(file.sourceUrl).then((response) => {
            if (!response.ok)
              throw new Error(`Cannot fetch ${file.sourceUrl}`);
            return response.text();
          }),
        })),
      );

      port = await serial.requestPort();
      await port.open({ baudRate: 115200 });
      await writeSerialText(port, "\x03\x03\r\n");
      await delay(500);

      for (const file of files) {
        await writeSerialText(
          port,
          buildMicroPythonFileWriteCommand(file.devicePath, file.source),
        );
        await delay(900);
      }

      await writeSerialText(port, "import machine\r\nmachine.reset()\r\n");
      await port.close();
      setInstallState("runtimeReady");
      setLyraMessage(
        "✅ อัปโหลดสำเร็จ! ถอด USB — ESP32 จะสร้าง WiFi \"Rover-XXXX\" (รหัส 12345678) — ต่อ WiFi แล้วเปิด 192.168.4.1",
      );
    } catch {
      if (port) {
        try {
          await port.close();
        } catch {
          /* ignore */
        }
      }
      setInstallState("runtimeReady");
      setLyraMessage(
        "⚠️ อัปโหลดไฟล์ยังไม่สมบูรณ์ — กด EN/RST บน ESP32 แล้วลองอีกครั้ง",
      );
    }
  }

  return (
    <main className="lumina-shell connection-shell">
      <TopBar showBack backHref="/" />
      <div className="connection-content">
        <section className="connection-hero-copy" aria-labelledby="connect-title">
          <h1 id="connect-title">
            Connect <span>Rover</span>
          </h1>
          <p>
            เสียบ ESP32 ผ่าน USB เพื่อติดตั้ง firmware (ครั้งเดียว) จากนั้นใช้
            WiFi โทรศัพท์เชื่อมต่อและควบคุม Rover ผ่านหน้าเว็บบน ESP32 โดยตรง
          </p>
        </section>

        <ConnectionProgress activeStep="install" />

        {/* Mobile note */}
        <section className="connect-card connect-mobile-brief" aria-label="Mobile setup note">
          <span className="connect-card-icon">
            <Smartphone data-icon="inline-start" />
          </span>
          <div>
            <h2>เปิดบนมือถืออยู่?</h2>
            <p>
              ครั้งแรกต้องเปิดหน้านี้บนคอมที่เสียบ ESP32 ผ่าน USB ก่อน
              หลังจากติดตั้งแล้วใช้มือถือควบคุมผ่าน WiFi ได้
            </p>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              void navigator.clipboard?.writeText(
                "https://roboforge.app/connect",
              );
              setLyraMessage(
                "คัดลอกลิงก์แล้ว — เปิดบนคอมที่มี Chrome หรือ Edge",
              );
            }}
          >
            <Send data-icon="inline-start" />
            คัดลอกลิงก์ไปคอม
          </Button>
        </section>

        {/* Desktop installer */}
        <section
          className="connect-card connect-installer-card"
          aria-label="Desktop firmware installer"
        >
          <div className="connect-section-heading">
            <span className="connect-card-icon">
              <Laptop data-icon="inline-start" />
            </span>
            <div>
              <h2>ติดตั้ง Firmware (ครั้งเดียว)</h2>
              <p>เสียบ ESP32 เข้าคอมด้วยสาย USB data แล้วทำตามขั้นตอน</p>
            </div>
          </div>

          <div className="connect-required-list" aria-label="สิ่งที่ต้องเตรียม">
            <div>
              <Usb data-icon="inline-start" />
              <span>คอม Chrome/Edge + สาย USB data</span>
            </div>
            <div>
              <CheckCircle2 data-icon="inline-start" />
              <span>ESP32 DevKit/WROOM เสียบ USB อยู่</span>
            </div>
            <div>
              <Wifi data-icon="inline-start" />
              <span>มือถือหรือคอม (สำหรับต่อ WiFi Rover หลังติดตั้ง)</span>
            </div>
          </div>

          <div className="connect-install-flow">
            <div className="connect-installer-widget">
              <div>
                <strong>1. MicroPython runtime</strong>
                <small>
                  ติดตั้ง MicroPython v1.28.0 สำหรับ ESP32/WROOM ผ่าน browser
                </small>
              </div>
              <div className="esp-install-button-wrap" suppressHydrationWarning>
                {createElement(
                  "esp-web-install-button",
                  {
                    manifest: MICROPYTHON_RUNTIME_MANIFEST_URL,
                  } as Record<string, string>,
                )}
              </div>
            </div>

            <div className="connect-installer-widget">
              <div>
                <strong>2. RoboForge Agent (WebSocket)</strong>
                <small>
                  อัปโหลด boot.py + main.py + MicroWebSrv libraries (4 ไฟล์)
                </small>
              </div>
              <Button
                disabled={installState === "agentUploading"}
                onClick={() => void uploadMicroPythonAgent()}
                variant="secondary"
              >
                <FileCode2 data-icon="inline-start" />
                {installState === "agentUploading"
                  ? "กำลังอัปโหลด..."
                  : "Upload Agent"}
              </Button>
            </div>
          </div>
        </section>

        {/* After install guide */}
        <section
          className="connect-card connect-doctor-card"
          aria-label="Next steps"
        >
          <div className="connect-section-heading">
            <span className="connect-card-icon">
              <CheckCircle2 data-icon="inline-start" />
            </span>
            <div>
              <h2>หลังติดตั้งเสร็จ</h2>
              <p>ทำตามนี้เพื่อเริ่มควบคุม Rover</p>
            </div>
          </div>

          <div className="connect-required-list" aria-label="Steps after install">
            <div>
              <span>1.</span>
              <span>
                <strong>ถอด USB</strong> — ESP32 จะรีบูตและสร้าง WiFi
                "Rover-XXXX"
              </span>
            </div>
            <div>
              <span>2.</span>
              <span>
                ต่อ WiFi <strong>"Rover-XXXX"</strong> (รหัส: 12345678)
              </span>
            </div>
            <div>
              <span>3.</span>
              <span>
                เปิด browser → <strong>http://192.168.4.1</strong>
              </span>
            </div>
            <div>
              <span>4.</span>
              <span>
                กด <strong>⚙️ Wi-Fi</strong> → ใส่ชื่อ hotspot โทรศัพท์ → 💾
                บันทึก
              </span>
            </div>
            <div>
              <span>5.</span>
              <span>
                ESP32 รีบูต → ต่อ hotspot → กลับไป{" "}
                <strong>192.168.4.1</strong> → 🎉 ขับเลย!
              </span>
            </div>
          </div>
        </section>

        <LyraTip message={lyraMessage} />
      </div>
      <BottomNav active="garage" />
    </main>
  );
}
