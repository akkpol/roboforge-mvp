import { redirect } from "next/navigation";
import { SettingsForm } from "./settings-form";
import { getCurrentUser, getOwnerWorkspace } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams?: Promise<{ lang?: string | string[] }>;
}) {
  const params = searchParams ? await searchParams : {};
  const locale = firstParam(params.lang) === "th" ? "th" : "en";

  const { configured, user } = await getCurrentUser();

  if (configured && !user) {
    const loginParams = new URLSearchParams({ redirect: "/dashboard/settings" });
    if (locale === "th") loginParams.set("lang", "th");
    redirect(`/login?${loginParams.toString()}`);
  }

  const workspace = user
    ? await getOwnerWorkspace(user)
    : null;

  return (
    <SettingsForm
      locale={locale}
      profile={workspace?.profile ?? null}
      workspaceError={workspace?.error ?? null}
    />
  );
}
