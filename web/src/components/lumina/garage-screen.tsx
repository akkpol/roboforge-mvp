"use client";

import { useTheme } from "next-themes";
import { startTransition, useState } from "react";
import { ActionBar } from "./action-bar";
import { BottomNav } from "./bottom-nav";
import { HardwareGrid } from "./hardware-grid";
import { HeroScene } from "./hero-scene";
import { MissionCard } from "./mission-card";
import { RobotShelf } from "./robot-shelf";
import { themeNames } from "./data";
import { TopBar } from "./top-bar";

type GarageScreenProps = {
  isConnected?: boolean;
  justConnected?: boolean;
  userName?: string | null;
};

export function GarageScreen({
  isConnected = false,
  justConnected = false,
  userName = null,
}: GarageScreenProps) {
  const { setTheme, theme } = useTheme();
  const [activeRobot, setActiveRobot] = useState(0);
  const [roverLinked, setRoverLinked] = useState(false);
  const [, setLyraLine] = useState(
    isConnected
      ? justConnected
        ? `ยินดีต้อนรับกลับมา${userName ? ` ${userName}` : ""} ตอนนี้ Garage พร้อมแล้ว เราเริ่มตั้งค่า Rover ต่อได้เลย`
        : `ดีใจที่กลับมา${userName ? ` ${userName}` : ""} ตอนนี้ Garage ของคุณเชื่อมต่อพร้อมแล้ว`
      : "ฉันจะพา Rover พร้อมเริ่มทีละขั้น เปิดเครื่อง ต่อ Wi-Fi แล้วเข้า Cockpit",
  );

  function cycleTheme() {
    const current = themeNames.indexOf((theme ?? "lumina") as (typeof themeNames)[number]);
    const nextTheme = themeNames[(current + 1 + themeNames.length) % themeNames.length];
    startTransition(() => {
      setTheme(nextTheme);
    });
  }

  function connectRover() {
    setRoverLinked(true);
    setLyraLine("เริ่มโหมดเชื่อมต่อ Rover แล้ว ขั้นถัดไปคือเปิด Wi-Fi ของ ESP32 และจับคู่กับมือถือ");
  }

  return (
    <main className="lumina-shell">
      <TopBar isConnected={isConnected} />
      <HeroScene isConnected={isConnected} />
      <HardwareGrid />
      <MissionCard isConnected={isConnected} />
      <ActionBar
        connectHref="/connect"
        isConnected={isConnected}
        roverLinked={roverLinked}
        onConnect={connectRover}
        onCycleTheme={cycleTheme}
        onTalk={() => setLyraLine("ถาม Lyra ได้เลย: ชิ้นส่วนไหนต่อก่อน หรือขั้นตอนไหนยังไม่ชัด")}
      />
      <RobotShelf activeRobot={activeRobot} onSelectRobot={setActiveRobot} />
      <BottomNav />
    </main>
  );
}
