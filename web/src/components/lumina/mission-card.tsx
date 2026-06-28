import Image from "next/image";
import { Compass } from "lucide-react";

import { luminaAssets } from "./assets";

type MissionCardProps = {
  isConnected?: boolean;
};

export function MissionCard({ isConnected = false }: MissionCardProps) {
  return (
    <section className="mission-card" aria-label="Current mission">
      <Image
        alt=""
        aria-hidden="true"
        className="mission-background-asset"
        fill
        sizes="398px"
        src={luminaAssets.mission.background}
      />
      <div className="mission-symbol">
        <Image
          alt=""
          aria-hidden="true"
          className="mission-flag-asset"
          height={luminaAssets.mission.flag.height}
          src={luminaAssets.mission.flag.src}
          width={luminaAssets.mission.flag.width}
        />
      </div>
      <div className="mission-copy">
        <h2>{isConnected ? "ภารกิจ: พร้อมเริ่มตั้งค่า" : "ภารกิจ: เชื่อมต่อครั้งแรก"}</h2>
        <p>
          {isConnected
            ? "เข้าสู่ระบบสำเร็จแล้ว ขั้นต่อไปคือเชื่อมต่อ Rover กับมือถือและเริ่มตั้งค่าทีละขั้น"
            : "เชื่อมต่อ Rover กับมือถือของคุณ เพื่อเริ่มการเดินทางไปด้วยกัน!"}
        </p>
      </div>
      <Compass className="mission-arrow" aria-hidden="true" />
    </section>
  );
}
