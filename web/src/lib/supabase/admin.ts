import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";

type HealthResult<T> =
  | { data: T; error: null; ready: true }
  | { data: null; error: string; ready: false };

export type BetaHealth = {
  counts: {
    claimCodes: number;
    claimedRobots: number;
    connectionSessions: number;
    controlSessions: number;
    feedbackReports: number;
    ownerProfiles: number;
    robotEvents: number;
    robots: number;
  };
  claimKits: Array<{
    claimed_at: string | null;
    created_at: string;
    expires_at: string | null;
    robot_id: string;
    unit_code: string;
  }>;
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
