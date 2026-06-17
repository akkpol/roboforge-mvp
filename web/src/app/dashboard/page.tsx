import { redirect } from "next/navigation";
import { OwnerConsole } from "@/components/owner-console";
import { getCurrentUser, getOwnerWorkspace } from "@/lib/supabase/server";

const setupItems = [
  "Create Supabase project",
  "Enable Google or email auth",
  "Add env vars to Vercel",
  "Run the starter SQL schema",
];

export const dynamic = "force-dynamic";

type DashboardPageProps = {
  searchParams?: Promise<{
    claim?: string | string[];
  }>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = searchParams ? await searchParams : {};
  const claimParam = Array.isArray(params.claim) ? params.claim[0] : params.claim;
  const initialClaimCode = claimParam?.trim() || null;
  const { configured, user } = await getCurrentUser();

  if (configured && !user) {
    const redirectTarget = initialClaimCode
      ? `/dashboard?claim=${encodeURIComponent(initialClaimCode)}`
      : "/dashboard";
    redirect(`/login?redirect=${encodeURIComponent(redirectTarget)}`);
  }

  const workspace = user
    ? await getOwnerWorkspace(user)
    : { error: null, interests: [], profile: null, progress: null, robots: [] };

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

  return <OwnerConsole initialClaimCode={initialClaimCode} workspace={workspace} />;
}
