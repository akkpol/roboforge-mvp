#!/usr/bin/env node
import { createClient } from "@supabase/supabase-js";

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, rawValue] = arg.replace(/^--/, "").split("=");
    return [key, rawValue ?? "true"];
  }),
);

function integerArg(key, fallback) {
  const value = Number(args.get(key) ?? fallback);
  if (Number.isInteger(value) && value >= 0) return value;
  console.error(`--${key} must be a non-negative integer.`);
  process.exit(1);
}

const users = integerArg("users", 100);
const robots = integerArg("robots", Math.min(users, 300));
const execute = args.get("execute") === "true";
const batchId = args.get("batch") ?? `seed-${Date.now()}`;
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (users < 1) {
  console.error("--users must be at least 1.");
  process.exit(1);
}

if (execute && robots < 1) {
  console.error("--robots must be at least 1 when --execute=true.");
  process.exit(1);
}

function estimateRows() {
  return {
    beta_applications: Math.round(users * 0.35),
    connection_sessions: users * 2,
    control_sessions: Math.round(users * 1.2),
    feedback_reports: Math.round(users * 0.25),
    owner_profiles: users,
    robot_claim_codes: robots,
    robot_bench_tests: robots * 2,
    robot_devices: robots,
    robot_events: users * 5,
    robot_progress: robots,
    robots,
  };
}

function roundMetric(value) {
  return Math.round(value * 100) / 100;
}

function buildReadinessReport(rows) {
  const totalRows = Object.values(rows).reduce((sum, value) => sum + value, 0);
  const ownerOutcomeRows =
    rows.connection_sessions +
    rows.control_sessions +
    rows.feedback_reports +
    rows.robot_bench_tests +
    rows.robot_events;

  return {
    assumptions: {
      commandPath: "Live joystick commands stay on the robot local Wi-Fi API.",
      hardwareProfile:
        "Seeded rows model the current Rover candidate: ESP32/L298N/2S Li-ion plus variants.",
      liveJoystickRowsInSupabase: 0,
      targetRobots: robots,
      targetUsers: users,
    },
    gates: [
      {
        check: "Supabase stays a system of record, not a joystick stream.",
        evidence:
          "The generated data models summaries, events, bench evidence, and feedback only.",
        status: "pass-in-plan",
      },
      {
        check: "The admin dashboard has enough rows to review beta health.",
        evidence:
          "Seeded rows cover owner profiles, robots, devices, bench tests, connection sessions, control summaries, events, and feedback.",
        status: "pass-in-plan",
      },
      {
        check: "RLS and admin RPC behavior are tested against real Supabase.",
        evidence:
          "Requires --execute on a disposable Supabase branch or test project, then /admin verification.",
        status: execute ? "requires-post-seed-check" : "not-run-in-dry-run",
      },
      {
        check: "Physical hardware is not falsely marked proven.",
        evidence:
          "Seeded hardware is beta evidence simulation. Real Rover-01 still needs bench and raised-wheel evidence from the actual kit.",
        status: "requires-real-hardware",
      },
    ],
    rowBudget: {
      authUsers: users,
      ownerOutcomeRows,
      rowsPerRobot: robots > 0 ? roundMetric(totalRows / robots) : 0,
      rowsPerUser: users > 0 ? roundMetric(totalRows / users) : 0,
      totalRows,
    },
  };
}

function printPlan() {
  const rows = estimateRows();
  const totalRows = Object.values(rows).reduce((sum, value) => sum + value, 0);

  console.log(JSON.stringify(
    {
      batchId,
      dryRun: !execute,
      note:
        "Default mode does not write to Supabase. Pass --execute only against a disposable branch or test project.",
      followUpCommands: [
        "npm run seed:beta -- --users=100 --robots=10",
        "npm run seed:beta -- --users=1000 --robots=300",
        "$env:ROBOFORGE_ALLOW_PROD_SEED='true'; npm run seed:beta -- --users=100 --robots=10 --execute --batch=<test-batch>",
      ],
      readinessReport: buildReadinessReport(rows),
      rows,
      totalRows,
      users,
      robots,
    },
    null,
    2,
  ));
}

