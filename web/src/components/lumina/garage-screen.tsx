"use client";

import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const { setTheme, theme } = useTheme();
  const [activeRobot, setActiveRobot] = useState(0);
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
    if (isConnected) {
      setLyraLine("เชื่อมต่อแล้ว ขั้นถัดไปคือเริ่มตั้งค่า Rover ผ่าน Garage นี้ได้เลย");
      return;
    }

    setLyraLine("เข้าสู่ระบบหรือเชื่อมต่อแล้วจะกลับมาที่หน้า Garage นี้ จากนั้นค่อยต่อ Wi-Fi ของ Rover");
    router.push("/login?lang=th&redirect=/?connected=1");
  }

  return (
    <main className="lumina-shell">
      <TopBar isConnected={isConnected} />
      <HeroScene isConnected={isConnected} />
      <HardwareGrid />
      <MissionCard isConnected={isConnected} />
      <ActionBar
        isConnected={isConnected}
        onConnect={connectRover}
        onCycleTheme={cycleTheme}
        onTalk={() => setLyraLine("ถาม Lyra ได้เลย: ชิ้นส่วนไหนต่อก่อน หรือขั้นตอนไหนยังไม่ชัด")}
      />
      <RobotShelf activeRobot={activeRobot} onSelectRobot={setActiveRobot} />
      <BottomNav />
    </main>
  );
}
