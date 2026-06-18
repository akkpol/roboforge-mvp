#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const rawArgs = process.argv.slice(2);
const args = new Set(rawArgs);
const baseUrlArg = rawArgs.find((arg) => arg.startsWith("--base-url="));
const baseUrl = (baseUrlArg?.split("=").slice(1).join("=") ?? "http://192.168.4.1").replace(/\/$/, "");
const evidenceOutArg = rawArgs.find((arg) => arg.startsWith("--evidence-out="));
const evidenceOut = evidenceOutArg?.split("=").slice(1).join("=");
const runDriveCheck = args.has("--raised-wheels");
const evidence = {
  adminBenchChecks: null,
  baseUrl,
  checks: [],
  completedAt: null,
  device: null,
  driveCheck: runDriveCheck,
  error: null,
  ok: false,
  startedAt: new Date().toISOString(),
};

function usage() {
  console.log(`RoboForge rover protocol check

Usage:
  node scripts/rover-protocol-check.mjs [--base-url=http://192.168.4.1]
  node scripts/rover-protocol-check.mjs --raised-wheels
  node scripts/rover-protocol-check.mjs --evidence-out=bench-evidence.json

Default mode only checks info/status/stop. The --raised-wheels mode arms the
rover and sends a tiny drive command, so use it only with wheels lifted.

The optional --evidence-out path writes JSON that can be copied into the
RoboForge Ops Bench Checklist notes. It does not include Wi-Fi passwords.`);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function recordCheck(key, passed, detail) {
  evidence.checks.push({ detail, key, passed });
}

function expect(key, condition, detail, message = detail) {
  recordCheck(key, Boolean(condition), detail);
  assert(condition, message);
}

async function writeEvidence() {
  if (!evidenceOut) return;

  const outputPath = resolve(evidenceOut);
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
  console.log(`Wrote bench evidence to ${outputPath}`);
}

async function request(path, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2200);

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers ?? {}),
      },
      signal: controller.signal,
    });

    let body = null;
    try {
      body = await response.json();
    } catch {
      body = null;
    }

    if (!response.ok) {
      const detail = body ? ` ${JSON.stringify(body)}` : "";
      throw new Error(`${options.method ?? "GET"} ${path} failed: ${response.status}${detail}`);
    }

    return body;
  } finally {
    clearTimeout(timeout);
  }
}

function buildAdminBenchChecks() {
  return {
    apVisible: true,
    armOk: runDriveCheck,
    batteryVisible: true,
    emergencyStopOk: runDriveCheck,
    floorClear: false,
    infoOk: true,
    lowSpeedDriveOk: runDriveCheck,
    powerOn: true,
    shortFloorDriveOk: false,
    statusOk: true,
    stopOk: true,
    wheelsRaised: runDriveCheck,
    wifiJoined: true,
    zeroReleaseOk: runDriveCheck,
  };
}

async function main() {
  if (args.has("--help") || args.has("-h")) {
    usage();
    return;
  }

  console.log(`Checking RoboForge rover at ${baseUrl}`);

  const info = await request("/api/v1/info");
  expect("infoOk", info.protocolVersion === "v1", "Info endpoint returned protocol v1", "Expected protocolVersion v1");
  expect("unitCode", typeof info.unitCode === "string" && info.unitCode.length > 0, "Info endpoint returned a unit code", "Expected unitCode");
  expect("endpointList", Array.isArray(info.endpoints), "Info endpoint returned endpoint list", "Expected endpoint list from /api/v1/info");
  expect("stopEndpoint", info.endpoints.includes("POST /api/v1/stop"), "Info endpoint lists stop command", "Expected stop endpoint");

  const status = await request("/api/v1/status");
  expect("statusOk", typeof status.firmwareVersion === "string", "Status endpoint returned firmware version", "Expected firmwareVersion");
  expect("batteryVisible", typeof status.batteryVoltage === "number", "Status endpoint returned battery voltage", "Expected batteryVoltage");
  expect("maxSpeed", typeof status.maxSpeed === "number", "Status endpoint returned max speed", "Expected maxSpeed");

  const stopped = await request("/api/v1/stop", {
    method: "POST",
    body: "{}",
  });
  expect("stopOk", stopped.armed === false, "Stop command disarmed controls", "Stop should leave controls disarmed");

  evidence.device = {
    batteryPercent: status.batteryPercent,
    batteryVoltage: status.batteryVoltage,
    deviceName: info.deviceName,
    firmwareVersion: status.firmwareVersion,
    maxSpeed: status.maxSpeed,
    protocolVersion: info.protocolVersion,
    robotType: info.robotType,
    unitCode: info.unitCode,
  };

  if (runDriveCheck) {
    const armed = await request("/api/v1/arm", {
      method: "POST",
      body: JSON.stringify({ armed: true }),
    });
    expect("armOk", armed.armed === true, "Arm command enabled controls", "Arm endpoint did not arm controls");

    await request("/api/v1/drive", {
      method: "POST",
      body: JSON.stringify({
        sequence: 1,
        throttle: 0.12,
        steering: 0,
        speedLimit: 0.15,
      }),
    });
    recordCheck("lowSpeedDriveOk", true, "Low-speed drive command accepted");

    await new Promise((resolve) => setTimeout(resolve, 160));

    await request("/api/v1/drive", {
      method: "POST",
      body: JSON.stringify({
        sequence: 2,
        throttle: 0,
        steering: 0,
        speedLimit: 0.15,
      }),
    });
    recordCheck("zeroReleaseOk", true, "Zero throttle release command accepted");

    const finalStatus = await request("/api/v1/stop", {
      method: "POST",
      body: "{}",
    });
    expect("emergencyStopOk", finalStatus.armed === false, "Final stop disarmed controls", "Final stop should disarm controls");
  }

  evidence.adminBenchChecks = buildAdminBenchChecks();
  evidence.completedAt = new Date().toISOString();
  evidence.ok = true;

  console.log(
    JSON.stringify(
      {
        ok: true,
        baseUrl,
        deviceName: info.deviceName,
        firmwareVersion: status.firmwareVersion,
        protocolVersion: info.protocolVersion,
        unitCode: info.unitCode,
        driveCheck: runDriveCheck,
        evidenceOut: evidenceOut ?? null,
      },
      null,
      2,
    ),
  );
  await writeEvidence();

  if (!runDriveCheck) {
    console.log("Drive check skipped. Run again with --raised-wheels after lifting the wheels.");
  }
}

main().catch((error) => {
  evidence.completedAt = new Date().toISOString();
  evidence.error = error.message;
  console.error("Rover protocol check failed.");
  console.error(error.message);
  writeEvidence()
    .catch((writeError) => {
      console.error(`Could not write bench evidence: ${writeError.message}`);
    })
    .finally(() => {
      process.exit(1);
    });
});
