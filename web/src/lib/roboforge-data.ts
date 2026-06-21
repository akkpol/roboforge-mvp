export type ThemeId = "forge" | "neo";
export type RobotType = "rover" | "tracked" | "drone" | "arm";
export type ConsoleScreen =
  | "connect"
  | "garage"
  | "profile"
  | "cockpit"
  | "missions"
  | "engineer"
  | "store";
export type UpgradeInterest =
  | "Rover-01 Beta Kit + guided setup workshop"
  | "Build and control Rover-01"
  | "STEM workshop or school"
  | "Sensor Pack"
  | "Body Kit"
  | "Neo Decal Set"
  | "Future robot types";
export type RoverSupportCode =
  | "battery_configuration_mismatch"
  | "controls_not_armed"
  | "invalid_json"
  | "network_error"
  | "no_control_client"
  | "not_found"
  | "stale_sequence"
  | "unknown";

export type OwnerProgress = {
  battery_calibrated: boolean;
  first_connection_complete: boolean;
  first_drive_complete: boolean;
  first_mission_complete: boolean;
  ready_for_floor_test: boolean;
  setup_complete: boolean;
};

export type RobotTelemetry = {
  armed: boolean;
  batteryPercent: number;
  batteryVoltage: number;
  connected: boolean;
  firmwareVersion: string;
  lastCommandAt: number;
  uptime: number;
  wifiStrength: "strong" | "fair" | "weak";
};

export const themes: Record<
  ThemeId,
  {
    id: ThemeId;
    label: string;
    robotName: string;
    robotClass: string;
    image: string;
  }
> = {
  forge: {
    id: "forge",
    label: "Forge Core",
    robotName: "AEGIS-01",
    robotClass: "Scout Class",
    image: "/assets/rover-forge.webp",
  },
  neo: {
    id: "neo",
    label: "Neo Anime",
    robotName: "KITSUNE-X",
    robotClass: "Street Scout",
    image: "/assets/rover-neo.webp",
  },
};

export const fleet: Array<{
  id: RobotType;
  label: string;
  state: "active" | "coming" | "concept";
  image: string;
}> = [
  {
    id: "rover",
    label: "Rover",
    state: "active",
    image: "/assets/fleet-rover.webp",
  },
  {
    id: "tracked",
    label: "Tracked",
    state: "coming",
    image: "/assets/fleet-tracked.webp",
  },
  {
    id: "drone",
    label: "Drone",
    state: "coming",
    image: "/assets/fleet-drone.webp",
  },
  {
    id: "arm",
    label: "Arm",
    state: "concept",
    image: "/assets/fleet-arm.webp",
  },
];

export const defaultProgress: OwnerProgress = {
  battery_calibrated: false,
  first_connection_complete: false,
  first_drive_complete: false,
  first_mission_complete: false,
  ready_for_floor_test: false,
  setup_complete: false,
};

export const demoTelemetry: RobotTelemetry = {
  armed: false,
  batteryPercent: 82,
  batteryVoltage: 7.78,
  connected: true,
  firmwareVersion: "web-demo-0.1.0",
  lastCommandAt: 0,
  uptime: 128,
  wifiStrength: "strong",
};

export const firstPaidOfferInterest: UpgradeInterest =
  "Rover-01 Beta Kit + guided setup workshop";

export const upgradeInterests: UpgradeInterest[] = [
  firstPaidOfferInterest,
  "Build and control Rover-01",
  "Sensor Pack",
  "Body Kit",
  "Neo Decal Set",
  "STEM workshop or school",
  "Future robot types",
];

export const capabilities = [
  "Manual Drive",
  "Wi-Fi Cockpit",
  "Battery Telemetry",
] as const;

export const supportScripts: Array<{
  body: string;
  code: RoverSupportCode | null;
  title: string;
}> = [
  {
    code: "battery_configuration_mismatch",
    title: "Battery gate blocked arming",
    body:
      "Check the configured cell count before driving. Compare the displayed voltage against a multimeter, then update the battery setting only after the pack is identified.",
  },
  {
    code: "stale_sequence",
    title: "Drive command was rejected",
    body:
      "The rover rejected an old drive command. Tap Emergency stop, refresh Cockpit, then arm again so command numbering restarts cleanly.",
  },
  {
    code: "controls_not_armed",
    title: "Controls are locked",
    body:
      "Arm the cockpit only after the wheels are raised and the area is clear. Hosted web Cockpit stays simulated; real controls live on the Rover local Wi-Fi.",
  },
  {
    code: "network_error",
    title: "Rover link is unavailable",
    body:
      "Join the RoboForge-Rover Wi-Fi network and open the local device page for real hardware. The cloud workspace should never proxy live motor commands.",
  },
  {
    code: null,
    title: "First build checklist",
    body:
      "Start with power, Wi-Fi, battery reading, raised wheels, and a zero-release test. Keep body kits and autonomy clearly marked as roadmap concepts until hardware validation is complete.",
  },
];

export const upgradeItems: Array<{
  body: string;
  category: string;
  interest: UpgradeInterest;
  state: "ROADMAP" | "CONCEPT";
  title: string;
}> = [
  {
    category: "HARDWARE",
    title: "Sensor Pack",
    body: "Distance sensing and mission telemetry for Rover-01.",
    state: "ROADMAP",
    interest: "Sensor Pack",
  },
  {
    category: "BODY KIT",
    title: "Aegis Shell",
    body: "A physical expression inspired by the Forge Digital Form.",
    state: "CONCEPT",
    interest: "Body Kit",
  },
  {
    category: "DIGITAL",
    title: "Neo Decal Set",
    body: "Anime identity pack with matching future physical decals.",
    state: "CONCEPT",
    interest: "Neo Decal Set",
  },
];

export function getDemoWorkspace() {
  return {
    devices: [],
    error: null,
    interests: [],
    notice: null,
    profile: null,
    progress: null,
    robots: [
      {
        created_at: new Date().toISOString(),
        display_name: "AEGIS-01",
        id: "demo-rover-01",
        owner_id: "demo-owner",
        robot_type: "rover" as const,
        status: "demo" as const,
        theme: "forge" as const,
        unit_code: "ROVER-01",
        updated_at: new Date().toISOString(),
        workspace_id: null,
      },
    ],
  };
}
