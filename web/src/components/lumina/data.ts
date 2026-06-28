import type { LucideIcon } from "lucide-react";
import {
  Battery,
  Bot,
  Brain,
  Eye,
  Flag,
  Home,
  ShoppingCart,
  UserRound,
  Wrench,
} from "lucide-react";
import { luminaAssets } from "./assets";

export type HardwareItem = {
  Icon: LucideIcon;
  image: string;
  key: "brain" | "eyes" | "muscle" | "power";
  label: string;
  name: string;
  tone: "mint" | "sky" | "peach" | "blue";
};

export type RobotItem = {
  label: string;
  state: string;
  tone: "active" | "tracked" | "drone" | "arm";
};

export const themeNames = ["lumina", "mint", "peach", "lavender", "sky", "light"] as const;

export const hardwareItems: readonly HardwareItem[] = [
  {
    Icon: Brain,
    image: luminaAssets.hardware.esp32,
    key: "brain",
    label: "สมอง",
    name: "ESP32",
    tone: "mint",
  },
  {
    Icon: Eye,
    image: luminaAssets.hardware.hcsr04,
    key: "eyes",
    label: "ดวงตา",
    name: "HC-SR04",
    tone: "sky",
  },
  {
    Icon: Bot,
    image: luminaAssets.hardware.motors,
    key: "muscle",
    label: "กล้ามเนื้อ",
    name: "L298N",
    tone: "peach",
  },
  {
    Icon: Battery,
    image: luminaAssets.hardware.battery,
    key: "power",
    label: "พลังงาน",
    name: "Battery",
    tone: "blue",
  },
] as const;

export const robotItems: readonly RobotItem[] = [
  { label: "Rover-01", state: "พร้อม", tone: "active" },
  { label: "Tracked-01", state: "ภายหลัง", tone: "tracked" },
  { label: "Drone-01", state: "ภายหลัง", tone: "drone" },
  { label: "Arm-01", state: "ภายหลัง", tone: "arm" },
] as const;

export const navItems = [
  { Icon: Home, label: "Garage", state: "active" },
  { Icon: Flag, label: "Missions", state: "soon" },
  { Icon: Wrench, label: "Engineer", state: "soon" },
  { Icon: ShoppingCart, label: "Store", state: "soon" },
  { Icon: UserRound, label: "Profile", state: "soon" },
] as const;
