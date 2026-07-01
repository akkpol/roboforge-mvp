export const MICROPYTHON_RUNTIME_MANIFEST_URL = "/firmware/micropython/manifest.json";
export const MICROPYTHON_AGENT_FILES = [
  { devicePath: "boot.py", sourceUrl: "/firmware/micropython/boot.py" },
  { devicePath: "main.py", sourceUrl: "/firmware/micropython/main.py" },
  { devicePath: "microWebSrv.py", sourceUrl: "/firmware/micropython/microWebSrv.py" },
  { devicePath: "microWebSocket.py", sourceUrl: "/firmware/micropython/microWebSocket.py" },
] as const;

export type RobotCommandName = "avoid" | "config" | "drive" | "status" | "stop";

export type RobotCommand =
  | { cmd: "drive"; steering: number; throttle: number }
  | { cmd: "stop" }
  | { cmd: "status" }
  | { cmd: "avoid"; enable: boolean }
  | { cmd: "config"; avoid_distance_cm?: number; speed_limit?: number };

export type RobotStatus = {
  robot_id?: string;
  firmware?: string;
  online?: boolean;
  battery_v?: number;
  battery_pct?: number;
  distance_cm?: number;
  avoid?: boolean;
  speed_limit?: number;
  left?: number;
  right?: number;
  rssi?: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function normalizeRobotId(value: string) {
  const cleaned = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);

  return cleaned || "rf-rover";
}

export function createRobotId(seed = Math.random()) {
  const suffix = Math.floor(seed * 0xffffff)
    .toString(36)
    .padStart(4, "0")
    .slice(0, 5);

  return `rf-${suffix}`;
}

export function createInstallToken(seed = Math.random()) {
  const suffix = Math.floor(seed * 0xffffffff)
    .toString(36)
    .padStart(8, "0")
    .slice(0, 8);

  return `rft-${suffix}`;
}

export function buildRobotCommand(command: RobotCommand): RobotCommand {
  if (command.cmd === "drive") {
    return {
      cmd: "drive",
      steering: clamp(command.steering, -1, 1),
      throttle: clamp(command.throttle, -1, 1),
    };
  }
  if (command.cmd === "config") {
    return {
      cmd: "config",
      avoid_distance_cm:
        typeof command.avoid_distance_cm === "number"
          ? Math.round(clamp(command.avoid_distance_cm, 10, 80))
          : undefined,
      speed_limit:
        typeof command.speed_limit === "number"
          ? clamp(command.speed_limit, 0.1, 0.8)
          : undefined,
    };
  }
  return command;
}

export function serializeRobotCommand(command: RobotCommand) {
  return JSON.stringify(buildRobotCommand(command));
}

export function buildProvisionPayload(input: {
  robotId: string;
  wifiPassword: string;
  wifiSsid: string;
}) {
  return {
    cmd: "provision",
    ssid: input.wifiSsid.trim(),
    password: input.wifiPassword,
    robot_id: normalizeRobotId(input.robotId),
  };
}

export function buildMicroPythonFileWriteCommand(devicePath: string, source: string) {
  if (!MICROPYTHON_AGENT_FILES.some((file) => file.devicePath === devicePath)) {
    throw new Error("Unsupported MicroPython agent path");
  }

  const script = [
    `fp = open(${JSON.stringify(devicePath)}, "w")`,
    `fp.write(${JSON.stringify(source)})`,
    "fp.close()",
    `print("wrote ${devicePath}")`,
  ].join("\n");

  return `exec(${JSON.stringify(script)})\r\n`;
}

function numericField(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export function parseRobotStatus(input: unknown): RobotStatus {
  const value = typeof input === "string" ? JSON.parse(input) : input;

  if (!value || typeof value !== "object") {
    throw new Error("Robot status must be a JSON object");
  }

  const record = value as Record<string, unknown>;
  const status: RobotStatus = {};

  status.battery_v = numericField(record.battery_v);
  status.battery_pct = numericField(record.battery_pct);
  status.distance_cm = numericField(record.distance_cm);
  status.left = numericField(record.left);
  status.right = numericField(record.right);
  status.rssi = numericField(record.rssi) ?? numericField(record.wifi_rssi);
  status.speed_limit = numericField(record.speed_limit);

  if (typeof record.online === "boolean") {
    status.online = record.online;
  }
  if (typeof record.avoid === "boolean") {
    status.avoid = record.avoid;
  }
  if (typeof record.robot_id === "string") {
    status.robot_id = record.robot_id;
  }
  if (typeof record.firmware === "string") {
    status.firmware = record.firmware;
  }

  return status;
}

export function canRunMotorTest(wheelsRaised: boolean, online: boolean) {
  return wheelsRaised && online;
}
