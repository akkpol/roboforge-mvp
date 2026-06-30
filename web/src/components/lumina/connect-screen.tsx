"use client";

import { createElement, type Dispatch, type SetStateAction, useEffect, useMemo, useRef, useState } from "react";
import {
  Battery,
  Cable,
  CheckCircle2,
  Gauge,
  Laptop,
  PlugZap,
  Radar,
  RotateCcw,
  Send,
  ShieldCheck,
  Smartphone,
  Usb,
  Wifi,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdvancedConnectionDetails } from "./advanced-connection-details";
import { BottomNav } from "./bottom-nav";
import { ConnectionMap } from "./connection-map";
import { ConnectionProgress, type ConnectionStepId } from "./connection-progress";
import { LyraTip } from "./lyra-tip";
import { RoverStage } from "./rover-stage";
import { TopBar } from "./top-bar";
import {
  DEFAULT_ROBOFORGE_MQTT_WS_URL,
  buildRobotTopics,
  canRunMotorTest,
  createInstallToken,
  createRobotId,
  getMqttWebSocketUrl,
  normalizeRobotId,
  parseRobotStatus,
  serializeRobotCommand,
  type RobotStatus,
} from "./connect-protocol";

const MQTT_SCRIPT_URL = "https://unpkg.com/mqtt/dist/mqtt.min.js";
const INSTALL_MANIFEST_URL = "/firmware/manifest.json";
const STORAGE_KEY = "roboforge-connect-profile";

type ConnectionState = "brokerConnecting" | "failed" | "idle" | "robotOnline" | "waitingRobot";
type InstallState = "idle" | "ready" | "sent" | "unsupported";

type MqttClientLike = {
  end: (force?: boolean) => void;
  on: (event: string, handler: (...args: unknown[]) => void) => void;
  publish: (topic: string, message: string) => void;
  subscribe: (topic: string) => void;
};

type MqttFactoryLike = {
  connect: (
    broker: string,
    options: {
      clean: boolean;
      clientId: string;
      connectTimeout: number;
      password?: string;
      reconnectPeriod: number;
      username?: string;
    },
  ) => MqttClientLike;
};

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

declare global {
  interface Window {
    mqtt?: MqttFactoryLike;
  }
}

function messageToString(message: unknown) {
  if (typeof message === "string") {
    return message;
  }

  if (message && typeof message === "object" && "toString" in message && typeof message.toString === "function") {
    return message.toString();
  }

  return "";
}

function getActiveStep(kitReady: boolean, installState: InstallState, connectionState: ConnectionState, testReady: boolean): ConnectionStepId {
  if (!kitReady) {
    return "kit";
  }

  if (installState !== "sent" && connectionState === "idle") {
    return "install";
  }

  if (connectionState !== "robotOnline") {
    return "online";
  }

  return testReady ? "test" : "online";
}

function statusLabel(connectionState: ConnectionState, mqttReady: boolean, robotStatus: RobotStatus | null) {
  if (!mqttReady) {
    return "กำลังโหลด MQTT.js";
  }

  if (connectionState === "brokerConnecting") {
    return "กำลังต่อ RoboForge broker";
  }

  if (connectionState === "waitingRobot") {
    return "กำลังค้นหา Rover";
  }

  if (connectionState === "robotOnline") {
    return robotStatus?.battery_v ? `Rover Online · ${robotStatus.battery_v}V` : "Rover Online";
  }

  if (connectionState === "failed") {
    return "ยังไม่เจอ Rover";
  }

  return "พร้อมติดตั้งและเชื่อมต่อ";
}

function brokerHostFromWebSocket(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return "mqtt.roboforge.app";
  }
}

function brokerPortFromWebSocket(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.port) {
      return Number(parsed.port);
    }

    return parsed.protocol === "wss:" ? 8883 : 1883;
  } catch {
    return 8883;
  }
}

function installCopy(brokerUrl: string) {
  if (brokerUrl === DEFAULT_ROBOFORGE_MQTT_WS_URL) {
    return "RoboForge broker พร้อมใช้จากค่า env ของ production";
  }

  return "ใช้ broker จาก environment ของโปรเจกต์นี้";
}

