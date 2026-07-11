import { ConnectWizard } from "@/features/connect/connect-wizard";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function ConnectPage() {
  const supabase = await createServerSupabaseClient();
  const { data } = (await supabase?.auth.getUser()) ?? { data: { user: null } };
  return <ConnectWizard isAuthenticated={Boolean(data.user)} />;
}
