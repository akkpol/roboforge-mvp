"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Battery, CheckCircle2, PlugZap, Power, ShieldCheck, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdvancedConnectionDetails } from "./advanced-connection-details";
import { BottomNav } from "./bottom-nav";
import { ConnectionMap } from "./connection-map";
import { ConnectionProgress, type ConnectionStepId } from "./connection-progress";
import { ConnectionStepCard, type ConnectionStepTone } from "./connection-step-card";
import { LyraTip } from "./lyra-tip";
import { RoverStage } from "./rover-stage";
import { TopBar } from "./top-bar";

const MQTT_SCRIPT_URL = "https://unpkg.com/mqtt/dist/mqtt.min.js";
const MQTT_BROKER = "wss://broker.hivemq.com:8884/mqtt";
const TOPIC_PREFIX = "robot/0001";
const TOPIC_CMD = `${TOPIC_PREFIX}/cmd`;
const TOPIC_STAT = `${TOPIC_PREFIX}/status`;

type ConnectionState = "failed" | "idle" | "mqttConnecting" | "robotOnline" | "waitingRobot";

type RobotStatus = {
  battery_pct?: number;
  battery_v?: number;
  online?: boolean;
};

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
      reconnectPeriod: number;
    },
  ) => MqttClientLike;
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

function getActiveStep(connectionState: ConnectionState): ConnectionStepId {
  if (connectionState === "idle") {
    return "power";
  }

  if (connectionState === "mqttConnecting" || connectionState === "failed") {
    return "wifi";
  }

  if (connectionState === "waitingRobot") {
    return "online";
  }

  return "test";
}

function getStepTone(connectionState: ConnectionState, step: ConnectionStepId): ConnectionStepTone {
  const activeStep = getActiveStep(connectionState);
  const order: ConnectionStepId[] = ["power", "wifi", "online", "test"];
  const activeIndex = order.indexOf(activeStep);
  const stepIndex = order.indexOf(step);

  if (stepIndex < activeIndex) {
    return "done";
  }

  if (stepIndex === activeIndex) {
    return "active";
  }

  return "pending";
}

