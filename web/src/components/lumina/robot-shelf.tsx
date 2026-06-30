"use client";

import Image from "next/image";
import { luminaAssets } from "./assets";
import { robotItems } from "./data";

type RobotShelfProps = {
  activeRobot: number;
  onSelectRobot: (index: number) => void;
};

export function RobotShelf({ activeRobot, onSelectRobot }: RobotShelfProps) {
  return (
    <section className="robot-shelf" aria-label="Robot selection">
      <div className="shelf-head">
        <h2>หุ่นยนต์ของคุณ</h2>
        <button type="button">ดูทั้งหมด</button>
      </div>
      <div className="robot-carousel">
        {robotItems.map((robot, index) => (
          <button
            aria-label={robot.ariaLabel}
            className={[
              robot.kind === "empty" ? "robot-empty-slot" : "robot-card",
              activeRobot === index && robot.kind === "rover" ? "is-active" : "",
            ].filter(Boolean).join(" ")}
            disabled={robot.kind === "empty"}
            key={robot.key}
            onClick={() => onSelectRobot(index)}
            type="button"
          >
            {robot.kind === "rover" ? (
              <>
                <Image alt="Rover-01" height={116} loading="eager" src={luminaAssets.rover.src} width={116} />
                <strong>{robot.label}</strong>
              </>
            ) : (
              <span className="empty-slot-art" aria-hidden="true">
                <Image
                  alt=""
                  className="empty-slot-image"
                  height={luminaAssets.emptySlot.height}
                  loading="eager"
                  src={luminaAssets.emptySlot.src}
                  width={luminaAssets.emptySlot.width}
                />
              </span>
            )}
          </button>
        ))}
      </div>
      <div className="pager-dots" aria-hidden="true">
        <span className="is-active" />
        <span />
        <span />
        <span />
      </div>
    </section>
  );
}