if (!execute) {
  printPlan();
  process.exit(0);
}

if (!url || !serviceRoleKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Refusing to seed.",
  );
  process.exit(1);
}

if (process.env.ROBOFORGE_ALLOW_PROD_SEED !== "true") {
  console.error(
    "Set ROBOFORGE_ALLOW_PROD_SEED=true only for a disposable branch/test project.",
  );
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { persistSession: false },
});

function pickUser(index, userIds) {
  return userIds[index % userIds.length];
}

async function insertChunks(table, rows, size = 500) {
  for (let index = 0; index < rows.length; index += size) {
    const chunk = rows.slice(index, index + size);
    const { error } = await supabase.from(table).insert(chunk);
    if (error) throw new Error(`${table}: ${error.message}`);
  }
}

async function main() {
  printPlan();

  const userIds = [];

  for (let index = 0; index < users; index += 1) {
    const email = `${batchId}+${index}@roboforge.local`;
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      email_confirm: true,
      password: `RoboForge-${batchId}-${index}`,
      user_metadata: { batchId, seed: true },
    });

    if (error) throw new Error(`auth user ${index}: ${error.message}`);
    if (data.user?.id) userIds.push(data.user.id);
  }

  await insertChunks(
    "owner_profiles",
    userIds.map((id, index) => ({
      display_name: `Seed Owner ${index}`,
      id,
    })),
  );

  const robotRows = Array.from({ length: robots }, (_, index) => ({
    display_name: index % 2 === 0 ? "AEGIS-01" : "KITSUNE-X",
    owner_id: pickUser(index, userIds),
    robot_type: "rover",
    status: index % 3 === 0 ? "online" : "offline",
    theme: index % 2 === 0 ? "forge" : "neo",
    unit_code: `${batchId.toUpperCase()}-ROVER-${String(index).padStart(4, "0")}`,
  }));

  const { data: createdRobots, error: robotError } = await supabase
    .from("robots")
    .insert(robotRows)
    .select("id, owner_id, unit_code");

  if (robotError) throw new Error(`robots: ${robotError.message}`);

  const robotIds = createdRobots ?? [];

  await insertChunks(
    "robot_devices",
    robotIds.map((robot, index) => ({
      ap_ssid: `RoboForge-${robot.unit_code}`.slice(0, 31),
      battery_config: {
        calibration: 1,
        cells: index % 5 === 0 ? 1 : 2,
        chemistry: index % 4 === 0 ? "lipo" : "li-ion",
      },
      board_type: "esp32",
      firmware_version: "0.1.0",
      hardware_profile: {
        batteryCells: index % 5 === 0 ? 1 : 2,
        batteryChemistry: index % 4 === 0 ? "lipo" : "li-ion",
        boardModel: "ESP32 DevKit V1",
        hasFuse: true,
        hasPowerSwitch: true,
        motorChannels: "differential_drive",
        motorDriver: index % 3 === 0 ? "TB6612FNG" : "L298N",
        notes: `Seeded hardware profile for ${robot.unit_code}.`,
        wiringStatus: index % 6 === 0 ? "photo_received" : "bench_verified",
      },
      last_seen_at: index % 4 === 0 ? null : new Date().toISOString(),
      protocol_version: "v1",
      readiness_status:
        index % 7 === 0
          ? "blocked"
          : index % 3 === 0
            ? "ready_for_raised_wheels"
            : "ready_for_floor",
      robot_id: robot.id,
    })),
  );

  await insertChunks(
    "robot_progress",
    robotIds.map((robot, index) => ({
      battery_calibrated: index % 3 !== 0,
      first_connection_complete: index % 2 === 0,
      first_drive_complete: index % 4 !== 0,
      first_mission_complete: index % 5 === 0,
      ready_for_floor_test: index % 4 !== 0,
      robot_id: robot.id,
      setup_complete: index % 2 === 0,
    })),
  );

  await insertChunks(
    "robot_claim_codes",
    robotIds.map((robot, index) => ({
      claim_code_hash: `${batchId}-${index}-hash`,
      claimed_at: new Date().toISOString(),
      claimed_by: robot.owner_id,
      robot_id: robot.id,
      unit_code: robot.unit_code,
    })),
  );

  const benchChecks = {
    apVisible: true,
    batteryVisible: true,
    infoOk: true,
    powerOn: true,
    statusOk: true,
    stopOk: true,
    wifiJoined: true,
  };
  const raisedWheelChecks = {
    ...benchChecks,
    armOk: true,
    emergencyStopOk: true,
    lowSpeedDriveOk: true,
    wheelsRaised: true,
    zeroReleaseOk: true,
  };
  const benchRows = robotIds.flatMap((robot, index) => [
    {
      checks: benchChecks,
      notes: `Seeded bench check for ${robot.unit_code}.`,
      result: index % 7 === 0 ? "blocked" : "passed",
      robot_id: robot.id,
      stage: "bench",
      user_id: robot.owner_id,
    },
    {
      checks: raisedWheelChecks,
      notes: `Seeded raised-wheel check for ${robot.unit_code}.`,
      result: index % 7 === 0 ? "blocked" : "passed",
      robot_id: robot.id,
      stage: "raised_wheels",
      user_id: robot.owner_id,
    },
  ]);

  await insertChunks("robot_bench_tests", benchRows);

  const failureReasons = [
    "wifi_not_found",
    "cannot_open_local_page",
    "no_telemetry",
    "safety_unclear",
  ];
  const connectionRows = Array.from({ length: users * 2 }, (_, index) => {
    const robot = robotIds[index % robotIds.length];
    const success = index % 4 !== 0;
    const failureReason = success
      ? null
      : failureReasons[index % failureReasons.length];
    const unitCode = robot.unit_code.toUpperCase();
    return {
      device_mode: "local_wifi",
      ended_at: new Date().toISOString(),
      failure_reason: failureReason,
      metadata: {
        batchId,
        expected_ssid: `RoboForge-${unitCode}`.slice(0, 31),
        failure_reason: failureReason,
        local_cockpit_url: "http://192.168.4.1",
        protocol_version: "v1",
        result: success ? "success" : "failed",
        unit_code: unitCode,
      },
      result: success ? "success" : "failed",
      robot_id: robot.id,
      user_id: robot.owner_id,
    };
  });

  await insertChunks("connection_sessions", connectionRows);

  const controlRows = Array.from({ length: Math.round(users * 1.2) }, (_, index) => {
    const robot = robotIds[index % robotIds.length];
    return {
      command_count: 8 + (index % 12),
      completed_safely: index % 5 !== 0,
      emergency_stop_count: index % 5 === 0 ? 1 : 0,
      ended_at: new Date().toISOString(),
      metadata: { batchId },
      mode: "demo",
      robot_id: robot.id,
      user_id: robot.owner_id,
    };
  });

  await insertChunks("control_sessions", controlRows);

  const eventRows = Array.from({ length: users * 5 }, (_, index) => {
    const robot = robotIds[index % robotIds.length];
    const failed = index % 7 === 0;
    return {
      event_type: failed ? "connection_failed" : "connection_success",
      message: failed ? "Seeded connection failure." : "Seeded connection success.",
      metadata: { batchId },
      robot_id: robot.id,
      severity: failed ? "warning" : "info",
      user_id: robot.owner_id,
    };
  });

  await insertChunks("robot_events", eventRows);

  const feedbackRows = Array.from({ length: Math.round(users * 0.25) }, (_, index) => {
    const robot = robotIds[index % robotIds.length];
    return {
      message: `Seed feedback ${index}: connection flow was ${
        index % 2 === 0 ? "clear" : "confusing"
      }.`,
      metadata: { batchId },
      problem_type: index % 2 === 0 ? "general" : "wifi_not_found",
      rating: index % 2 === 0 ? 4 : 2,
      robot_id: robot.id,
      user_id: robot.owner_id,
    };
  });

  await insertChunks("feedback_reports", feedbackRows);

  console.log(`Seed complete for ${batchId}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
