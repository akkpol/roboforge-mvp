export const DEFAULT_ROBOFORGE_MQTT_WS_URL = "wss://mqtt.roboforge.app/mqtt";
export const DEFAULT_TOPIC_ROOT = "rf";

export type RobotCommandName = "avoid" | "config" | "drive" | "status" | "stop";

export type RobotCommand =
  | { cmd: "avoid"; enable: boolean }
  | { cmd: "config"; avoid_distance_cm?: number; speed_limit?: number }
  | { cmd: "drive"; steering: number; throttle: number }
  | { cmd: "status" }
  | { cmd: "stop" };

export type RobotStatus = {
  battery_pct?: number;
  battery_v?: number;
  distance_cm?: number;
  firmware?: string;
  online?: boolean;
  robot_id?: string;
  rssi?: number;
};

export type RobotTopics = {
  command: string;
  status: string;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function getMqttWebSocketUrl() {
  return process.env.NEXT_PUBLIC_ROBOFORGE_MQTT_WS_URL || DEFAULT_ROBOFORGE_MQTT_WS_URL;
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

export function buildRobotTopics(robotId: string, root = DEFAULT_TOPIC_ROOT): RobotTopics {
  const safeRoot = normalizeRobotId(root).replace(/^rf-rover$/, DEFAULT_TOPIC_ROOT);
  const safeRobotId = normalizeRobotId(robotId);

  return {
    command: `${safeRoot}/${safeRobotId}/cmd`,
    status: `${safeRoot}/${safeRobotId}/status`,
  };
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
      speed_limit: typeof command.speed_limit === "number" ? clamp(command.speed_limit, 0.1, 0.8) : undefined,
    };
  }

  return command;
}

export function serializeRobotCommand(command: RobotCommand) {
  return JSON.stringify(buildRobotCommand(command));
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
  status.rssi = numericField(record.rssi) ?? numericField(record.wifi_rssi);

  if (typeof record.online === "boolean") {
    status.online = record.online;
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
