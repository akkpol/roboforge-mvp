import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildMicroPythonFileWriteCommands,
  buildProvisionPayload,
  buildRobotCommand,
  canRunMotorTest,
  createInstallToken,
  createRobotId,
  normalizeRobotId,
  parseRobotStatus,
  serializeRobotCommand,
} from "./protocol";

describe("connect protocol", () => {
  it("keeps the browser installer asset compatible with the established device protocol", () => {
    for (const file of ["boot.py", "main.py", "microWebSrv.py", "microWebSocket.py"]) {
      expect(readFileSync(join(process.cwd(), "public", "firmware", "micropython", file), "utf8").length).toBeGreaterThan(0);
    }

    const agent = readFileSync(join(process.cwd(), "public", "firmware", "micropython", "main.py"), "utf8");
    expect(agent).toContain('FIRMWARE_VERSION = "roboforge-websocket-agent-0.2.0"');
    expect(agent).toContain('elif cmd == "avoid":');
    expect(agent).toContain('payload["distance_cm"] = distance');
    expect(agent).toContain("check_serial_provision()");
  });

  it("normalizes robot ids for topic-safe names", () => {
    expect(normalizeRobotId(" Rover 01!! ")).toBe("rover-01");
    expect(normalizeRobotId("")).toBe("rf-rover");
  });

  it("creates deterministic ids and tokens when seeded", () => {
    expect(createRobotId(0.42)).toMatch(/^rf-[a-z0-9]+$/);
    expect(createInstallToken(0.42)).toMatch(/^rft-[a-z0-9]+$/);
  });

  it("clamps drive commands before serializing", () => {
    expect(buildRobotCommand({ cmd: "drive", steering: -3, throttle: 2 })).toEqual({
      cmd: "drive",
      steering: -1,
      throttle: 1,
    });
    expect(serializeRobotCommand({ cmd: "stop" })).toBe('{"cmd":"stop"}');
  });

  it("builds provision payloads from WiFi hotspot info", () => {
    expect(
      buildProvisionPayload({
        robotId: "RF Demo",
        wifiPassword: "secret123",
        wifiSsid: " Home 2G ",
      }),
    ).toEqual({
      cmd: "provision",
      robot_id: "rf-demo",
      ssid: "Home 2G",
      password: "secret123",
    });
  });

  it("chunks large UTF-8 agent files into acknowledged REPL commands", () => {
    const source = `${"print('RoboForge')\n".repeat(3_000)}# ทดสอบ 🤖\n`;
    const upload = buildMicroPythonFileWriteCommands("microWebSrv.py", source);

    expect(upload.commands.length).toBeGreaterThan(100);
    expect(new Set(upload.commands.map(({ acknowledgment }) => acknowledgment)).size).toBe(upload.commands.length);
    expect(upload.commands.every(({ text }) => new TextEncoder().encode(text).byteLength <= 768)).toBe(true);
    expect(upload.commands.at(-1)?.acknowledgment).toBe(`RF_FILE_OK:microWebSrv.py:${new TextEncoder().encode(source).byteLength}`);

    const base64 = upload.commands
      .map(({ text }) => text.match(/a2b_base64\("([A-Za-z0-9+/=]+)"\)/)?.[1] ?? "")
      .join("");
    expect(Buffer.from(base64, "base64").toString("utf8")).toBe(source);
    expect(() => buildMicroPythonFileWriteCommands("secrets.py", "")).toThrow("Unsupported MicroPython agent path");
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
