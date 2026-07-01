import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  brokerHostFromWebSocket,
  brokerPortFromWebSocket,
  buildMicroPythonFileWriteCommand,
  buildProvisionPayload,
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
  it("keeps browser installer files synced with the firmware source", () => {
    for (const file of ["boot.py", "main.py"]) {
      expect(readFileSync(join(process.cwd(), "public", "firmware", "micropython", file), "utf8")).toBe(
        readFileSync(join(process.cwd(), "..", "firmware", file), "utf8"),
      );
    }
  });

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

  it("builds provision payloads from the app broker URL", () => {
    expect(
      buildProvisionPayload({
        brokerUrl: "wss://mqtt.roboforge.app/mqtt",
        installToken: "rft-token",
        robotId: "RF Demo",
        wifiPassword: "secret123",
        wifiSsid: " Home 2G ",
      }),
    ).toEqual({
      cmd: "provision",
      mqtt_host: "mqtt.roboforge.app",
      mqtt_port: 8883,
      mqtt_tls: true,
      password: "secret123",
      robot_id: "rf-demo",
      ssid: "Home 2G",
      token: "rft-token",
      topic_prefix: "rf",
    });

    expect(brokerHostFromWebSocket("ws://localhost:9001/mqtt")).toBe("localhost");
    expect(brokerPortFromWebSocket("ws://localhost:9001/mqtt")).toBe(9001);
  });

  it("generates MicroPython REPL upload commands only for agent files", () => {
    const command = buildMicroPythonFileWriteCommand("boot.py", "print('ok')");
    expect(command).toContain("exec(");
    expect(command).toContain("boot.py");
    expect(() => buildMicroPythonFileWriteCommand("secrets.py", "")).toThrow("Unsupported MicroPython agent path");
  });

  it("parses robot status from firmware payloads", () => {
    expect(parseRobotStatus('{"battery_v":7.42,"battery_pct":58,"distance_cm":23,"online":true,"avoid":true,"left":0.2}')).toEqual({
      avoid: true,
      battery_pct: 58,
      battery_v: 7.42,
      distance_cm: 23,
      left: 0.2,
      online: true,
    });
  });

  it("blocks motor tests until both online and raised-wheel checks pass", () => {
    expect(canRunMotorTest(true, true)).toBe(true);
    expect(canRunMotorTest(false, true)).toBe(false);
    expect(canRunMotorTest(true, false)).toBe(false);
  });
});
