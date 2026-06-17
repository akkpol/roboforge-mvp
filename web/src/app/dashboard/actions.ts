"use server";

import { revalidatePath } from "next/cache";
import type { OwnerProgress, ThemeId, UpgradeInterest } from "@/lib/roboforge-data";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type ActionResult = {
  error: string | null;
  ok: boolean;
};

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
    .select("id, owner_id")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  if (robotError || !robot) {
    return {
      error: robotError?.message ?? "No robot is available for this owner.",
      robot: null,
      supabase,
    };
  }

  return { error: null, robot: robot as { id: string; owner_id: string }, supabase };
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
