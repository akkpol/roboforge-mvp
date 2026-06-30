import { describe, expect, it } from "vitest";
import {
  buildRobotCommand,
  buildRobotTopics,
  canRunMotorTest,
  createInstallToken,
  createRobotId,
  normalizeRobotId,
  parseRobotStatus,
  serializeRobotCommand,
} from "./connect-protocol";

describe("connect protocol", () => {
  it("normalizes robot ids for topic-safe names", () => {
    expect(normalizeRobotId(" Rover 01!! ")).toBe("rover-01");
    expect(normalizeRobotId("")).toBe("rf-rover");
  });

  it("creates deterministic ids and tokens when seeded", () => {
    expect(createRobotId(0.42)).toMatch(/^rf-[a-z0-9]+$/);
    expect(createInstallToken(0.42)).toMatch(/^rft-[a-z0-9]+$/);
  });

  it("builds RoboForge-owned topics without legacy shared defaults", () => {
    expect(buildRobotTopics("RF-A7K3")).toEqual({
      command: "rf/rf-a7k3/cmd",
      status: "rf/rf-a7k3/status",
    });
  });

  it("clamps drive commands before serializing", () => {
    expect(buildRobotCommand({ cmd: "drive", steering: -3, throttle: 2 })).toEqual({
      cmd: "drive",
      steering: -1,
      throttle: 1,
    });

    expect(serializeRobotCommand({ cmd: "stop" })).toBe('{"cmd":"stop"}');
  });

  it("parses robot status from firmware payloads", () => {
    expect(parseRobotStatus('{"battery_v":7.42,"battery_pct":58,"distance_cm":23,"online":true}')).toEqual({
      battery_pct: 58,
      battery_v: 7.42,
      distance_cm: 23,
      online: true,
    });
  });

  it("blocks motor tests until both online and raised-wheel checks pass", () => {
    expect(canRunMotorTest(true, true)).toBe(true);
    expect(canRunMotorTest(false, true)).toBe(false);
    expect(canRunMotorTest(true, false)).toBe(false);
  });
});
