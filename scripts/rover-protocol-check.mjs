#!/usr/bin/env node

const args = new Set(process.argv.slice(2));
const baseUrlArg = process.argv
  .slice(2)
  .find((arg) => arg.startsWith("--base-url="));
const baseUrl = (baseUrlArg?.split("=")[1] ?? "http://192.168.4.1").replace(/\/$/, "");
const runDriveCheck = args.has("--raised-wheels");

function usage() {
  console.log(`RoboForge rover protocol check

Usage:
  node scripts/rover-protocol-check.mjs [--base-url=http://192.168.4.1]
  node scripts/rover-protocol-check.mjs --raised-wheels

Default mode only checks info/status/stop. The --raised-wheels mode arms the
rover and sends a tiny drive command, so use it only with wheels lifted.`);
}

if (args.has("--help") || args.has("-h")) {
  usage();
  process.exit(0);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
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

async function main() {
  console.log(`Checking RoboForge rover at ${baseUrl}`);

  const info = await request("/api/v1/info");
  assert(info.protocolVersion === "v1", "Expected protocolVersion v1");
  assert(typeof info.unitCode === "string" && info.unitCode.length > 0, "Expected unitCode");
  assert(Array.isArray(info.endpoints), "Expected endpoint list from /api/v1/info");
  assert(info.endpoints.includes("POST /api/v1/stop"), "Expected stop endpoint");

  const status = await request("/api/v1/status");
  assert(typeof status.firmwareVersion === "string", "Expected firmwareVersion");
  assert(typeof status.batteryVoltage === "number", "Expected batteryVoltage");
  assert(typeof status.maxSpeed === "number", "Expected maxSpeed");

  const stopped = await request("/api/v1/stop", {
    method: "POST",
    body: "{}",
  });
  assert(stopped.armed === false, "Stop should leave controls disarmed");

  if (runDriveCheck) {
    const armed = await request("/api/v1/arm", {
      method: "POST",
      body: JSON.stringify({ armed: true }),
    });
    assert(armed.armed === true, "Arm endpoint did not arm controls");

    await request("/api/v1/drive", {
      method: "POST",
      body: JSON.stringify({
        sequence: 1,
        throttle: 0.12,
        steering: 0,
        speedLimit: 0.15,
      }),
    });

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

    const finalStatus = await request("/api/v1/stop", {
      method: "POST",
      body: "{}",
    });
    assert(finalStatus.armed === false, "Final stop should disarm controls");
  }

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
      },
      null,
      2,
    ),
  );

  if (!runDriveCheck) {
    console.log("Drive check skipped. Run again with --raised-wheels after lifting the wheels.");
  }
}

main().catch((error) => {
  console.error("Rover protocol check failed.");
  console.error(error.message);
  process.exit(1);
});
