import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  embeddedEsp32RoverConfigTemplate,
  embeddedModuleManifests,
  embeddedRoverKitManifest,
} from "./roboforge-contract-data";

export type ModuleManifest = {
  manifestVersion: string;
  moduleId: string;
  moduleType: "brain" | "mechanism" | "actuator" | "sensor" | "power" | "communication";
  displayName: string;
  bus: string;
  capabilities: string[];
  requiresFirmware: string;
  safetyNotes: string[];
  compatibleRobotTypes?: string[];
  metadata?: Record<string, unknown>;
};

export type KitManifest = {
  manifestVersion: string;
  kitId: string;
  displayName: string;
  robotType: string;
  protocolVersion: string;
  requiredModuleIds: string[];
  optionalSlots: Array<{
    slotId: string;
    displayName: string;
    acceptedModuleTypes: string[];
    acceptedBuses: string[];
    recommendedModuleIds: string[];
  }>;
  profileDefaults: Record<string, unknown>;
  firmware: {
    targetBoard: string;
    framework: string;
    configTemplate: string;
    currentVersion: string;
  };
  safetyGates: string[];
};

export type ModuleRegistry = {
  registryVersion: string;
  kits: KitManifest[];
  modules: ModuleManifest[];
};

export type FirmwareConfigInput = {
  apPassword: string;
  batteryCells: number;
  firmwareVersion: string;
  robotType: string;
  unitCode: string;
};

export type FirmwareConfigPackage = {
  packageType: "config_only";
  targetBoard: string;
  protocolVersion: string;
  safetyStatus: "requires_bench_proof";
  nextRequiredProof: "bench_protocol_check";
  files: Array<{
    path: string;
    language: "c";
    content: string;
  }>;
};

export type OtaFlashStatus = {
  enabled: false;
  status: "disabled_until_recovery_proven";
  reason: string;
  requiredProof: string[];
};

const registryVersion = "0.1";

function resolveWorkspaceFile(...segments: string[]) {
  const candidates = [
    resolve(/*turbopackIgnore: true*/ process.cwd(), ...segments),
    resolve(/*turbopackIgnore: true*/ process.cwd(), "..", ...segments),
  ];
  return candidates.find((candidate) => existsSync(candidate)) ?? candidates[0];
}

function readJsonFile<T>(...segments: string[]) {
  return JSON.parse(readFileSync(resolveWorkspaceFile(...segments), "utf8")) as T;
}

function readTextFile(...segments: string[]) {
  return readFileSync(resolveWorkspaceFile(...segments), "utf8");
}

function walkJsonFiles(path: string): string[] {
  const root = existsSync(path) ? path : resolveWorkspaceFile(path);
  const entries = readdirSync(root, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const child = resolve(root, entry.name);
    if (entry.isDirectory()) {
      return walkJsonFiles(child);
    }
    return entry.isFile() && entry.name.endsWith(".json") ? [child] : [];
  });
}

function assertString(value: unknown, field: string): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Invalid RoboForge contract: ${field} must be a non-empty string.`);
  }
}

function assertStringArray(value: unknown, field: string): asserts value is string[] {
  if (!Array.isArray(value) || value.length === 0 || value.some((item) => typeof item !== "string")) {
    throw new Error(`Invalid RoboForge contract: ${field} must be a non-empty string array.`);
  }
}

function assertRecord(value: unknown, field: string): asserts value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Invalid RoboForge contract: ${field} must be an object.`);
  }
}

function assertModuleManifest(value: unknown): asserts value is ModuleManifest {
  assertRecord(value, "module manifest");
  assertString(value.manifestVersion, "manifestVersion");
  assertString(value.moduleId, "moduleId");
  assertString(value.moduleType, "moduleType");
  assertString(value.displayName, "displayName");
  assertString(value.bus, "bus");
  assertString(value.requiresFirmware, "requiresFirmware");
  assertStringArray(value.capabilities, "capabilities");
  if (!Array.isArray(value.safetyNotes)) {
    throw new Error("Invalid RoboForge contract: safetyNotes must be an array.");
  }
}

