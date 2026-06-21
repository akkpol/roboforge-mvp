"use server";

import { revalidatePath } from "next/cache";
import type { OwnerProgress, ThemeId, UpgradeInterest } from "@/lib/roboforge-data";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type ActionResult = {
  error: string | null;
  ok: boolean;
};

type ActionResultWithId = ActionResult & {
  id: string | null;
};

type ActiveRobot = {
  id: string;
  owner_id: string;
  robot_type: string;
  unit_code: string;
};

function claimErrorMessage(message: string) {
  if (message.includes("login_required")) return "Login is required.";
  if (message.includes("invalid_or_expired_claim_code")) {
    return "That robot code is invalid, already used, or expired.";
  }
  if (message.includes("claim_code_missing_robot")) {
    return "That code is not attached to a robot yet.";
  }
  return message;
}

function connectionMetadataForRobot(robot: ActiveRobot) {
  const unitCode = robot.unit_code.trim().toUpperCase() || "ROVER-01";

  return {
    expected_ssid: `RoboForge-${unitCode}`.slice(0, 31),
    local_cockpit_url: "http://192.168.4.1",
    protocol_version: "v1",
    robot_type: robot.robot_type || "rover",
    unit_code: unitCode,
  };
}

async function getActiveRobot() {
  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    return { error: "Supabase is not configured.", robot: null, supabase: null };
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: "Login is required.", robot: null, supabase };
  }

  const { data: robot, error: robotError } = await supabase
    .from("robots")
    .select("id, owner_id, robot_type, unit_code")
    .eq("owner_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .single();

  if (robotError || !robot) {
    return {
      error: robotError?.message ?? "No robot is available for this owner.",
      robot: null,
      supabase,
    };
  }

  return {
    error: null,
    robot: robot as ActiveRobot,
    supabase,
    userId: user.id,
  };
}

export async function updateRobotTheme(theme: ThemeId): Promise<ActionResult> {
  const { error, robot, supabase } = await getActiveRobot();
  if (error || !robot || !supabase) return { error, ok: false };

  const displayName = theme === "neo" ? "KITSUNE-X" : "AEGIS-01";
  const { error: updateError } = await supabase
    .from("robots")
    .update({ display_name: displayName, theme })
    .eq("id", robot.id)
    .eq("owner_id", robot.owner_id);

  if (updateError) return { error: updateError.message, ok: false };

  revalidatePath("/dashboard");
  return { error: null, ok: true };
}

export async function updateRobotProgress(
  patch: Partial<OwnerProgress>,
): Promise<ActionResult> {
  const { error, robot, supabase } = await getActiveRobot();
  if (error || !robot || !supabase) return { error, ok: false };

  const nextPatch = {
    ...patch,
    ready_for_floor_test:
      patch.ready_for_floor_test ??
      Boolean(
        patch.first_connection_complete &&
        patch.setup_complete &&
          patch.first_drive_complete &&
          patch.battery_calibrated,
      ),
  };

  const { error: updateError } = await supabase
    .from("robot_progress")
    .upsert(
      {
        ...nextPatch,
        robot_id: robot.id,
      },
      { onConflict: "robot_id" },
    );

  if (updateError) return { error: updateError.message, ok: false };

  revalidatePath("/dashboard");
  return { error: null, ok: true };
}

export async function saveRobotInterest(
  interest: UpgradeInterest,
): Promise<ActionResult> {
  const { error, robot, supabase } = await getActiveRobot();
  if (error || !robot || !supabase) return { error, ok: false };

  const { error: insertError } = await supabase.from("robot_interests").insert({
    interest,
    robot_id: robot.id,
  });

  if (insertError) return { error: insertError.message, ok: false };

  revalidatePath("/dashboard");
  return { error: null, ok: true };
}

export async function saveBetaApplication(input: {
  email: string;
  interest: UpgradeInterest;
  name: string;
}): Promise<ActionResult> {
  const { error, robot, supabase } = await getActiveRobot();
  if (error || !robot || !supabase) return { error, ok: false };

  const { error: insertError } = await supabase.from("beta_applications").insert({
    email: input.email,
    interest: input.interest,
    name: input.name,
    owner_id: robot.owner_id,
    robot_id: robot.id,
  });

  if (insertError) return { error: insertError.message, ok: false };

  revalidatePath("/dashboard");
  return { error: null, ok: true };
}

export async function claimRobotByCode(claimCode: string): Promise<ActionResult> {
  const supabase = await createServerSupabaseClient();

  if (!supabase) return { error: "Supabase is not configured.", ok: false };

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) return { error: "Login is required.", ok: false };

  const normalizedCode = claimCode.trim();

  if (normalizedCode.length < 6) {
    return { error: "Enter the robot claim code from the kit or QR card.", ok: false };
  }

  const { error: claimError } = await supabase.rpc("claim_robot_by_code", {
    raw_claim_code: normalizedCode,
  });

  if (claimError) {
    return { error: claimErrorMessage(claimError.message), ok: false };
  }

  revalidatePath("/dashboard");
  return { error: null, ok: true };
}

export async function startConnectionSession(): Promise<ActionResultWithId> {
  const { error, robot, supabase, userId } = await getActiveRobot();
  if (error || !robot || !supabase || !userId) return { error, id: null, ok: false };

  const metadata = {
    ...connectionMetadataForRobot(robot),
    started_from: "owner_connection_quest",
  };

  const { data, error: insertError } = await supabase
    .from("connection_sessions")
    .insert({
      device_mode: "local_wifi",
      metadata,
      robot_id: robot.id,
      user_id: userId,
    })
    .select("id")
    .single();

  if (insertError) return { error: insertError.message, id: null, ok: false };

  await supabase.from("robot_events").insert({
    event_type: "connection_quest_started",
    message: "Owner started the local Wi-Fi connection quest.",
    robot_id: robot.id,
    severity: "info",
    user_id: userId,
    connection_session_id: data.id,
    metadata,
  });

  revalidatePath("/dashboard");
  return { error: null, id: data.id as string, ok: true };
}

