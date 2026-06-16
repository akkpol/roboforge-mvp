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
import { fleet, themes } from "@/lib/roboforge-data";
import { getCurrentUser } from "@/lib/supabase/server";

const setupItems = [
  "Create Supabase project",
  "Enable email/password auth",
  "Add env vars to Vercel",
  "Run the starter SQL schema",
];

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { configured, user } = await getCurrentUser();

  if (configured && !user) {
    redirect("/login?redirect=/dashboard");
  }

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
            {user?.email ?? "Supabase setup needed"}
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

      <section className="dashboard-grid">
        <article className="active-unit">
          <div className="active-unit-image">
            <Image
              src={themes.forge.image}
              alt="AEGIS-01 active RoboForge unit"
              fill
              priority
              sizes="(min-width: 1000px) 48vw, 100vw"
            />
          </div>
          <div className="active-unit-copy">
            <span className="eyebrow">ACTIVE UNIT // ROVER-01</span>
            <h1>{themes.forge.robotName}</h1>
            <p>{themes.forge.robotClass} / differential drive / beta owner</p>
            <div className="metric-grid">
              <span>
                <Gauge size={20} />
                <strong>82%</strong>
                Battery
              </span>
              <span>
                <ShieldCheck size={20} />
                <strong>Safe</strong>
                Owner mode
              </span>
              <span>
                <CheckCircle2 size={20} />
                <strong>3/4</strong>
                Setup
              </span>
            </div>
          </div>
        </article>

        <aside className="ai-panel">
          <span className="eyebrow">
            <BrainCircuit size={15} /> AI ENGINEER
          </span>
          <h2>Ready for the next phase.</h2>
          <p>
            Keep this as scripted support first. Add OpenAI/Vercel AI Gateway
            after owner accounts and robot events are stored reliably.
          </p>
          <div className="support-list">
            <span>Setup diagnosis</span>
            <span>Battery safety notes</span>
            <span>Upgrade recommendations</span>
          </div>
        </aside>
      </section>

      <section className="dashboard-section">
        <div className="section-heading">
          <span className="eyebrow">FLEET</span>
          <h2>Multi-user foundation without overbuilding the product.</h2>
        </div>
        <div className="fleet-grid">
          {fleet.map((item) => (
            <article className="fleet-tile" key={item.id}>
              <Image
                src={item.image}
                alt={`${item.label} robot concept`}
                width={360}
                height={210}
              />
              <div>
                <span>{item.state === "active" ? "OWNER READY" : item.state}</span>
                <strong>{item.label}</strong>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