function assertKitManifest(value: unknown): asserts value is KitManifest {
  assertRecord(value, "kit manifest");
  assertString(value.manifestVersion, "manifestVersion");
  assertString(value.kitId, "kitId");
  assertString(value.displayName, "displayName");
  assertString(value.robotType, "robotType");
  assertString(value.protocolVersion, "protocolVersion");
  assertStringArray(value.requiredModuleIds, "requiredModuleIds");
  assertStringArray(value.safetyGates, "safetyGates");
  assertRecord(value.firmware, "firmware");
  assertString(value.firmware.targetBoard, "firmware.targetBoard");
  assertString(value.firmware.configTemplate, "firmware.configTemplate");
}

function sanitizeDefineValue(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll("\"", "\\\"");
}

function renderTemplate(template: string, values: Record<string, string | number>) {
  return Object.entries(values).reduce(
    (rendered, [key, value]) => rendered.replaceAll(`{{${key}}}`, String(value)),
    template,
  );
}

export function loadRoverKitManifest() {
  const kitPath = resolveWorkspaceFile("hardware", "kits", "rover-01", "kit-manifest.json");
  const kit = existsSync(kitPath)
    ? readJsonFile<unknown>("hardware", "kits", "rover-01", "kit-manifest.json")
    : embeddedRoverKitManifest;
  assertKitManifest(kit);
  return kit;
}

export function loadModuleManifests() {
  const modulesRoot = resolveWorkspaceFile("hardware", "modules");
  const manifests = existsSync(modulesRoot)
    ? walkJsonFiles(modulesRoot).map(
        (filePath) => JSON.parse(readFileSync(filePath, "utf8")) as unknown,
      )
    : embeddedModuleManifests;

  return manifests
    .map((manifest) => {
      assertModuleManifest(manifest);
      return manifest;
    })
    .sort((left, right) => left.moduleId.localeCompare(right.moduleId));
}

export function getModuleRegistry(): ModuleRegistry {
  return {
    registryVersion,
    kits: [loadRoverKitManifest()],
    modules: loadModuleManifests(),
  };
}

export function generateFirmwareConfigText(input: FirmwareConfigInput) {
  const kit = loadRoverKitManifest();
  const templatePath = resolveWorkspaceFile(...kit.firmware.configTemplate.split("/"));
  const template = existsSync(templatePath)
    ? readTextFile(...kit.firmware.configTemplate.split("/"))
    : embeddedEsp32RoverConfigTemplate;

  return renderTemplate(template, {
    AP_PASSWORD: sanitizeDefineValue(input.apPassword),
    BATTERY_CELLS: input.batteryCells,
    FIRMWARE_VERSION: sanitizeDefineValue(input.firmwareVersion),
    PROTOCOL_VERSION: kit.protocolVersion,
    ROBOT_TYPE: sanitizeDefineValue(input.robotType),
    UNIT_CODE: sanitizeDefineValue(input.unitCode),
  });
}

export function generateFirmwareConfigPackage(input: FirmwareConfigInput): FirmwareConfigPackage {
  const kit = loadRoverKitManifest();

  return {
    packageType: "config_only",
    targetBoard: kit.firmware.targetBoard,
    protocolVersion: kit.protocolVersion,
    safetyStatus: "requires_bench_proof",
    nextRequiredProof: "bench_protocol_check",
    files: [
      {
        path: "firmware/include/config.h",
        language: "c",
        content: generateFirmwareConfigText(input),
      },
    ],
  };
}

export function getOtaFlashStatus(): OtaFlashStatus {
  return {
    enabled: false,
    status: "disabled_until_recovery_proven",
    reason:
      "OTA flashing is blocked until USB recovery, signed package verification, and rollback proof pass on a real Rover-01 kit.",
    requiredProof: [
      "usb_recovery_verified",
      "signed_package_verification",
      "rollback_recovery_verified",
      "bench_protocol_check",
      "raised_wheel_test_passed",
    ],
  };
}

export function hardwareContractSourceDirectory() {
  return dirname(resolveWorkspaceFile("hardware", "standards", "module-manifest.schema.json"));
}
