export type AppMode = "public" | "device";
export type ThemeId = "forge" | "neo";
export type Language = "en" | "th";
export type ScreenId =
  | "landing"
  | "garage"
  | "profile"
  | "cockpit"
  | "missions"
  | "engineer"
  | "store";

export type RobotType = "rover" | "tracked" | "drone" | "arm";

export interface RobotProfile {
  id: string;
  name: string;
  robotType: RobotType;
  robotClass: string;
  theme: ThemeId;
  status: "online" | "offline";
  capabilities: string[];
  evolutionStage: number;
}

export interface RobotTheme {
  id: ThemeId;
  label: string;
  robotName: string;
  robotClass: string;
  image: string;
}

export interface RobotTelemetry {
  connected: boolean;
  armed: boolean;
  batteryVoltage: number;
  batteryPercent: number;
  lastCommandAt: number;
  uptime: number;
  firmwareVersion: string;
  wifiStrength: "strong" | "fair" | "weak";
}

export interface DriveCommand {
  throttle: number;
  steering: number;
  speedLimit: number;
  sequence: number;
}

export interface RoverApi {
  getStatus(): Promise<RobotTelemetry>;
  setArmed(armed: boolean): Promise<RobotTelemetry>;
  drive(command: DriveCommand): Promise<void>;
  stop(): Promise<RobotTelemetry>;
}
