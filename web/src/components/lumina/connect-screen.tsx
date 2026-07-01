"use client";

import { createElement, useEffect, useState } from "react";
import {
  Cable,
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
import { ConnectionProgress, type ConnectionStepId } from "./connection-progress";
import { LyraTip } from "./lyra-tip";
import { TopBar } from "./top-bar";
import {
  MICROPYTHON_AGENT_FILES,
  MICROPYTHON_RUNTIME_MANIFEST_URL,
  buildMicroPythonFileWriteCommand,
  buildProvisionPayload,
  createInstallToken,
  createRobotId,
  normalizeRobotId,
} from "./connect-protocol";

const STORAGE_KEY = "roboforge-connect-profile";

type InstallState = "agentUploading" | "idle" | "ready" | "runtimeReady" | "sent" | "unsupported";

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
  const [lyraMessage, setLyraMessage] = useState("เสียบ ESP32 ผ่าน USB แล้วทำตามขั้นตอนด้านล่าง");
  const [robotId, setRobotId] = useState("rf-rover");
  const [wifiSsid, setWifiSsid] = useState("");
  const [wifiPassword, setWifiPassword] = useState("");
  const [provisioned, setProvisioned] = useState(false);

  const wifiReady = wifiSsid.trim().length > 0 && wifiPassword.length >= 8;

  const activeStep: ConnectionStepId = provisioned ? "provision" : "install";

  useEffect(() => {
    if (typeof window === "undefined") return;

    window.setTimeout(() => {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (!saved) {
        setRobotId(createRobotId());
        return;
      }

      try {
        const parsed = JSON.parse(saved) as { robotId?: string; wifiSsid?: string };
        if (parsed.robotId) setRobotId(normalizeRobotId(parsed.robotId));
        if (parsed.wifiSsid) setWifiSsid(parsed.wifiSsid);
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
        setRobotId(createRobotId());
      }
    }, 0);
  }, []);

  // Save profile when values change
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ robotId, wifiSsid }),
    );
  }, [robotId, wifiSsid]);

  async function uploadMicroPythonAgent() {
    const serial = typeof navigator !== "undefined" ? (navigator as NavigatorWithSerial).serial : undefined;
    if (!serial) {
      setInstallState("unsupported");
      setLyraMessage("เครื่องนี้ยังไม่รองรับ Web Serial — ใช้ Chrome หรือ Edge desktop แทน");
      return;
    }

    setInstallState("agentUploading");
    setLyraMessage("กำลังอัปโหลด boot.py, main.py และ MicroWebSrv libraries เข้า MicroPython ผ่าน USB");

    let port: SerialPortLike | null = null;
    try {
      const files = await Promise.all(
        MICROPYTHON_AGENT_FILES.map(async (file) => ({
          ...file,
          source: await fetch(file.sourceUrl).then((response) => {
            if (!response.ok) throw new Error(`Cannot fetch ${file.sourceUrl}`);
            return response.text();
          }),
        })),
      );

      port = await serial.requestPort();
      await port.open({ baudRate: 115200 });
      // Break out of any running program
      await writeSerialText(port, "\x03\x03\r\n");
      await delay(500);

      for (const file of files) {
        await writeSerialText(port, buildMicroPythonFileWriteCommand(file.devicePath, file.source));
        await delay(900);
      }

      // Reset to start the new firmware
      await writeSerialText(port, "import machine\r\nmachine.reset()\r\n");
      await port.close();
      setInstallState("runtimeReady");
      setLyraMessage("✅ อัปโหลดสำเร็จ! ESP32 จะรีบูตเป็น AP ชื่อ Rover-XXXX — ถอด USB แล้วใช้ WiFi จับคู่");
    } catch {
      if (port) {
        try { await port.close(); } catch { /* ignore */ }
      }
      setInstallState("runtimeReady");
      setLyraMessage("⚠️ อัปโหลดไฟล์ยังไม่สมบูรณ์ — กด EN/RST บน ESP32 แล้วลองอีกครั้ง");
    }
  }

  async function provisionOverSerial() {
    const serial = typeof navigator !== "undefined" ? (navigator as NavigatorWithSerial).serial : undefined;
    if (!serial) {
      setInstallState("unsupported");
      setLyraMessage("เครื่องนี้ยังไม่รองรับ Web Serial — ใช้ Chrome หรือ Edge desktop แทน");
      return;
    }

    if (!wifiReady) {
      setLyraMessage("ใส่ชื่อ WiFi hotspot และ password อย่างน้อย 8 ตัวอักษรก่อน");
      return;
    }

    const payload = buildProvisionPayload({
      robotId,
      wifiPassword,
      wifiSsid,
    });

    try {
      const port = await serial.requestPort();
      await port.open({ baudRate: 115200 });
      await writeSerialText(port, `${JSON.stringify(payload)}\n`);
      await port.close();
      setProvisioned(true);
      setLyraMessage("✅ ส่ง WiFi เข้า ESP32 แล้ว! ถอด USB, เปิด hotspot โทรศัพท์, ESP32 จะต่อ WiFi อัตโนมัติ");
    } catch {
      setInstallState("ready");
      setLyraMessage("⚠️ ยังส่ง WiFi ไม่สำเร็จ — ลองเสียบ ESP32 ใหม่แล้วกดอีกครั้ง");
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
            เสียบ ESP32 ผ่าน USB เพื่อติดตั้ง firmware (ครั้งเดียว)
            จากนั้นใช้ WiFi hotspot โทรศัพท์เชื่อมต่อและควบคุม Rover ได้เลย
          </p>
        </section>

        <ConnectionProgress activeStep={activeStep} />

        {/* Mobile note */}
        <section className="connect-card connect-mobile-brief" aria-label="Mobile setup note">
          <span className="connect-card-icon">
            <Smartphone data-icon="inline-start" />
          </span>
          <div>
            <h2>เปิดบนมือถืออยู่?</h2>
            <p>ครั้งแรกต้องเปิดหน้านี้บนคอมที่เสียบ ESP32 ผ่าน USB ก่อน หลังจากติดตั้งแล้วใช้มือถือควบคุมผ่าน WiFi hotspot ได้</p>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              void navigator.clipboard?.writeText("https://roboforge.app/connect");
              setLyraMessage("คัดลอกลิงก์แล้ว — เปิดบนคอมที่มี Chrome หรือ Edge");
            }}
          >
            <Send data-icon="inline-start" />
            คัดลอกลิงก์ไปคอม
          </Button>
        </section>

        {/* Desktop installer */}
        <section className="connect-card connect-installer-card" aria-label="Desktop firmware installer">
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
            <div><Usb data-icon="inline-start" /><span>คอม Chrome/Edge + สาย USB data</span></div>
            <div><CheckCircle2 data-icon="inline-start" /><span>ESP32 DevKit/WROOM เสียบ USB อยู่</span></div>
            <div><Wifi data-icon="inline-start" /><span>WiFi hotspot โทรศัพท์ (สำหรับหลังติดตั้ง)</span></div>
          </div>

          {/* Step 1: MicroPython + Agent */}
          <div className="connect-install-flow">
            <div className="connect-installer-widget">
              <div>
                <strong>1. MicroPython runtime</strong>
                <small>ติดตั้ง MicroPython v1.28.0 สำหรับ ESP32/WROOM ผ่าน browser</small>
              </div>
              <div className="esp-install-button-wrap" suppressHydrationWarning>
                {createElement("esp-web-install-button", { manifest: MICROPYTHON_RUNTIME_MANIFEST_URL } as Record<string, string>)}
              </div>
            </div>

            <div className="connect-installer-widget">
              <div>
                <strong>2. RoboForge Agent (WebSocket)</strong>
                <small>อัปโหลด boot.py + main.py + MicroWebSrv libraries (4 ไฟล์)</small>
              </div>
              <Button disabled={installState === "agentUploading"} onClick={() => void uploadMicroPythonAgent()} variant="secondary">
                <FileCode2 data-icon="inline-start" />
                {installState === "agentUploading" ? "กำลังอัปโหลด..." : "Upload Agent"}
              </Button>
            </div>
          </div>

          {/* WiFi input + Provision */}
          <div className="connect-field-grid">
            <label>
              <span>Robot ID <small>สร้างให้อัตโนมัติ</small></span>
              <input value={robotId} onChange={(event) => setRobotId(normalizeRobotId(event.target.value))} />
            </label>
            <label>
              <span>ชื่อ WiFi hotspot โทรศัพท์</span>
              <input autoComplete="off" value={wifiSsid} onChange={(event) => setWifiSsid(event.target.value)} placeholder="สมมุติ: iPhone, Hotspot_Akkap" />
            </label>
            <label>
              <span>รหัสผ่าน WiFi</span>
              <input autoComplete="off" type="password" value={wifiPassword} onChange={(event) => setWifiPassword(event.target.value)} placeholder="อย่างน้อย 8 ตัวอักษร" />
            </label>
          </div>

          <div className="connect-installer-widget connect-provision-widget">
            <div>
              <strong>3. ส่ง WiFi เข้า ESP32</strong>
              <small>เมื่อลง MicroPython + Agent ครบแล้ว กดปุ่มนี้เพื่อส่งชื่อ WiFi และรหัสผ่าน</small>
            </div>
            <Button disabled={!wifiReady || installState === "agentUploading"} onClick={() => void provisionOverSerial()}>
              <Cable data-icon="inline-start" />
              ส่ง WiFi ผ่าน USB (Provision)
            </Button>
          </div>
        </section>

        {/* After install guide */}
        <section className="connect-card connect-doctor-card" aria-label="Next steps">
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
              <span><strong>ถอด USB</strong> — ESP32 จะรีบูตและเชื่อมต่อ WiFi hotspot ที่คุณกำหนด</span>
            </div>
            <div>
              <span>2.</span>
              <span>เปิด <strong>Hotspot โทรศัพท์</strong> (ชื่อเดียวกับที่ใส่ไว้)</span>
            </div>
            <div>
              <span>3.</span>
              <span>เปิด browser → พิมพ์ <strong>http://192.168.4.1</strong> (หน้า control อยู่บน ESP32 โดยตรง)</span>
            </div>
            <div>
              <span>4.</span>
              <span><strong>ขับ Rover ได้เลย!</strong> 🎉 ไม่ต้องใช้ internet, broker, หรือสมัคร service ใดๆ</span>
            </div>
          </div>
        </section>

        <LyraTip message={lyraMessage} />
      </div>
      <BottomNav active="garage" />
    </main>
  );
}
