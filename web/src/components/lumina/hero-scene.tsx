"use client";

import Image from "next/image";
import { Check } from "lucide-react";
import { luminaAssets } from "./assets";

export function HeroScene() {
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
          ชิ้นส่วนครบ 4/4
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
      <div className="rover-stage">
        <Image
          alt=""
          aria-hidden="true"
          className="platform-asset"
          height={luminaAssets.platform.height}
          priority
          src={luminaAssets.platform.src}
          width={luminaAssets.platform.width}
        />
        <div className="summon-ring" aria-hidden="true" />
        <Image
          alt="Rover-01 friendly robot on a soft summon circle"
          className="rover-asset"
          height={luminaAssets.rover.height}
          priority
          src={luminaAssets.rover.src}
          width={luminaAssets.rover.width}
        />
      </div>
      <div className="floating-lyra-nameplate" aria-hidden="true">
        <strong>LYRA</strong>
        <span>ผู้ช่วยนำทาง</span>
      </div>
    </section>
  );
}
