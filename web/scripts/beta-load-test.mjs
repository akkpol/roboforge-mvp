#!/usr/bin/env node
import { createClient } from "@supabase/supabase-js";

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, rawValue] = arg.replace(/^--/, "").split("=");
    return [key, rawValue ?? "true"];
  }),
);

const users = Number(args.get("users") ?? 100);
const robots = Number(args.get("robots") ?? Math.min(users, 300));
const execute = args.get("execute") === "true";
const batchId = args.get("batch") ?? `seed-${Date.now()}`;
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function estimateRows() {
  return {
    beta_applications: Math.round(users * 0.35),
    connection_sessions: users * 2,
    control_sessions: Math.round(users * 1.2),
    feedback_reports: Math.round(users * 0.25),
    owner_profiles: users,
    robot_claim_codes: robots,
    robot_events: users * 5,
    robot_progress: robots,
    robots,
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

  const connectionRows = Array.from({ length: users * 2 }, (_, index) => {
    const robot = robotIds[index % robotIds.length];
    const success = index % 4 !== 0;
    return {
      device_mode: "local_wifi",
      ended_at: new Date().toISOString(),
      failure_reason: success ? null : "wifi_not_found",
      metadata: { batchId },
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
