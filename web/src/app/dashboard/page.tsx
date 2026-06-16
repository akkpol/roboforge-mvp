import { LogOut } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, getOwnerWorkspace } from "@/lib/supabase/server";

const setupItems = [
  "Create Supabase project",
  "Enable Google or email auth",
  "Add env vars to Vercel",
  "Run the starter SQL schema",
];

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { configured, user } = await getCurrentUser();

  if (configured && !user) {
    redirect("/login?redirect=/dashboard");
  }

  const workspace = user
    ? await getOwnerWorkspace(user)
    : { error: null, profile: null, robots: [] };

  if (!configured) {
    return (
      <main className="dashboard-shell">
        <section className="setup-alert">
          <div>
            <span className="eyebrow">AUTH NOT CONNECTED</span>
            <h1>Supabase env is missing.</h1>
            <p>
              The app builds and renders, but real login starts after these
              variables exist: NEXT_PUBLIC_SUPABASE_URL and
              NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.
            </p>
          </div>
          <ol>
            {setupItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
        </section>
      </main>
    );
  }

  if (workspace.error) {
    return (
      <main className="dashboard-shell">
        <section className="setup-alert">
          <div>
            <span className="eyebrow">WORKSPACE NEEDS ATTENTION</span>
            <h1>Supabase data is not ready.</h1>
            <p>{workspace.error}</p>
          </div>
          <ol>
            <li>Confirm the starter SQL schema is applied</li>
            <li>Confirm RLS policies allow owner rows</li>
            <li>Reload after login</li>
          </ol>
        </section>
      </main>
    );
  }

  return (
    <main className="demo-dashboard">
      <iframe
        className="demo-frame"
        src="/demo/index.html?screen=garage"
        title="RoboForge owner console"
      />
      <Link className="demo-sign-out" href="/auth/sign-out" title="Sign out">
        <LogOut size={18} />
      </Link>
    </main>
  );
}