export async function finishConnectionSession(input: {
  failureReason?: string;
  sessionId: string;
  success: boolean;
}): Promise<ActionResult> {
  const { error, robot, supabase, userId } = await getActiveRobot();
  if (error || !robot || !supabase || !userId) return { error, ok: false };

  const result = input.success ? "success" : "failed";
  const failureReason = input.success
    ? null
    : input.failureReason?.trim() || "not_sure";
  const endedAt = new Date().toISOString();
  const metadata = {
    ...connectionMetadataForRobot(robot),
    failure_reason: failureReason,
    owner_reported_at: endedAt,
    result,
  };

  const { error: updateError } = await supabase
    .from("connection_sessions")
    .update({
      ended_at: endedAt,
      failure_reason: failureReason,
      metadata,
      result,
    })
    .eq("id", input.sessionId)
    .eq("user_id", userId);

  if (updateError) return { error: updateError.message, ok: false };

  await supabase.from("robot_events").insert({
    connection_session_id: input.sessionId,
    event_type: input.success ? "connection_success" : "connection_failed",
    message: input.success
      ? "Owner marked the robot connection as successful."
      : `Owner reported connection failure: ${failureReason}`,
    metadata,
    robot_id: robot.id,
    severity: input.success ? "info" : "warning",
    user_id: userId,
  });

  if (input.success) {
    await supabase.from("robot_progress").upsert(
      {
        first_connection_complete: true,
        robot_id: robot.id,
        setup_complete: true,
      },
      { onConflict: "robot_id" },
    );
  }

  revalidatePath("/dashboard");
  return { error: null, ok: true };
}

export async function startControlSession(input?: {
  connectionSessionId?: string | null;
  mode?: "demo" | "local_device";
}): Promise<ActionResultWithId> {
  const { error, robot, supabase, userId } = await getActiveRobot();
  if (error || !robot || !supabase || !userId) return { error, id: null, ok: false };

  const { data, error: insertError } = await supabase
    .from("control_sessions")
    .insert({
      connection_session_id: input?.connectionSessionId ?? null,
      mode: input?.mode ?? "demo",
      robot_id: robot.id,
      user_id: userId,
    })
    .select("id")
    .single();

  if (insertError) return { error: insertError.message, id: null, ok: false };

  revalidatePath("/dashboard");
  return { error: null, id: data.id as string, ok: true };
}

export async function finishControlSession(input: {
  commandCount: number;
  completedSafely: boolean;
  emergencyStopCount: number;
  sessionId: string;
}): Promise<ActionResult> {
  const { error, robot, supabase, userId } = await getActiveRobot();
  if (error || !robot || !supabase || !userId) return { error, ok: false };

  const { error: updateError } = await supabase
    .from("control_sessions")
    .update({
      command_count: Math.max(0, Math.round(input.commandCount)),
      completed_safely: input.completedSafely,
      emergency_stop_count: Math.max(0, Math.round(input.emergencyStopCount)),
      ended_at: new Date().toISOString(),
    })
    .eq("id", input.sessionId)
    .eq("user_id", userId);

  if (updateError) return { error: updateError.message, ok: false };

  await supabase.from("robot_events").insert({
    control_session_id: input.sessionId,
    event_type: input.completedSafely ? "control_session_safe" : "control_session_stopped",
    message: input.completedSafely
      ? "Owner completed a control session safely."
      : "Owner ended a control session with stop or incomplete status.",
    robot_id: robot.id,
    severity: input.completedSafely ? "info" : "warning",
    user_id: userId,
  });

  revalidatePath("/dashboard");
  return { error: null, ok: true };
}

export async function saveFeedbackReport(input: {
  message: string;
  problemType?: string;
  rating?: number;
}): Promise<ActionResult> {
  const { error, robot, supabase, userId } = await getActiveRobot();
  if (error || !robot || !supabase || !userId) return { error, ok: false };

  const message = input.message.trim();
  if (message.length < 4) return { error: "Tell us what happened first.", ok: false };

  const { error: insertError } = await supabase.from("feedback_reports").insert({
    message,
    problem_type: input.problemType?.trim() || null,
    rating: input.rating ?? null,
    robot_id: robot.id,
    user_id: userId,
  });

  if (insertError) return { error: insertError.message, ok: false };

  await supabase.from("robot_events").insert({
    event_type: "feedback_reported",
    message: "Owner submitted beta feedback.",
    robot_id: robot.id,
    severity: "info",
    user_id: userId,
  });

  revalidatePath("/dashboard");
  return { error: null, ok: true };
}

export type ProfilePatch = {
  avatar_url?: string | null;
  display_name?: string | null;
  onboarding_completed?: boolean;
  organization_name?: string | null;
  preferred_language?: string | null;
  role_type?: string | null;
  skill_level?: string | null;
};

export async function updateProfile(
  patch: ProfilePatch,
): Promise<ActionResult> {
  const supabase = await createServerSupabaseClient();

  if (!supabase) return { error: "Supabase is not configured.", ok: false };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Login is required.", ok: false };

  const { error } = await supabase
    .from("owner_profiles")
    .update(patch)
    .eq("id", user.id);

  if (error) return { error: error.message, ok: false };

  revalidatePath("/dashboard");
  return { error: null, ok: true };
}

