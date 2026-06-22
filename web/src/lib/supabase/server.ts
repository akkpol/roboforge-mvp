import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { defaultProgress, type OwnerProgress } from "@/lib/roboforge-data";
import { getSupabaseEnv } from "@/lib/supabase/env";

export type OwnerProfile = {
  avatar_url: string | null;
  created_at: string;
  display_name: string | null;
  id: string;
  last_active_at: string | null;
  onboarding_completed: boolean;
  organization_name: string | null;
  preferred_language: string | null;
  role_type: string | null;
  skill_level: string | null;
  updated_at: string;
};

export type OwnerRobot = {
  created_at: string;
  display_name: string;
  id: string;
  owner_id: string;
  robot_type: string;
  status: string;
  theme: string;
  unit_code: string;
  updated_at: string;
  workspace_id: string | null;
};

export type RobotProgress = OwnerProgress & {
  created_at: string;
  robot_id: string;
  updated_at: string;
};

export type RobotInterest = {
  created_at: string;
  id: string;
  interest: string;
  robot_id: string;
};

export type RobotDevice = {
  ap_ssid: string | null;
  battery_config: Record<string, unknown>;
  board_type: string;
  created_at: string;
  firmware_version: string | null;
  hardware_profile: Record<string, unknown>;
  id: string;
  last_seen_at: string | null;
  protocol_version: string;
  readiness_status: string;
  robot_id: string;
  updated_at: string;
};

export type OwnerWorkspace = {
  devices: RobotDevice[];
  error: string | null;
  interests: RobotInterest[];
  isFirstVisit?: boolean;
  notice?: string | null;
  profile: OwnerProfile | null;
  progress: RobotProgress | null;
  robots: OwnerRobot[];
};

const profileSelect = "id, avatar_url, created_at, display_name, last_active_at, onboarding_completed, organization_name, preferred_language, role_type, skill_level, updated_at";
const robotSelect =
  "id, owner_id, workspace_id, unit_code, robot_type, display_name, theme, status, created_at, updated_at";
const progressSelect =
  "robot_id, setup_complete, first_connection_complete, first_drive_complete, first_mission_complete, battery_calibrated, ready_for_floor_test, created_at, updated_at";
const interestSelect = "id, robot_id, interest, created_at";
const deviceSelect =
  "id, robot_id, board_type, firmware_version, protocol_version, ap_ssid, last_seen_at, battery_config, hardware_profile, readiness_status, created_at, updated_at";

export async function createServerSupabaseClient() {
  const { publishableKey, url } = getSupabaseEnv();

  if (!url || !publishableKey) return null;

  const cookieStore = await cookies();

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, options, value }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot set cookies. Route handlers and proxy can.
        }
      },
    },
  });
}

export async function getCurrentUser() {
  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    return { configured: false, user: null };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { configured: true, user };
}

function getDisplayName(user: User) {
  const metadata = user.user_metadata;
  const rawName =
    typeof metadata.full_name === "string"
      ? metadata.full_name
      : typeof metadata.name === "string"
        ? metadata.name
        : "";

  return rawName.trim() || user.email?.split("@")[0] || "RoboForge Owner";
}

function isMissingWorkspaceTable(error: { code?: string; message?: string }) {
  const message = error.message ?? "";
  return (
    error.code === "PGRST205" ||
    message.includes("schema cache") ||
    message.includes("robot_progress") ||
    message.includes("robot_devices") ||
    message.includes("robot_interests")
  );
}

function prioritizePhysicalRobots(robots: OwnerRobot[], devices: RobotDevice[]) {
  const physicalRobotIds = new Set(devices.map((device) => device.robot_id));

  return [...robots].sort((first, second) => {
    const firstIsPhysical = physicalRobotIds.has(first.id);
    const secondIsPhysical = physicalRobotIds.has(second.id);

    if (firstIsPhysical === secondIsPhysical) return 0;
    return firstIsPhysical ? -1 : 1;
  });
}