export function ConnectScreen() {
  const mqttClientRef = useRef<MqttClientLike | null>(null);
  const driveStopTimerRef = useRef<number | null>(null);
  const [connectionAttempt, setConnectionAttempt] = useState(0);
  const [connectionState, setConnectionState] = useState<ConnectionState>("idle");
  const [installState, setInstallState] = useState<InstallState>("idle");
  const [lyraMessage, setLyraMessage] = useState("ครั้งแรกต้องใช้คอมเพื่อใส่ firmware ให้ ESP32 หลังจากนั้นมือถือใช้ต่อได้เลย");
  const [mqttReady, setMqttReady] = useState(() => typeof window !== "undefined" && Boolean(window.mqtt));
  const [robotStatus, setRobotStatus] = useState<RobotStatus | null>(null);
  const [serialSupported] = useState(() => typeof navigator !== "undefined" && Boolean((navigator as NavigatorWithSerial).serial));
  const [robotId, setRobotId] = useState(() => createRobotId());
  const [installToken, setInstallToken] = useState(() => createInstallToken());
  const [wifiSsid, setWifiSsid] = useState("");
  const [wifiPassword, setWifiPassword] = useState("");
  const [kitChecks, setKitChecks] = useState(() => new Set(["esp32", "driver"]));
  const [wiringChecks, setWiringChecks] = useState(() => new Set<string>());
  const [wheelsRaised, setWheelsRaised] = useState(false);
  const [avoidEnabled, setAvoidEnabled] = useState(false);
  const [avoidDistance, setAvoidDistance] = useState(25);

  const brokerUrl = getMqttWebSocketUrl();
  const topics = useMemo(() => buildRobotTopics(robotId), [robotId]);
  const kitReady = kitChecks.size >= 5 && wiringChecks.size >= 4;
  const wifiReady = wifiSsid.trim().length > 0 && wifiPassword.length >= 8;
  const isOnline = connectionState === "robotOnline";
  const testReady = canRunMotorTest(wheelsRaised, isOnline);
  const activeStep = getActiveStep(kitReady, installState, connectionState, testReady);
  const label = statusLabel(connectionState, mqttReady, robotStatus);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      return;
    }

    try {
      const parsed = JSON.parse(saved) as { installToken?: string; robotId?: string; wifiSsid?: string };
      window.setTimeout(() => {
        if (parsed.robotId) {
          setRobotId(normalizeRobotId(parsed.robotId));
        }
        if (parsed.installToken) {
          setInstallToken(parsed.installToken);
        }
        if (parsed.wifiSsid) {
          setWifiSsid(parsed.wifiSsid);
        }
      }, 0);
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        installToken,
        robotId,
        wifiSsid,
      }),
    );
  }, [installToken, robotId, wifiSsid]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (window.mqtt) {
      window.setTimeout(() => setMqttReady(true), 0);
      return;
    }

    const existingScript = document.querySelector<HTMLScriptElement>('script[data-roboforge-mqtt="true"]');
    const script = existingScript ?? document.createElement("script");

    function handleLoad() {
      setMqttReady(Boolean(window.mqtt));
    }

    function handleError() {
      setConnectionState("failed");
      setLyraMessage("โหลด MQTT.js ไม่สำเร็จ เช็คอินเทอร์เน็ตของ browser ก่อน");
    }

    script.addEventListener("load", handleLoad);
    script.addEventListener("error", handleError);

    if (!existingScript) {
      script.async = true;
      script.dataset.roboforgeMqtt = "true";
      script.src = MQTT_SCRIPT_URL;
      document.body.appendChild(script);
    }

    return () => {
      script.removeEventListener("load", handleLoad);
      script.removeEventListener("error", handleError);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const existingScript = document.querySelector<HTMLScriptElement>('script[data-roboforge-esp-tools="true"]');
    if (existingScript) {
      return;
    }

    const script = document.createElement("script");
    script.type = "module";
    script.dataset.roboforgeEspTools = "true";
    script.src = "https://unpkg.com/esp-web-tools@10/dist/web/install-button.js?module";
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    if (connectionAttempt === 0 || !mqttReady || typeof window === "undefined" || !window.mqtt) {
      return;
    }

    mqttClientRef.current?.end(true);
    const client = window.mqtt.connect(brokerUrl, {
      clean: true,
      clientId: `roboforge_web_${robotId}_${Math.random().toString(36).slice(2, 8)}`,
      connectTimeout: 9000,
      password: installToken,
      reconnectPeriod: 3000,
      username: robotId,
    });

    mqttClientRef.current = client;

    client.on("connect", () => {
      setConnectionState("waitingRobot");
      setLyraMessage("ต่อ broker แล้ว กำลังขอสถานะจาก Rover ผ่าน topic เฉพาะเครื่องนี้");
      client.subscribe(topics.status);
      client.publish(topics.command, serializeRobotCommand({ cmd: "status" }));
    });

    client.on("message", (topicValue, messageValue) => {
      if (String(topicValue) !== topics.status) {
        return;
      }

      try {
        const parsedStatus = parseRobotStatus(messageToString(messageValue));
        setRobotStatus(parsedStatus);
        setConnectionState("robotOnline");
        setLyraMessage("Rover Online แล้ว ขั้นต่อไปคือยกรถขึ้นจากพื้น แล้วทดสอบ STOP กับล้อแบบสั้น ๆ");
      } catch {
        setLyraMessage("Rover ส่ง status มาแล้ว แต่อ่าน JSON ไม่ได้ ให้ลง firmware agent เวอร์ชันล่าสุดอีกครั้ง");
      }
    });

    client.on("offline", () => {
      setConnectionState((current) => (current === "robotOnline" ? current : "failed"));
      setLyraMessage("broker offline อยู่ ลองเช็ค Wi-Fi/Hotspot หรือ broker env ของ RoboForge");
    });

    client.on("error", () => {
      setConnectionState((current) => (current === "robotOnline" ? current : "failed"));
      setLyraMessage("ต่อ RoboForge broker ไม่สำเร็จ ตรวจ NEXT_PUBLIC_ROBOFORGE_MQTT_WS_URL แล้วลองใหม่");
    });

    return () => {
      client.end(true);
      if (mqttClientRef.current === client) {
        mqttClientRef.current = null;
      }
    };
  }, [brokerUrl, connectionAttempt, installToken, mqttReady, robotId, topics.command, topics.status]);

  useEffect(() => {
    if (connectionState !== "waitingRobot") {
      return;
    }

    const timeout = window.setTimeout(() => {
      setConnectionState((current) => (current === "waitingRobot" ? "failed" : current));
      setLyraMessage("ยังไม่เห็น Rover Online ให้เช็คว่า ESP32 ต่อ Wi-Fi 2.4GHz แล้ว และ provision ค่า robotId ตรงกับหน้านี้");
    }, 18000);

    return () => window.clearTimeout(timeout);
  }, [connectionState]);

  function toggleSet(setter: Dispatch<SetStateAction<Set<string>>>, current: Set<string>, key: string) {
    const next = new Set(current);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    setter(next);
  }

  async function provisionOverSerial() {
    const serial = typeof navigator !== "undefined" ? (navigator as NavigatorWithSerial).serial : undefined;
    if (!serial) {
      setInstallState("unsupported");
      setLyraMessage("เครื่องนี้ยังไม่รองรับ Web Serial ให้เปิดหน้านี้บน Chrome/Edge desktop");
      return;
    }

    if (!wifiReady) {
      setLyraMessage("ใส่ชื่อ Wi-Fi 2.4GHz และ password ก่อนส่งค่าให้ ESP32");
      return;
    }

    const payload = {
      cmd: "provision",
      mqtt_host: brokerHostFromWebSocket(brokerUrl),
      mqtt_port: brokerPortFromWebSocket(brokerUrl),
      mqtt_tls: brokerUrl.startsWith("wss://"),
      password: wifiPassword,
      robot_id: robotId,
      ssid: wifiSsid.trim(),
      token: installToken,
      topic_prefix: "rf",
    };

    try {
      const port = await serial.requestPort();
      await port.open({ baudRate: 115200 });
      const writer = port.writable?.getWriter();
      if (!writer) {
        throw new Error("Serial writer is not available");
      }
      await writer.write(new TextEncoder().encode(`${JSON.stringify(payload)}\n`));
      writer.releaseLock();
      await port.close();
      setInstallState("sent");
      setLyraMessage("ส่งค่า Wi-Fi และ broker ให้ Rover Agent แล้ว กด Find Rover เพื่อรอ status");
    } catch {
      setInstallState("ready");
      setLyraMessage("ยังส่งค่าผ่าน USB ไม่สำเร็จ ลองถอดเสียบ ESP32 แล้วกด Provision อีกครั้ง");
    }
  }

  function startConnection() {
    setConnectionState("brokerConnecting");
    setRobotStatus(null);
    setLyraMessage("กำลังต่อ RoboForge broker แล้วจะส่ง status request ไปที่ Rover");
    setConnectionAttempt((attempt) => attempt + 1);
  }

  function publishCommand(command: Parameters<typeof serializeRobotCommand>[0], message: string) {
    mqttClientRef.current?.publish(topics.command, serializeRobotCommand(command));
    setLyraMessage(message);
  }

  function sendStop() {
    if (driveStopTimerRef.current) {
      window.clearTimeout(driveStopTimerRef.current);
    }
    publishCommand({ cmd: "stop" }, "ส่ง STOP แล้ว ถ้าล้อยังหมุนอยู่ให้ปิดสวิตช์แบตเตอรี่ก่อน");
  }

  function sendDrivePulse(throttle: number, steering: number) {
    if (!testReady) {
      setLyraMessage("ก่อนทดสอบล้อ ต้องเห็น Rover Online และติ๊กว่ายกรถขึ้นจากพื้นแล้ว");
      return;
    }

    publishCommand({ cmd: "drive", steering, throttle }, "ส่งคำสั่งล้อแบบสั้น ๆ แล้วจะหยุดอัตโนมัติ");
    if (driveStopTimerRef.current) {
      window.clearTimeout(driveStopTimerRef.current);
    }
    driveStopTimerRef.current = window.setTimeout(() => sendStop(), 900);
  }

  function toggleAvoid() {
    const next = !avoidEnabled;
    setAvoidEnabled(next);
    publishCommand({ cmd: "avoid", enable: next }, next ? "เปิดโหมดหลบหลีกแล้ว" : "ปิดโหมดหลบหลีกแล้ว");
  }

  function sendAvoidConfig() {
    publishCommand({ avoid_distance_cm: avoidDistance, cmd: "config", speed_limit: 0.45 }, `ตั้งระยะหลบหลีกเป็น ${avoidDistance}cm แล้ว`);
  }

  return (
    <main className="lumina-shell connection-shell">
      <TopBar showBack backHref="/" />
      <div className="connection-content">
        <section className="connection-hero-copy" aria-labelledby="connect-title">
          <h1 id="connect-title">
            Connect
            <span>Rover</span>
          </h1>
          <p>ครั้งแรกใช้คอมลง RoboForge Agent ให้ ESP32 แล้วมือถือจะใช้เชื่อมต่อ ทดสอบ และขับต่อได้</p>
        </section>

        <ConnectionProgress activeStep={activeStep} />

        <section className="connection-visual-card" aria-label="Rover connection status">
          <div className={isOnline ? "connection-status is-online" : "connection-status"}>
            <span />
            <strong>{label}</strong>
          </div>
          <RoverStage variant="connect" />
          <ConnectionMap />
        </section>

        <section className="connect-card connect-mobile-brief" aria-label="Mobile setup note">
          <span className="connect-card-icon">
            <Smartphone data-icon="inline-start" />
          </span>
          <div>
            <h2>มือถือใช้ต่อได้ หลัง install ครั้งแรก</h2>
            <p>ถ้าเปิดหน้านี้บนมือถือ ให้ส่งลิงก์นี้ไปคอมแล้วเสียบ ESP32 ผ่าน USB เพื่อลง firmware ก่อน</p>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              void navigator.clipboard?.writeText("https://roboforge.app/install");
              setLyraMessage("คัดลอกลิงก์ install แล้ว เปิดบนคอมที่มี Chrome หรือ Edge");
            }}
          >
            <Send data-icon="inline-start" />
            Copy link
          </Button>
        </section>

        <section className="connect-card connect-installer-card" aria-label="Desktop firmware installer">
          <div className="connect-section-heading">
            <span className="connect-card-icon">
              <Laptop data-icon="inline-start" />
            </span>
            <div>
              <h2>Install firmware บนคอมครั้งเดียว</h2>
              <p>{installCopy(brokerUrl)} · ใช้ Chrome/Edge desktop + สาย USB data</p>
            </div>
          </div>

          <div className="connect-check-grid" aria-label="Hardware checklist">
            {[
              ["esp32", "ESP32 DevKit"],
              ["driver", "L298N"],
              ["motors", "TT motor x2"],
              ["battery", "18650 2S + BMS"],
              ["safety", "Fuse + switch"],
              ["sensor", "HC-SR04P optional"],
            ].map(([key, labelText]) => (
              <label className={kitChecks.has(key) ? "is-checked" : ""} key={key}>
                <input checked={kitChecks.has(key)} onChange={() => toggleSet(setKitChecks, kitChecks, key)} type="checkbox" />
                <span>{labelText}</span>
              </label>
            ))}
          </div>

          <div className="connect-check-grid" aria-label="Wiring checklist">
            {[
              ["pwm", "ENA/ENB jumpers removed"],
              ["pins", "GPIO 25/26/27/33/32/17"],
              ["ground", "Common GND"],
              ["battery_adc", "Battery divider GPIO34"],
            ].map(([key, labelText]) => (
              <label className={wiringChecks.has(key) ? "is-checked" : ""} key={key}>
                <input checked={wiringChecks.has(key)} onChange={() => toggleSet(setWiringChecks, wiringChecks, key)} type="checkbox" />
                <span>{labelText}</span>
              </label>
            ))}
          </div>

          <div className="connect-field-grid">
            <label>
              <span>Robot ID</span>
              <input value={robotId} onChange={(event) => setRobotId(normalizeRobotId(event.target.value))} />
            </label>
            <label>
              <span>Wi-Fi 2.4GHz</span>
              <input autoComplete="off" value={wifiSsid} onChange={(event) => setWifiSsid(event.target.value)} placeholder="Home_2.4G" />
            </label>
            <label>
              <span>Password</span>
              <input autoComplete="off" type="password" value={wifiPassword} onChange={(event) => setWifiPassword(event.target.value)} placeholder="อย่างน้อย 8 ตัวอักษร" />
            </label>
          </div>

          <div className="connect-installer-widget">
            <div>
              <strong>Firmware package</strong>
              <small>ติดตั้ง RoboForge MQTT Agent ลง ESP32 ผ่าน browser</small>
            </div>
            <div className="esp-install-button-wrap" suppressHydrationWarning>
              {createElement("esp-web-install-button", { manifest: INSTALL_MANIFEST_URL } as Record<string, string>)}
            </div>
          </div>

          <div className="connect-actions-row">
            <Button disabled={!kitReady || !wifiReady} onClick={() => setInstallState(serialSupported ? "ready" : "unsupported")} variant="secondary">
              <Usb data-icon="inline-start" />
              Check installer
            </Button>
            <Button disabled={!kitReady || !wifiReady} onClick={() => void provisionOverSerial()}>
              <Cable data-icon="inline-start" />
              Provision over USB
            </Button>
          </div>

          <p className={installState === "unsupported" ? "connect-warning" : "connect-help"}>
            {serialSupported
              ? "Web Serial พร้อมใช้: หลังลง firmware ให้กด Provision เพื่อส่งค่า Wi-Fi/broker เข้า ESP32"
              : "ถ้าไม่เห็นตัวเลือก serial ให้เปิดบน Chrome หรือ Edge desktop"}
          </p>
        </section>

        <section className="connect-card connect-doctor-card" aria-label="Online doctor">
          <div className="connect-section-heading">
            <span className="connect-card-icon">
              <PlugZap data-icon="inline-start" />
            </span>
            <div>
              <h2>Online doctor</h2>
              <p>แอปจะต่อ broker เอง รอ status เอง และส่งคำสั่งทดสอบให้เอง</p>
            </div>
          </div>

          <div className="connect-status-grid">
            <div>
              <span>Broker</span>
              <strong>{mqttReady ? "Ready" : "Loading"}</strong>
            </div>
            <div>
              <span>Battery</span>
              <strong>{robotStatus?.battery_pct ?? "--"}%</strong>
            </div>
            <div>
              <span>Distance</span>
              <strong>{robotStatus?.distance_cm ? `${robotStatus.distance_cm}cm` : "--"}</strong>
            </div>
          </div>

          <div className="connect-actions-row">
            <Button onClick={startConnection}>
              <Wifi data-icon="inline-start" />
              Find Rover
            </Button>
            <Button disabled={!isOnline} onClick={() => publishCommand({ cmd: "status" }, "ส่ง status request แล้ว")} variant="secondary">
              <Gauge data-icon="inline-start" />
              Status
            </Button>
            <Button disabled={!isOnline} onClick={sendStop} variant="warm">
              <ShieldCheck data-icon="inline-start" />
              STOP
            </Button>
          </div>
        </section>

        <section className="connect-card connect-test-card" aria-label="Raised wheel tests">
          <div className="connect-section-heading">
            <span className="connect-card-icon">
              <ShieldCheck data-icon="inline-start" />
            </span>
            <div>
              <h2>Raised-wheel test</h2>
              <p>ทดสอบล้อแบบสั้น ๆ เท่านั้น หลังยกรถขึ้นจากพื้นแล้ว</p>
            </div>
          </div>

          <label className={wheelsRaised ? "connect-safety-toggle is-checked" : "connect-safety-toggle"}>
            <input checked={wheelsRaised} onChange={() => setWheelsRaised((raised) => !raised)} type="checkbox" />
            <span>ยกรถขึ้นจากพื้นแล้ว และเอามือออกจากล้อ</span>
          </label>

          <div className="connect-test-grid">
            <Button disabled={!testReady} onClick={() => sendDrivePulse(0.28, 0)} variant="secondary">
              <Gauge data-icon="inline-start" />
              Forward
            </Button>
            <Button disabled={!testReady} onClick={() => sendDrivePulse(-0.28, 0)} variant="secondary">
              <RotateCcw data-icon="inline-start" />
              Reverse
            </Button>
            <Button disabled={!testReady} onClick={() => sendDrivePulse(0, -0.35)} variant="secondary">
              <Wrench data-icon="inline-start" />
              Left
            </Button>
            <Button disabled={!testReady} onClick={() => sendDrivePulse(0, 0.35)} variant="secondary">
              <Wrench data-icon="inline-start" />
              Right
            </Button>
          </div>

          <div className="connect-avoid-row">
            <Button disabled={!isOnline} onClick={toggleAvoid} variant={avoidEnabled ? "warm" : "secondary"}>
              <Radar data-icon="inline-start" />
              {avoidEnabled ? "Avoid ON" : "Avoid OFF"}
            </Button>
            <label>
              <span>ระยะหลบ {avoidDistance}cm</span>
              <input min="15" max="50" onChange={(event) => setAvoidDistance(Number(event.target.value))} type="range" value={avoidDistance} />
            </label>
            <Button disabled={!isOnline} onClick={sendAvoidConfig} variant="secondary">
              <CheckCircle2 data-icon="inline-start" />
              Apply
            </Button>
          </div>
        </section>

        <AdvancedConnectionDetails
          broker={brokerUrl}
          commandTopic={topics.command}
          mode="RoboForge MQTT Agent + desktop Web Serial install"
          robotId={robotId}
          statusTopic={topics.status}
        />

        <LyraTip message={lyraMessage} />

        <p className="connection-safety-note">
          <Battery data-icon="inline-start" />
          Wi-Fi password ใช้ส่งเข้า ESP32 เท่านั้น ไม่เก็บถาวรใน browser
        </p>
      </div>
      <BottomNav />
    </main>
  );
}
