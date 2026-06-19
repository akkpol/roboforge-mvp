#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const envFiles = [".env.local", ".env"];

for (const file of envFiles) {
  const path = resolve(process.cwd(), file);
  if (!existsSync(path)) continue;

  const lines = readFileSync(path, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;

    const [key, ...rawValue] = trimmed.split("=");
    if (process.env[key]) continue;

    process.env[key] = rawValue
      .join("=")
      .trim()
      .replace(/^["']|["']$/g, "");
  }
}

const expectedTables = [
  "owner_profiles",
  "robots",
  "robot_progress",
  "robot_interests",
  "beta_applications",
  "workspaces",
  "workspace_members",
  "robot_claim_codes",
  "robot_devices",
  "connection_sessions",
  "control_sessions",
  "robot_bench_tests",
  "robot_events",
  "lyra_sessions",
  "feedback_reports",
  "app_admins",
];

const expectedRpcs = ["is_app_admin", "get_beta_health"];

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
const publishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ?? "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";
const key = serviceRoleKey || publishableKey;

function tableCheckStatus(result) {
  if (!result.error) return "ok";
  if (result.error.message.includes("relation") && result.error.message.includes("does not exist")) {
    return "missing";
  }
  if (!serviceRoleKey && !result.error.message) return "permission_limited";
  if (["42501", "PGRST301"].includes(result.error.code)) return "permission_limited";
  return "error";
}

function rpcCheckStatus(result) {
  if (!result.error) return "ok";
  if (result.error.message.includes("admin_required")) return "present_admin_gated";
  if (result.error.message.includes("Could not find the function")) return "missing";
  if (result.error.code === "42501") return "permission_limited";
  if (result.error.code === "PGRST202") return "missing";
  return "error";
}

function countProblem(items) {
  return items.filter((item) => item.status !== "ok").length;
}

if (!url || !key) {
  console.log(JSON.stringify(
    {
      ok: false,
      accessMode: serviceRoleKey ? "service_role_read_only" : "publishable_rls_limited",
      checks: {
        env: {
          hasPublishableKey: Boolean(publishableKey),
          hasServiceRoleKey: Boolean(serviceRoleKey),
          hasUrl: Boolean(url),
          status: "missing_env",
        },
      },
      note: "Set NEXT_PUBLIC_SUPABASE_URL plus SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY before running this check.",
    },
    null,
    2,
  ));
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false },
});

const tableResults = [];
for (const table of expectedTables) {
  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true });

  tableResults.push({
    count: typeof count === "number" ? count : null,
    code: error?.code ?? null,
    error: error?.message ?? null,
    status: tableCheckStatus({ error }),
    table,
  });
}

const rpcResults = [];
for (const rpc of expectedRpcs) {
  const { error } = await supabase.rpc(rpc);
  rpcResults.push({
    code: error?.code ?? null,
    error: error?.message ?? null,
    rpc,
    status: rpcCheckStatus({ error }),
  });
}

const requiredTablesMissing = tableResults.filter((item) => item.status === "missing");
const tableErrors = tableResults.filter((item) => item.status === "error");
const rpcMissing = rpcResults.filter((item) => item.status === "missing");
const betaHealthGate = rpcResults.find((item) => item.rpc === "get_beta_health");
const ok =
  requiredTablesMissing.length === 0 &&
  tableErrors.length === 0 &&
  rpcMissing.length === 0;

console.log(JSON.stringify(
  {
    ok,
    accessMode: serviceRoleKey ? "service_role_read_only" : "publishable_rls_limited",
    verificationLevel: serviceRoleKey ? "full_read_only" : "limited_by_rls",
    checks: {
      env: {
        hasPublishableKey: Boolean(publishableKey),
        hasServiceRoleKey: Boolean(serviceRoleKey),
        hasUrl: Boolean(url),
        status: "ok",
      },
      rpc: {
        problemCount: countProblem(rpcResults),
        results: rpcResults,
      },
      tables: {
        problemCount: countProblem(tableResults),
        results: tableResults,
      },
    },
    interpretation: {
      betaHealth:
        betaHealthGate?.status === "present_admin_gated"
          ? "get_beta_health exists and is correctly admin-gated for this non-session CLI context."
          : "get_beta_health should return data only for an authenticated app_admins user.",
      joystickRows:
        "No high-frequency joystick table is expected. Live commands should remain local to the robot Wi-Fi.",
      next:
        ok && serviceRoleKey
          ? "Open /admin with an app_admins account, then compare the dashboard numbers with this read-only check."
          : ok
            ? "Set SUPABASE_SERVICE_ROLE_KEY locally for a full read-only count check, or open /admin with an app_admins account for the gated dashboard."
            : "Apply web/supabase/schema.sql or inspect the listed missing/error items before beta testing.",
    },
  },
  null,
  2,
));

process.exit(ok ? 0 : 1);
