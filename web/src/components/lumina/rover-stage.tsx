"use client";

import Image from "next/image";
import { luminaAssets } from "./assets";

type RoverStageProps = {
  label?: string;
  variant?: "hero" | "connect";
};

export function RoverStage({ label = "Rover-01 friendly robot on a soft summon circle", variant = "hero" }: RoverStageProps) {
  return (
    <div className={`rover-stage rover-stage--${variant}`}>
      <Image
        alt=""
        aria-hidden="true"
        className="platform-asset"
        height={luminaAssets.platform.height}
        priority={variant === "hero"}
        src={luminaAssets.platform.src}
        width={luminaAssets.platform.width}
      />
      <div className="summon-ring" aria-hidden="true" />
      <Image
        alt={label}
        className="rover-asset"
        height={luminaAssets.rover.height}
        priority={variant === "hero"}
        src={luminaAssets.rover.src}
        width={luminaAssets.rover.width}
      />
    </div>
  );
}
