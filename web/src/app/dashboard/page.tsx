import {
  Bot,
  BrainCircuit,
  CheckCircle2,
  Gauge,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { fleet, themes, type RobotType } from "@/lib/roboforge-data";
import { getCurrentUser, getOwnerWorkspace } from "@/lib/supabase/server";

const setupItems = [
  "Create Supabase project",
  "Enable Google or email auth",
  "Add env vars to Vercel",
  "Run the starter SQL schema",
];

export const dynamic = "force-dynamic";

function getTheme(theme: string | null | undefined) {
  return theme === "neo" ? themes.neo : themes.forge;
}

function getRobotImage(robotType: string | null | undefined) {
  const matched = fleet.find((item) => item.id === robotType);
  return matched?.image ?? fleet[0].image;
}

function getRobotLabel(robotType: string | null | undefined) {
  const matched = fleet.find((item) => item.id === robotType);
  return matched?.label ?? "Rover";
}

function getSetupCount(hasUser: boolean, robotCount: number) {
  return [hasUser, robotCount > 0, true, false].filter(Boolean).length;
}

export default async function DashboardPage() {
  const { configured, user } = await getCurrentUser();

  if (configured && !user) {
    redirect("/login?redirect=/dashboard");
  }

  const workspace = user
    ? await getOwnerWorkspace(user)
    : { error: null, profile: null, robots: [] };
  const activeRobot = workspace.robots[0] ?? null;
  const activeTheme = getTheme(activeRobot?.theme);
  const ownerName = workspace.profile?.display_name || user?.email || "RoboForge Owner";
  const setupCount = getSetupCount(Boolean(user), workspace.robots.length);

  return (
    <main className="dashboard-shell">
      <nav className="topbar dashboard-topbar">
        <Link className="brand" href="/">
          <span className="brand-mark">
            <Bot size={21} />
          </span>
          <span>
            <strong>ROBOFORGE</strong>
            <small>DIGITAL HANGAR</small>
          </span>
        </Link>
        <div className="topbar-actions">
          <span className="account-pill">
            {ownerName}
          </span>
          {configured ? (
            <Link className="icon-command" href="/auth/sign-out" title="Sign out">
              <LogOut size={18} />
            </Link>
          ) : null}
        </div>
      </nav>

      {!configured ? (
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
      ) : null}

      {workspace.error ? (
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
      ) : null}

      <section className="dashboard-grid">
        <article className="active-unit">
          <div className="active-unit-image">
            <Image
              src={activeTheme.image}
              alt={`${activeRobot?.display_name ?? activeTheme.robotName} active RoboForge unit`}
              fill
              priority
              sizes="(min-width: 1000px) 48vw, 100vw"
            />
          </div>
          <div className="active-unit-copy">
            <span className="eyebrow">
              ACTIVE UNIT // {activeRobot?.unit_code ?? "PENDING"}
            </span>
            <h1>{activeRobot?.display_name ?? activeTheme.robotName}</h1>
            <p>
              {getRobotLabel(activeRobot?.robot_type)} / {activeTheme.label} /{" "}
              {activeRobot?.status ?? "pending"}
            </p>
            <div className="metric-grid">
              <span>
                <Gauge size={20} />
                <strong>{workspace.robots.length}</strong>
                Registered units
              </span>
              <span>
                <ShieldCheck size={20} />
                <strong>{user ? "Live" : "Locked"}</strong>
                Auth session
              </span>
              <span>
                <CheckCircle2 size={20} />
                <strong>{setupCount}/4</strong>
                Setup
              </span>
            </div>
          </div>
        </article>

        <aside className="ai-panel">
          <span className="eyebrow">
            <BrainCircuit size={15} /> AI ENGINEER
          </span>
          <h2>{workspace.robots.length ? "Workspace is live." : "Workspace pending."}</h2>
          <p>
            Your owner profile and starter robot are now stored in Supabase.
            Add robot events and AI recommendations after this owner workspace
            is stable.
          </p>
          <div className="support-list">
            <span>Owner: {ownerName}</span>
            <span>Robot: {activeRobot?.unit_code ?? "not created"}</span>
            <span>Auth: Google or email</span>
          </div>
        </aside>
      </section>

      <section className="dashboard-section">
        <div className="section-heading">
          <span className="eyebrow">REGISTERED UNITS</span>
          <h2>Real owner data, separated by Supabase row-level security.</h2>
        </div>
        <div className="fleet-grid">
          {workspace.robots.map((robot) => (
            <article className="fleet-tile" key={robot.id}>
              <Image
                src={getRobotImage(robot.robot_type as RobotType)}
                alt={`${robot.display_name} robot`}
                width={360}
                height={210}
              />
              <div>
                <span>{robot.status}</span>
                <strong>{robot.display_name}</strong>
                <small>{robot.unit_code}</small>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
