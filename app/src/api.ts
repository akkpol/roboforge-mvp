import type {
  DriveCommand,
  RobotTelemetry,
  RoverApi,
} from "./types";

const demoStatus: RobotTelemetry = {
  connected: true,
  armed: false,
  batteryVoltage: 7.78,
  batteryPercent: 82,
  lastCommandAt: 0,
  uptime: 128,
  firmwareVersion: "demo-0.1.0",
  wifiStrength: "strong",
};

export function clampDriveCommand(command: DriveCommand): DriveCommand {
  return {
    ...command,
    throttle: Math.max(-1, Math.min(1, command.throttle)),
    steering: Math.max(-1, Math.min(1, command.steering)),
    speedLimit: Math.max(0, Math.min(0.45, command.speedLimit)),
  };
}

async function requestJson<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 1600);

  try {
    const response = await fetch(path, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options?.headers ?? {}),
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Rover API failed: ${response.status}`);
    }

    return (await response.json()) as T;
  } finally {
    window.clearTimeout(timeout);
  }
}

export class HttpRoverApi implements RoverApi {
  getStatus() {
    return requestJson<RobotTelemetry>("/api/v1/status");
  }

  setArmed(armed: boolean) {
    return requestJson<RobotTelemetry>("/api/v1/arm", {
      method: "POST",
      body: JSON.stringify({ armed }),
    });
  }

  async drive(command: DriveCommand) {
    await requestJson<{ ok: boolean }>("/api/v1/drive", {
      method: "POST",
      body: JSON.stringify(clampDriveCommand(command)),
    });
  }

  stop() {
    return requestJson<RobotTelemetry>("/api/v1/stop", {
      method: "POST",
      body: "{}",
      keepalive: true,
    });
  }
}

export class DemoRoverApi implements RoverApi {
  private status = { ...demoStatus };

  async getStatus() {
    this.status.uptime += 2;
    return { ...this.status };
  }

  async setArmed(armed: boolean) {
    this.status.armed = armed;
    return { ...this.status };
  }

  async drive(command: DriveCommand) {
    if (!this.status.armed) return;
    clampDriveCommand(command);
    this.status.lastCommandAt = Date.now();
    this.status.batteryPercent = Math.max(
      18,
      this.status.batteryPercent - 0.006,
    );
  }

  async stop() {
    this.status.armed = false;
    this.status.lastCommandAt = Date.now();
    return { ...this.status };
  }
}
