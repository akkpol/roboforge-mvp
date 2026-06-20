import type { RobotProfile, RobotTheme, RobotType } from "./types";

export const themes: Record<RobotTheme["id"], RobotTheme> = {
  forge: {
    id: "forge",
    label: "Forge Core",
    robotName: "AEGIS-01",
    robotClass: "Scout Class",
    image: "./assets/rover-forge.webp",
  },
  neo: {
    id: "neo",
    label: "Neo Anime",
    robotName: "KITSUNE-X",
    robotClass: "Street Scout",
    image: "./assets/rover-neo.webp",
  },
};

export const defaultProfile: RobotProfile = {
  id: "rover-01",
  name: "AEGIS-01",
  robotType: "rover",
  robotClass: "Scout Class",
  theme: "forge",
  status: "online",
  capabilities: ["Manual Drive", "Wi-Fi Control", "Battery Telemetry"],
  evolutionStage: 1,
};

export const fleet: Array<{
  id: RobotType;
  label: string;
  state: "active" | "coming" | "concept";
  image: string;
}> = [
  { id: "rover", label: "Rover", state: "active", image: "./assets/fleet-rover.webp" },
  { id: "tracked", label: "Tracked", state: "coming", image: "./assets/fleet-tracked.webp" },
  { id: "drone", label: "Drone", state: "coming", image: "./assets/fleet-drone.webp" },
  { id: "arm", label: "Arm", state: "concept", image: "./assets/fleet-arm.webp" },
];
