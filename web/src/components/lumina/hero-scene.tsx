"use client";

import Image from "next/image";
import { Check } from "lucide-react";
import { luminaAssets } from "./assets";
import { RoverStage } from "./rover-stage";

type HeroSceneProps = {
  isConnected?: boolean;
};

export function HeroScene({ isConnected = false }: HeroSceneProps) {
  return (
    <section className="poster-hero">
      <div className="hero-atmosphere" aria-hidden="true" />
      <div className="hero-copy">
        <h1>
          ปลุก
          <span>Rover</span>
          ของคุณ
        </h1>
        <p className="status-pill">
          <Check data-icon="inline-start" />
          {isConnected ? "เชื่อมต่อแล้ว" : "ชิ้นส่วนครบ 4/4"}
        </p>
      </div>
      <div className="lyra-stage" aria-label="Lyra ผู้ช่วยนำทาง">
        <Image
          alt="Lyra friendly AI navigator"
          className="lyra-asset"
          height={luminaAssets.lyra.height}
          priority
          src={luminaAssets.lyra.src}
          width={luminaAssets.lyra.width}
        />
      </div>
      <RoverStage />
      <div className="floating-lyra-nameplate" aria-hidden="true">
        <strong>LYRA</strong>
        <span>ผู้ช่วยนำทาง</span>
      </div>
    </section>
  );
}
