import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { getSupabaseEnv } from "@/lib/supabase/env";

export type OwnerProfile = {
  created_at: string;
  display_name: string | null;
  id: string;
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
};

type OwnerWorkspace = {
  error: string | null;
  profile: OwnerProfile | null;
  robots: OwnerRobot[];
};

const profileSelect = "id, display_name, created_at, updated_at";
const robotSelect =
  "id, owner_id, unit_code, robot_type, display_name, theme, status, created_at, updated_at";

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

export async function getOwnerWorkspace(user: User): Promise<OwnerWorkspace> {
  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    return {
      error: "Supabase is not configured.",
      profile: null,
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
      error: profileReadError.message,
      profile: null,
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
      })
      .select(profileSelect)
      .single();

    if (profileCreateError) {
      return {
        error: profileCreateError.message,
        profile: null,
        robots: [],
      };
    }

    profile = createdProfile as OwnerProfile;
  }

  const { data: existingRobots, error: robotsReadError } = await supabase
    .from("robots")
    .select(robotSelect)
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true });

  if (robotsReadError) {
    return {
      error: robotsReadError.message,
      profile,
      robots: [],
    };
  }

  const robots = (existingRobots ?? []) as OwnerRobot[];

  if (robots.length > 0) {
    return { error: null, profile, robots };
  }

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
      error: robotCreateError.message,
      profile,
      robots: [],
    };
  }

  return {
    error: null,
    profile,
    robots: [starterRobot as OwnerRobot],
  };
}
