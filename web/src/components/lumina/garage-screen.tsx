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

export function GarageScreen() {
  const { setTheme, theme } = useTheme();
  const [activeRobot, setActiveRobot] = useState(0);
  const [, setLyraLine] = useState("ฉันจะพา Rover พร้อมเริ่มทีละขั้น เปิดเครื่อง ต่อ Wi-Fi แล้วเข้า Cockpit");

  function cycleTheme() {
    const current = themeNames.indexOf((theme ?? "lumina") as (typeof themeNames)[number]);
    const nextTheme = themeNames[(current + 1 + themeNames.length) % themeNames.length];
    startTransition(() => {
      setTheme(nextTheme);
    });
  }

  function connectRover() {
    setLyraLine("เข้าสู่ระบบหรือเชื่อมต่อแล้วจะกลับมาที่หน้า Garage นี้ จากนั้นค่อยต่อ Wi-Fi ของ Rover");
  }

  return (
    <main className="lumina-shell">
      <TopBar />
      <HeroScene />
      <HardwareGrid />
      <MissionCard />
      <ActionBar
        onConnect={connectRover}
        onCycleTheme={cycleTheme}
        onTalk={() => setLyraLine("ถาม Lyra ได้เลย: ชิ้นส่วนไหนต่อก่อน หรือขั้นตอนไหนยังไม่ชัด")}
      />
      <RobotShelf activeRobot={activeRobot} onSelectRobot={setActiveRobot} />
      <BottomNav />
    </main>
  );
}
