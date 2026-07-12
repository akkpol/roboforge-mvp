import { HomeDashboard } from "@/features/home/home-dashboard";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type HomePageProps = {
  searchParams: Promise<{
    connected?: string | string[];
  }>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const supabase = await createServerSupabaseClient();
  const { data } = (await supabase?.auth.getUser()) ?? { data: { user: null } };
  const user = data.user;
  const { data: profile } = user
    ? (await supabase
        ?.from("owner_profiles")
        .select("display_name")
        .eq("id", user.id)
        .maybeSingle()) ?? { data: null }
    : { data: null };
  const profileName =
    profile && typeof profile.display_name === "string" && profile.display_name.trim().length > 0
      ? profile.display_name.trim()
      : null;

  return (
    <HomeDashboard
      isConnected={Boolean(user)}
      justConnected={firstParam(params.connected) === "1" && Boolean(user)}
      userName={profileName ?? (typeof user?.user_metadata?.full_name === "string" ? user.user_metadata.full_name : null)}
    />
  );
}
