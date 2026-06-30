"use client";

import Image from "next/image";
import { Plus } from "lucide-react";
import { luminaAssets } from "./assets";
import { robotItems } from "./data";
import { isSilhouetteTone, RobotSilhouette } from "./robot-silhouette";

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
            className={activeRobot === index ? "is-active" : ""}
            key={robot.label}
            onClick={() => onSelectRobot(index)}
            type="button"
          >
            {isSilhouetteTone(robot.tone) ? (
              <RobotSilhouette tone={robot.tone} />
            ) : (
              <Image alt={`${robot.label} robot`} height={116} loading="eager" src={luminaAssets.rover.src} width={116} />
            )}
            <strong>{robot.label}</strong>
            <span>{robot.state}</span>
          </button>
        ))}
        <button className="add-robot" type="button" disabled>
          <Plus data-icon="inline-start" />
          <strong>เพิ่มหุ่นยนต์</strong>
        </button>
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