export async function getOwnerWorkspace(user: User): Promise<OwnerWorkspace> {
  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    return {
      devices: [],
      error: "Supabase is not configured.",
      interests: [],
      profile: null,
      progress: null,
      robots: [],
    };
  }

  const { data: existingProfile, error: profileReadError } = await supabase
    .from("owner_profiles")
    .select(profileSelect)
    .eq("id", user.id)
    .maybeSingle();

  if (profileReadError) {
    return {
      devices: [],
      error: profileReadError.message,
      interests: [],
      profile: null,
      progress: null,
      robots: [],
    };
  }

  let profile = existingProfile as OwnerProfile | null;

  if (!profile) {
    const { data: createdProfile, error: profileCreateError } = await supabase
      .from("owner_profiles")
      .insert({
        display_name: getDisplayName(user),
        id: user.id,
        onboarding_completed: false,
        preferred_language: "en",
      })
      .select(profileSelect)
      .single();

    if (profileCreateError) {
      return {
        devices: [],
        error: profileCreateError.message,
        interests: [],
        profile: null,
        progress: null,
        robots: [],
      };
    }

    profile = createdProfile as OwnerProfile;
  }

  const { data: existingRobots, error: robotsReadError } = await supabase
    .from("robots")
    .select(robotSelect)
    .eq("owner_id", user.id)
    .order("updated_at", { ascending: false });

  if (robotsReadError) {
    return {
      devices: [],
      error: robotsReadError.message,
      interests: [],
      profile,
      progress: null,
      robots: [],
    };
  }

  let robots = (existingRobots ?? []) as OwnerRobot[];

  if (robots.length === 0) {
    const { data: starterRobot, error: robotCreateError } = await supabase
      .from("robots")
      .upsert(
        {
          display_name: "AEGIS-01",
          owner_id: user.id,
          robot_type: "rover",
          status: "offline",
          theme: "forge",
          unit_code: "ROVER-01",
        },
        { onConflict: "owner_id,unit_code" },
      )
      .select(robotSelect)
      .single();

    if (robotCreateError) {
      return {
        devices: [],
        error: robotCreateError.message,
        interests: [],
        profile,
        progress: null,
        robots: [],
      };
    }

    robots = [starterRobot as OwnerRobot];
  }

  const { data: existingDevices, error: devicesReadError } = await supabase
    .from("robot_devices")
    .select(deviceSelect)
    .in(
      "robot_id",
      robots.map((robot) => robot.id),
    )
    .order("updated_at", { ascending: false });

  let devices = (existingDevices ?? []) as RobotDevice[];

  if (devicesReadError) {
    if (isMissingWorkspaceTable(devicesReadError)) {
      devices = [];
    } else {
      return {
        devices: [],
        error: devicesReadError.message,
        interests: [],
        profile,
        progress: null,
        robots,
      };
    }
  }

  robots = prioritizePhysicalRobots(robots, devices);
  const activeRobot = robots[0];
  const { data: existingProgress, error: progressReadError } = await supabase
    .from("robot_progress")
    .select(progressSelect)
    .eq("robot_id", activeRobot.id)
    .maybeSingle();

  if (progressReadError) {
    if (isMissingWorkspaceTable(progressReadError)) {
      return {
        devices: [],
        error: null,
        interests: [],
        notice:
          "Supabase schema needs the new RoboForge workspace tables before progress and upgrade signals can persist.",
        profile,
        progress: null,
        robots,
      };
    }

    return {
      devices: [],
      error: progressReadError.message,
      interests: [],
      profile,
      progress: null,
      robots,
    };
  }

  let progress = existingProgress as RobotProgress | null;

  if (!progress) {
    const { data: createdProgress, error: progressCreateError } = await supabase
      .from("robot_progress")
      .insert({
        ...defaultProgress,
        robot_id: activeRobot.id,
      })
      .select(progressSelect)
      .single();

    if (progressCreateError) {
      if (isMissingWorkspaceTable(progressCreateError)) {
        return {
          devices: [],
          error: null,
          interests: [],
          notice:
            "Supabase schema needs the new RoboForge workspace tables before progress and upgrade signals can persist.",
          profile,
          progress: null,
          robots,
        };
      }

      return {
        devices: [],
        error: progressCreateError.message,
        interests: [],
        profile,
        progress: null,
        robots,
      };
    }

    progress = createdProgress as RobotProgress;
  }

  const { data: existingInterests, error: interestsReadError } = await supabase
    .from("robot_interests")
    .select(interestSelect)
    .eq("robot_id", activeRobot.id)
    .order("created_at", { ascending: false });

  if (interestsReadError) {
    if (isMissingWorkspaceTable(interestsReadError)) {
      return {
        devices,
        error: null,
        interests: [],
        notice:
          "Supabase schema needs the new RoboForge workspace tables before upgrade signals can persist.",
        profile,
        progress,
        robots,
      };
    }

    return {
      devices,
      error: interestsReadError.message,
      interests: [],
      profile,
      progress,
      robots,
    };
  }

  // Touch last_active_at on workspace load (fire-and-forget, do not fail on error).
  if (profile) {
    supabase
      .from("owner_profiles")
      .update({ last_active_at: new Date().toISOString() })
      .eq("id", user.id)
      .then(undefined, (_err: unknown) => {
        // Swallow — non-critical telemetry must never break the workspace.
      });
  }

  const isFirstVisit = profile
    ? Date.now() - new Date(profile.created_at).getTime() < 300_000
    : true;

  return {
    devices,
    error: null,
    interests: (existingInterests ?? []) as RobotInterest[],
    isFirstVisit,
    profile,
    progress,
    robots,
  };
}
