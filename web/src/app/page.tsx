import {
  ArrowRight,
  Bot,
  CircuitBoard,
  Globe2,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { fleet, themes } from "@/lib/roboforge-data";

type HomeProps = {
  searchParams: Promise<{
    code?: string | string[];
    error?: string | string[];
    error_description?: string | string[];
    next?: string | string[];
  }>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const code = firstParam(params.code);
  const error = firstParam(params.error);
  const errorDescription = firstParam(params.error_description);
  const next = firstParam(params.next);

  if (code) {
    const callbackParams = new URLSearchParams({ code });
    if (next?.startsWith("/") && !next.startsWith("//")) {
      callbackParams.set("next", next);
    }
    redirect(`/auth/callback?${callbackParams.toString()}`);
  }

  if (error || errorDescription) {
    const loginParams = new URLSearchParams();
    if (error) loginParams.set("error", error);
    if (errorDescription) loginParams.set("error_description", errorDescription);
    redirect(`/login?${loginParams.toString()}`);
  }

  return (
    <main className="marketing-shell">
      <nav className="topbar">
        <Link className="brand" href="/">
          <span className="brand-mark">
            <CircuitBoard size={21} />
          </span>
          <span>
            <strong>ROBOFORGE</strong>
            <small>OWNER PLATFORM</small>
          </span>
        </Link>
        <div className="topbar-actions">
          <Link className="quiet-link" href="/login">
            Login
          </Link>
          <Link className="button button-small" href="/dashboard">
            Dashboard
          </Link>
        </div>
      </nav>

      <section className="hero-grid">
        <div className="hero-copy">
          <span className="eyebrow">
            <Sparkles size={15} /> ROBOT IDENTITY PLATFORM
          </span>
          <h1>
            YOUR ROBOT.
            <br />
            <span>EVOLVED.</span>
          </h1>
          <p>
            RoboForge turns every kit robot into an owned digital unit: profile,
            garage, missions, support, and future AI-assisted upgrades in one
            account.
          </p>
          <div className="hero-actions">
            <Link className="button" href="/login">
              <LockKeyhole size={18} /> Start with login
            </Link>
            <Link className="button button-secondary" href="/dashboard">
              <Bot size={18} /> Open dashboard
            </Link>
          </div>
          <div className="signal-strip">
            <span>
              <Globe2 size={16} /> Global-first
            </span>
            <span>
              <ShieldCheck size={16} /> Owner accounts
            </span>
            <span>
              <CircuitBoard size={16} /> Hardware ready
            </span>
          </div>
        </div>

        <div className="hero-visual" aria-label="RoboForge active unit">
          <Image
            src={themes.forge.image}
            alt="AEGIS-01 RoboForge rover digital form"
            fill
            priority
            sizes="(min-width: 900px) 56vw, 100vw"
          />
          <div className="unit-badge">
            <span>ACTIVE UNIT</span>
            <strong>{themes.forge.robotName}</strong>
            <small>{themes.forge.robotClass} / ROVER-01</small>
          </div>
        </div>
      </section>

      <section className="fleet-band" aria-label="RoboForge fleet roadmap">
        <div className="section-heading">
          <span className="eyebrow">
            <Bot size={15} /> FLEET GARAGE
          </span>
          <h2>Start with one rover. Keep the system ready for many owners.</h2>
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
                <span>{item.state === "active" ? "LIVE MVP" : item.state}</span>
                <strong>{item.label}</strong>
              </div>
            </article>
          ))}
        </div>
        <Link className="text-command" href="/login">
          Create an owner account <ArrowRight size={17} />
        </Link>
      </section>
    </main>
  );
}