function statusLabel(connectionState: ConnectionState, mqttReady: boolean, robotStatus: RobotStatus | null) {
  if (!mqttReady) {
    return "กำลังโหลด MQTT.js";
  }

  if (connectionState === "mqttConnecting") {
    return "กำลังเชื่อมต่อ HiveMQ";
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

  return "พร้อมเริ่มเชื่อมต่อ";
}

export function ConnectScreen() {
  const mqttClientRef = useRef<MqttClientLike | null>(null);
  const [connectionAttempt, setConnectionAttempt] = useState(0);
  const [connectionState, setConnectionState] = useState<ConnectionState>("idle");
  const [lyraMessage, setLyraMessage] = useState("Hotspot: เปิด 2.4GHz/Compatibility และมีอินเทอร์เน็ต");
  const [mqttReady, setMqttReady] = useState(() => typeof window !== "undefined" && Boolean(window.mqtt));
  const [robotStatus, setRobotStatus] = useState<RobotStatus | null>(null);
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
      setLyraMessage("โหลด MQTT.js ไม่สำเร็จ ลองเช็คอินเทอร์เน็ตของเบราว์เซอร์ก่อนนะ");
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
    if (connectionAttempt === 0 || !mqttReady || typeof window === "undefined" || !window.mqtt) {
      return;
    }

    mqttClientRef.current?.end(true);
    const client = window.mqtt.connect(MQTT_BROKER, {
      clean: true,
      clientId: `roboforge_connect_${Math.random().toString(36).slice(2, 10)}`,
      connectTimeout: 9000,
      reconnectPeriod: 3000,
    });

    mqttClientRef.current = client;

    client.on("connect", () => {
      setConnectionState("waitingRobot");
      setLyraMessage("เชื่อมต่อ broker แล้ว ตอนนี้รอ Rover ส่ง status กลับมา ถ้าไม่ขึ้นให้เช็ค SSID/PASSWORD ใน main.py");
      client.subscribe(TOPIC_STAT);
      client.publish(TOPIC_CMD, JSON.stringify({ cmd: "status" }));
    });

    client.on("message", (topicValue, messageValue) => {
      if (String(topicValue) !== TOPIC_STAT) {
        return;
      }

      try {
        const parsedStatus = JSON.parse(messageToString(messageValue)) as RobotStatus;
        setRobotStatus(parsedStatus);
        setConnectionState("robotOnline");
        setLyraMessage("Rover Online แล้ว ก่อนทดสอบล้อให้ยกรถขึ้นจากพื้น แล้วลองส่ง STOP เพื่อเช็ค command topic");
      } catch {
        setLyraMessage("ได้รับข้อความ status แล้ว แต่อ่าน JSON ไม่ได้ ลองเช็ค firmware payload อีกครั้ง");
      }
    });

    client.on("offline", () => {
      setConnectionState((current) => (current === "robotOnline" ? current : "failed"));
      setLyraMessage("MQTT offline อยู่ ลองเช็ค internet ของ Wi-Fi หรือ Hotspot ก่อน");
    });

    client.on("error", () => {
      setConnectionState((current) => (current === "robotOnline" ? current : "failed"));
      setLyraMessage("ต่อ MQTT ไม่สำเร็จ ลองเช็ค internet และเปิดหน้าเว็บใหม่อีกครั้ง");
    });

    return () => {
      client.end(true);
      if (mqttClientRef.current === client) {
        mqttClientRef.current = null;
      }
    };
  }, [connectionAttempt, mqttReady]);

  useEffect(() => {
    if (connectionState !== "waitingRobot") {
      return;
    }

    const timeout = window.setTimeout(() => {
      setConnectionState((current) => (current === "waitingRobot" ? "failed" : current));
      setLyraMessage("ยังไม่เห็น Rover Online ให้เช็คว่า ESP32 เปิดอยู่ ต่อ Wi-Fi 2.4GHz แล้ว และ topic ตรงกับ robot/0001/status");
    }, 18000);

    return () => window.clearTimeout(timeout);
  }, [connectionState]);

  function startConnection() {
    setConnectionState("mqttConnecting");
    setRobotStatus(null);
    setLyraMessage("กำลังต่อ HiveMQ ก่อน แล้วจะรอฟังสัญญาณจาก Rover ที่ topic status");
    setConnectionAttempt((attempt) => attempt + 1);
  }

  function sendStop() {
    mqttClientRef.current?.publish(TOPIC_CMD, JSON.stringify({ cmd: "stop" }));
    setLyraMessage("ส่ง STOP แล้ว ถ้าล้อยังหมุนอยู่ให้ปิดสวิตช์แบตเตอรี่ก่อน แล้วค่อยตรวจ wiring");
  }

  const activeStep = getActiveStep(connectionState);
  const label = statusLabel(connectionState, mqttReady, robotStatus);
  const isOnline = connectionState === "robotOnline";

  return (
    <main className="lumina-shell connection-shell">
      <TopBar showBack backHref="/" />
      <div className="connection-content">
        <section className="connection-hero-copy" aria-labelledby="connect-title">
          <h1 id="connect-title">
            เชื่อมต่อ
            <span>Rover</span>
          </h1>
          <p>Lyra จะพาเปิดเครื่อง ต่อ Wi‑Fi และรอ Rover Online</p>
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

        <section className="connection-step-list" id="wiring-guide" aria-label="Connection steps">
          <ConnectionStepCard
            Icon={Power}
            index={1}
            text="เปิด Rover แล้วรอไฟสถานะติด"
            title="เปิดสวิตช์"
            tone={getStepTone(connectionState, "power")}
          />
          <ConnectionStepCard
            action={
              <Button asChild size="sm" variant="warm">
                <button
                  onClick={() =>
                    setLyraMessage("ตั้งค่า _SSID/_PASS ใน main.py เป็น Wi‑Fi บ้าน 2.4GHz หรือ Hotspot มือถือที่เปิด Compatibility mode แล้ว reset ESP32")
                  }
                  type="button"
                >
                  ตั้งค่า Wi‑Fi
                </button>
              </Button>
            }
            Icon={Wifi}
            index={2}
            text="เชื่อมต่อ Wi‑Fi บ้านหรือ Hotspot 2.4GHz"
            title="ใส่ Wi‑Fi 2.4G"
            tone={getStepTone(connectionState, "wifi")}
          />
          <ConnectionStepCard
            action={
              isOnline ? (
                <span className="battery-chip">
                  <Battery data-icon="inline-start" />
                  {robotStatus?.battery_pct ?? "--"}%
                </span>
              ) : null
            }
            Icon={PlugZap}
            index={3}
            text="รอ Rover Online ผ่าน MQTT"
            title="รอ Online"
            tone={getStepTone(connectionState, "online")}
          />
        </section>

        <AdvancedConnectionDetails broker={MQTT_BROKER} commandTopic={TOPIC_CMD} mode="MQTT-first + Phone Hotspot fallback" statusTopic={TOPIC_STAT} />

        <LyraTip message={lyraMessage} />

        <section className="connection-actions" aria-label="Connection actions">
          <Button onClick={isOnline ? sendStop : startConnection}>
            {isOnline ? <ShieldCheck data-icon="inline-start" /> : <CheckCircle2 data-icon="inline-start" />}
            {isOnline ? "ส่ง STOP ทดสอบ" : connectionState === "failed" ? "ลองเชื่อมต่ออีกครั้ง" : "เริ่มเชื่อมต่อ"}
          </Button>
          <Button asChild variant="ghost">
            <Link href="#wiring-guide">ดูคู่มือต่อสาย</Link>
          </Button>
        </section>

        <p className="connection-safety-note">
          <ShieldCheck data-icon="inline-start" />
          ก่อนทดสอบล้อ ให้ยกรถขึ้นจากพื้น
        </p>
      </div>
      <BottomNav />
    </main>
  );
}
