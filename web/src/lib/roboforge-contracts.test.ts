import { describe, expect, it } from "vitest";

import {
  generateFirmwareConfigPackage,
  getModuleRegistry,
  getOtaFlashStatus,
  loadRoverKitManifest,
} from "./roboforge-contracts";

describe("RoboForge production foundation contracts", () => {
  it("loads the Rover-01 kit manifest as the first production hardware contract", () => {
    const kit = loadRoverKitManifest();

    expect(kit.kitId).toBe("rf.kit.rover-01.beta");
    expect(kit.robotType).toBe("rover");
    expect(kit.protocolVersion).toBe("v1");
    expect(kit.requiredModuleIds).toContain("rf.brain.esp32.devkit-v1");
    expect(kit.safetyGates).toContain("raised_wheel_test_passed");
  });

  it("returns a module registry without per-kit secrets", () => {
    const registry = getModuleRegistry();

    expect(registry.kits[0]?.kitId).toBe("rf.kit.rover-01.beta");
    expect(registry.modules.some((module) => module.moduleId === "rf.sensor.distance.vl53l0x")).toBe(true);
    expect(JSON.stringify(registry)).not.toContain("ROBOFORGE_AP_PASSWORD");
    expect(JSON.stringify(registry)).not.toContain("forge-");
  });

  it("generates a config-only ESP32 firmware package from a robot profile", () => {
    const generated = generateFirmwareConfigPackage({
      apPassword: "forge-RF0001-1234",
      batteryCells: 2,
      firmwareVersion: "0.1.0",
      robotType: "rover",
      unitCode: "RF-RV-0001",
    });

    expect(generated.packageType).toBe("config_only");
    expect(generated.targetBoard).toBe("esp32dev");
    expect(generated.protocolVersion).toBe("v1");
    expect(generated.files).toHaveLength(1);
    expect(generated.files[0]).toMatchObject({
      path: "firmware/include/config.h",
      language: "c",
    });
    expect(generated.files[0]?.content).toContain('#define ROBOFORGE_UNIT_CODE "RF-RV-0001"');
    expect(generated.files[0]?.content).toContain("#define ROBOFORGE_BATTERY_CELLS 2");
    expect(generated.nextRequiredProof).toBe("bench_protocol_check");
  });

  it("keeps OTA flashing disabled until recovery proof exists", () => {
    expect(getOtaFlashStatus()).toMatchObject({
      enabled: false,
      status: "disabled_until_recovery_proven",
    });
  });
});
