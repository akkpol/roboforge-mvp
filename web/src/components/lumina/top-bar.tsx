"use client";

import Link from "next/link";
import { Bell, Bot, LogIn, LogOut, Settings } from "lucide-react";

type TopBarProps = {
  isConnected?: boolean;
};

export function TopBar({ isConnected = false }: TopBarProps) {
  return (
    <header className="lumina-topbar">
      <Link className="brand-lockup" href="/" aria-label="RoboForge home">
        <span className="brand-mark">
          <Bot data-icon="inline-start" />
        </span>
        <strong>ROBOFORGE</strong>
      </Link>
      <div className="top-actions" aria-label="Garage controls">
        {isConnected ? (
          <Link className="round-action round-action-login" href="/auth/sign-out">
            <LogOut data-icon="inline-start" />
            <span>ออกจากระบบ</span>
          </Link>
        ) : (
          <Link className="round-action round-action-login" href="/login?lang=th&redirect=/?connected=1">
            <LogIn data-icon="inline-start" />
            <span>เข้าสู่ระบบ</span>
          </Link>
        )}
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
