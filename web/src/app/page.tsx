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
import { fleet, themes } from "@/lib/roboforge-data";

export default function Home() {
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
