"use client";

import Link from "next/link";
import { useState } from "react";
import { Bell, Bot, LogOut, Settings } from "lucide-react";

type TopBarProps = {
  isConnected?: boolean;
};

export function TopBar({ isConnected = false }: TopBarProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);

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
