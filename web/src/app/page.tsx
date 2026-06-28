import { GarageScreen } from "@/components/lumina/garage-screen";
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

  return (
    <GarageScreen
      isConnected={Boolean(user)}
      justConnected={firstParam(params.connected) === "1" && Boolean(user)}
      userName={typeof user?.user_metadata?.full_name === "string" ? user.user_metadata.full_name : null}
    />
  );
}
