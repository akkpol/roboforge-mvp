import Image from "next/image";
import { Compass } from "lucide-react";

import { luminaAssets } from "./assets";

export function MissionCard() {
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
        <h2>ภารกิจ: เชื่อมต่อครั้งแรก</h2>
        <p>เชื่อมต่อ Rover กับมือถือของคุณ เพื่อเริ่มการเดินทางไปด้วยกัน!</p>
      </div>
      <Compass className="mission-arrow" aria-hidden="true" />
    </section>
  );
}
