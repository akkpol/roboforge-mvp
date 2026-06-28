"use client";

import Link from "next/link";
import { Bell, Bot, Settings } from "lucide-react";

export function TopBar() {
  return (
    <header className="lumina-topbar">
      <Link className="brand-lockup" href="/" aria-label="RoboForge home">
        <span className="brand-mark">
          <Bot data-icon="inline-start" />
        </span>
        <strong>ROBOFORGE</strong>
      </Link>
      <div className="top-actions" aria-label="Garage controls">
        <button className="round-action has-dot" type="button" aria-label="Notifications">
          <Bell data-icon="inline-start" />
        </button>
        <button className="round-action" type="button" aria-label="Settings">
          <Settings data-icon="inline-start" />
        </button>
      </div>
    </header>
  );
}
