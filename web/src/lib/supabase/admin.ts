import "server-only";

import { createClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "@/lib/supabase/env";

type HealthResult<T> =
  | { data: T; error: null; ready: true }
  | { data: null; error: string; ready: false };

type CountTable =
  | "connection_sessions"
  | "control_sessions"
  | "feedback_reports"
  | "owner_profiles"
  | "robot_claim_codes"
  | "robot_events"
  | "robots";

export type BetaHealth = {
  counts: {
    claimedRobots: number;
    connectionSessions: number;
    controlSessions: number;
    feedbackReports: number;
    ownerProfiles: number;
    robotEvents: number;
    robots: number;
  };
  connectionResults: Record<string, number>;
  controlSummary: {
    commandCount: number;
    completedSafely: number;
    emergencyStopCount: number;
  };
  latestFeedback: Array<{
    created_at: string;
    message: string;
    problem_type: string | null;
    rating: number | null;
  }>;
  topEvents: Array<{
    created_at: string;
    event_type: string;
    message: string;
    severity: string;
  }>;
};

export function getAdminEmails() {
  const { adminEmails } = getSupabaseEnv();

  return adminEmails
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

function createAdminClient() {
  const { serviceRoleKey, url } = getSupabaseEnv();

  if (!url || !serviceRoleKey) return null;

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
    },
  });
}

async function countRows(
  client: NonNullable<ReturnType<typeof createAdminClient>>,
  table: CountTable,
) {
  const { count, error } = await client
    .from(table)
    .select("*", { count: "exact", head: true });

  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function getBetaHealth(): Promise<HealthResult<BetaHealth>> {
  const client = createAdminClient();

  if (!client) {
    return {
      data: null,
      error:
        "Add SUPABASE_SERVICE_ROLE_KEY in the Vercel project and local env to enable the Ops view.",
      ready: false,
    };
  }

  try {
    const [
      ownerProfiles,
      robots,
      connectionSessions,
      controlSessions,
      robotEvents,
      feedbackReports,
      claimedCodes,
      connectionRows,
      controlRows,
      eventRows,
      feedbackRows,
    ] = await Promise.all([
      countRows(client, "owner_profiles"),
      countRows(client, "robots"),
      countRows(client, "connection_sessions"),
      countRows(client, "control_sessions"),
      countRows(client, "robot_events"),
      countRows(client, "feedback_reports"),
      client
        .from("robot_claim_codes")
        .select("*", { count: "exact", head: true })
        .not("claimed_by", "is", null),
      client.from("connection_sessions").select("result"),
      client
        .from("control_sessions")
        .select("command_count, emergency_stop_count, completed_safely"),
      client
        .from("robot_events")
        .select("created_at, event_type, severity, message")
        .order("created_at", { ascending: false })
        .limit(8),
      client
        .from("feedback_reports")
        .select("created_at, rating, problem_type, message")
        .order("created_at", { ascending: false })
        .limit(6),
    ]);

    if (claimedCodes.error) throw new Error(claimedCodes.error.message);
    if (connectionRows.error) throw new Error(connectionRows.error.message);
    if (controlRows.error) throw new Error(controlRows.error.message);
    if (eventRows.error) throw new Error(eventRows.error.message);
    if (feedbackRows.error) throw new Error(feedbackRows.error.message);

    const connectionResults = (connectionRows.data ?? []).reduce<Record<string, number>>(
      (accumulator, row) => {
        const result = typeof row.result === "string" ? row.result : "unknown";
        accumulator[result] = (accumulator[result] ?? 0) + 1;
        return accumulator;
      },
      {},
    );

    const controlSummary = (controlRows.data ?? []).reduce(
      (accumulator, row) => ({
        commandCount:
          accumulator.commandCount + Number(row.command_count ?? 0),
        completedSafely:
          accumulator.completedSafely + (row.completed_safely ? 1 : 0),
        emergencyStopCount:
          accumulator.emergencyStopCount + Number(row.emergency_stop_count ?? 0),
      }),
      { commandCount: 0, completedSafely: 0, emergencyStopCount: 0 },
    );

    return {
      data: {
        connectionResults,
        controlSummary,
        counts: {
          claimedRobots: claimedCodes.count ?? 0,
          connectionSessions,
          controlSessions,
          feedbackReports,
          ownerProfiles,
          robotEvents,
          robots,
        },
        latestFeedback: feedbackRows.data ?? [],
        topEvents: eventRows.data ?? [],
      },
      error: null,
      ready: true,
    };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : "Could not load beta health.",
      ready: false,
    };
  }
}
