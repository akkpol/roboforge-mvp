import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";

type HealthResult<T> =
  | { data: T; error: null; ready: true }
  | { data: null; error: string; ready: false };

export type BetaHealth = {
  counts: {
    claimCodes: number;
    claimedRobots: number;
    benchPassed: number;
    benchTests: number;
    connectionSessions: number;
    controlSessions: number;
    deviceProfiles: number;
    digitalRobots: number;
    feedbackReports: number;
    floorReadyRobots: number;
    ownerProfiles: number;
    physicalRobots: number;
    raisedWheelPassed: number;
    robotEvents: number;
    robots: number;
  };
  claimKits: Array<{
    ap_ssid: string | null;
    battery_config: Record<string, unknown> | null;
    claimed_at: string | null;
    created_at: string;
    expires_at: string | null;
    firmware_version: string | null;
    hardware_profile: Record<string, unknown> | null;
    protocol_version: string | null;
    readiness_status: string | null;
    robot_id: string;
    robot_type: string | null;
    unit_code: string;
  }>;
  connectionFailures?: Record<string, number>;
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
  latestBenchTests: Array<{
    checks: Record<string, unknown> | null;
    created_at: string;
    notes: string | null;
    result: string;
    robot_id: string;
    stage: string;
    unit_code: string | null;
  }>;
  topEvents: Array<{
    created_at: string;
    event_type: string;
    message: string;
    severity: string;
  }>;
};

export async function getBetaHealth(): Promise<HealthResult<BetaHealth>> {
  const client = await createServerSupabaseClient();

  if (!client) {
    return {
      data: null,
      error: "Supabase is not configured.",
      ready: false,
    };
  }

  const { data, error } = await client.rpc("get_beta_health");

  if (error) {
    return {
      data: null,
      error:
        error.message.includes("admin_required")
          ? "This account is not in app_admins yet."
          : error.message,
      ready: false,
    };
  }

  return {
    data: data as BetaHealth,
    error: null,
    ready: true,
  };
}
