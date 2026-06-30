import {
  Flag,
  Home,
  ShoppingCart,
  UserRound,
  Wrench,
} from "lucide-react";
import { luminaAssets } from "./assets";

export type HardwareItem = {
  key: "esp32" | "hcsr04" | "l298n" | "motor1" | "motor2" | "motor3" | "motor4" | "battery";
  image: string;
  name: string;
  ariaLabel: string;
  tone: "mint" | "sky" | "amber" | "rose" | "blue";
};

export type RobotItem = {
  key: string;
  kind: "rover" | "empty";
  label?: string;
  ariaLabel: string;
};

export const hardwareItems: readonly HardwareItem[] = [
  {
    key: "esp32",
    image: luminaAssets.hardwareIllustrations.esp32,
    name: "ESP32",
    ariaLabel: "ESP32 controller board connected",
    tone: "mint",
  },
  {
    key: "hcsr04",
    image: luminaAssets.hardwareIllustrations.hcsr04,
    name: "HC-SR04",
    ariaLabel: "HC-SR04 ultrasonic sensor connected",
    tone: "sky",
  },
  {
    key: "l298n",
    image: luminaAssets.hardwareIllustrations.l298n,
    name: "L298N",
    ariaLabel: "L298N motor driver connected",
    tone: "amber",
  },
  {
    key: "motor1",
    image: luminaAssets.hardwareIllustrations.motor,
    name: "Motor 1",
    ariaLabel: "Rover motor 1 connected",
    tone: "rose",
  },
  {
    key: "motor2",
    image: luminaAssets.hardwareIllustrations.motor,
    name: "Motor 2",
    ariaLabel: "Rover motor 2 connected",
    tone: "rose",
  },
  {
    key: "motor3",
    image: luminaAssets.hardwareIllustrations.motor,
    name: "Motor 3",
    ariaLabel: "Rover motor 3 connected",
    tone: "rose",
  },
  {
    key: "motor4",
    image: luminaAssets.hardwareIllustrations.motor,
    name: "Motor 4",
    ariaLabel: "Rover motor 4 connected",
    tone: "rose",
  },
  {
    key: "battery",
    image: luminaAssets.hardwareIllustrations.battery,
    name: "Battery",
    ariaLabel: "Battery connected",
    tone: "blue",
  },
] as const;

export const robotItems: readonly RobotItem[] = [
  { key: "rover-01", kind: "rover", label: "Rover-01", ariaLabel: "Rover-01" },
  { key: "slot-01", kind: "empty", ariaLabel: "Empty robot slot 1" },
  { key: "slot-02", kind: "empty", ariaLabel: "Empty robot slot 2" },
  { key: "slot-03", kind: "empty", ariaLabel: "Empty robot slot 3" },
  { key: "slot-04", kind: "empty", ariaLabel: "Empty robot slot 4" },
] as const;

export const navItems = [
  { Icon: Home, label: "Garage", state: "active" },
  { Icon: Flag, label: "Missions", state: "soon" },
  { Icon: Wrench, label: "Engineer", state: "soon" },
  { Icon: ShoppingCart, label: "Store", state: "soon" },
  { Icon: UserRound, label: "Profile", state: "soon" },
] as const;
