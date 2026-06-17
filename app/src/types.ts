export type AppMode = "public" | "device";
export type ThemeId = "forge" | "neo";
export type Language = "en" | "th";
export type ScreenId =
  | "landing"
  | "setup"
  | "garage"
  | "profile"
  | "cockpit"
  | "missions"
  | "engineer"
  | "store";

export type RobotType = "rover" | "tracked" | "drone" | "arm";

export type RoverApiErrorCode =
  | "battery_configuration_mismatch"
  | "controls_not_armed"
  | "invalid_json"
  | "network_error"
  | "no_control_client"
  | "not_found"
  | "stale_sequence"
  | "unknown";

export type UpgradeInterest =
  | "Build and control Rover-01"
  | "STEM workshop or school"
  | "Sensor Pack"
  | "Body Kit"
  | "Neo Decal Set"
  | "Future robot types";

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
  apSsid: string;
  batteryVoltage: number;
  batteryPercent: number;
  commandTimeoutMs: number;
  deviceName: string;
  lastCommandAt: number;
  maxSpeed: number;
  protocolVersion: string;
  robotType: RobotType;
  uptime: number;
  firmwareVersion: string;
  wifiStrength: "strong" | "fair" | "weak";
}

export interface OwnerProgress {
  setupComplete: boolean;
  firstDriveComplete: boolean;
  batteryCalibrated: boolean;
  readyForFloorTest: boolean;
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
