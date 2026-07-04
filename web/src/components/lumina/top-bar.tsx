"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Bell, Bot, ExternalLink, LogOut, Settings } from "lucide-react";

type TopBarProps = {
  backHref?: string;
  backLabel?: string;
  isConnected?: boolean;
  showBack?: boolean;
};

export function TopBar({ backHref = "/", backLabel = "กลับหน้า RoboForge", isConnected = false, showBack = false }: TopBarProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <header className={showBack ? "lumina-topbar lumina-topbar--with-back" : "lumina-topbar"}>
      <div className="topbar-left">
        {showBack ? (
          <Link className="round-action round-action--back" href={backHref} aria-label={backLabel}>
            <ArrowLeft data-icon="inline-start" />
          </Link>
        ) : null}
        <Link className="brand-lockup" href="/" aria-label="RoboForge home">
          <span className="brand-mark">
            <Bot data-icon="inline-start" />
          </span>
          <strong>ROBOFORGE</strong>
        </Link>
      </div>
      <div className="top-actions" aria-label="RoboForge controls">
        <a
          className="round-action round-action--creator"
          href="https://akkapol-systems.vercel.app"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Created by akkapol — view portfolio"
          title="Created by akkapol"
        >
          <ExternalLink data-icon="inline-start" />
        </a>
        <button className="round-action has-dot" type="button" aria-label="Notifications">
          <Bell data-icon="inline-start" />
        </button>
        <div className="settings-menu-wrap">
          <button
            aria-expanded={settingsOpen}
            aria-haspopup="menu"
            className="round-action"
            onClick={() => setSettingsOpen((open) => !open)}
            type="button"
            aria-label="Settings"
          >
            <Settings data-icon="inline-start" />
          </button>
          {settingsOpen ? (
            <div className="settings-menu" role="menu">
              {isConnected ? (
                <Link href="/auth/sign-out" role="menuitem">
                  <LogOut data-icon="inline-start" />
                  <span>ออกจากระบบ</span>
                </Link>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
