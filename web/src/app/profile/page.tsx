import { redirect } from "next/navigation";
import { ProfileScreen } from "@/components/lumina/profile-screen";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type OwnerProfile = {
  avatar_url: string | null;
  display_name: string | null;
  phone_number: string | null;
};

function metadataString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function fallbackDisplayName(email: string | undefined) {
  if (!email) return "RoboForge Owner";
  return email.split("@")[0] || "RoboForge Owner";
}

export default async function ProfilePage() {
  const supabase = await createServerSupabaseClient();
  const { data } = (await supabase?.auth.getUser()) ?? { data: { user: null } };
  const user = data.user;

  if (!user) {
    redirect("/login?redirect=/profile&lang=th");
  }

  const { data: profile } = (await supabase
    ?.from("owner_profiles")
    .select("avatar_url, display_name, phone_number")
    .eq("id", user.id)
    .maybeSingle()) ?? { data: null };

  const ownerProfile = profile as OwnerProfile | null;
  const metadataName = metadataString(user.user_metadata?.full_name) ?? metadataString(user.user_metadata?.name);
  const displayName = ownerProfile?.display_name?.trim() || metadataName || fallbackDisplayName(user.email);
  const avatarPath = ownerProfile?.avatar_url?.trim() || null;
  const storedAvatarIsUrl = avatarPath?.startsWith("http://") || avatarPath?.startsWith("https://");
  const { data: signedAvatar } =
    avatarPath && !storedAvatarIsUrl
      ? (await supabase?.storage.from("profile-avatars").createSignedUrl(avatarPath, 60 * 60)) ?? { data: null }
      : { data: null };

  return (
    <ProfileScreen
      avatarPath={storedAvatarIsUrl ? null : avatarPath}
      avatarUrl={storedAvatarIsUrl ? avatarPath : signedAvatar?.signedUrl}
      displayName={displayName}
      email={user.email ?? null}
      isConnected
      phoneNumber={ownerProfile?.phone_number}
      userId={user.id}
    />
  );
}
