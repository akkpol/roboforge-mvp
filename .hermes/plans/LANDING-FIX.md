# Landing Page Fix Plan

## Problem

OwnerConsole was pasted onto `/` without adaptation. Result:
- "Sign out" / "Beta Ops" visible to anonymous users
- "Add robot" form shows but fails silently
- No language switcher
- Users don't know it's a demo — looks like a broken app

## Fix: Revert to a purpose-built landing page

### Architecture

```
/              → new landing page (server component, no OwnerConsole)
/login         → auth (unchanged)
/dashboard     → OwnerConsole for authenticated users (unchanged)
/demo/*        → redirect to /
```

### Landing page layout (mobile-first, single scroll)

```
┌─────────────────────────────┐
│  ROBOFORGE        EN | TH   │  ← nav bar
├─────────────────────────────┤
│                             │
│    🦾 (robot image)         │  ← hero
│    YOUR ROBOT. EVOLVED.     │
│    Own it. Learn it.        │
│    Drive it like a game.    │
│                             │
│    [🎮 Try the Demo]        │  ← opens inline simulated Cockpit
│    [🔑 Create Account]      │  → /login
│                             │
├─────────────────────────────┤
│  How it works               │
│  ① Create account           │
│  ② Get Rover-01 beta kit    │
│  ③ Connect and drive        │
├─────────────────────────────┤
│  One platform.              │
│  Many robots.               │
│  Rover · Tracked · Drone · Arm │
└─────────────────────────────┘
```

### "Try the Demo" behavior

Clicking "Try the Demo" replaces the hero section with an inline simulated Cockpit:
- Throttle slider
- Battery indicator (mock)
- ARM button (mock)
- "This is a simulation. Real motor control requires a Rover-01 kit + login."

Preact/Vite not needed — pure HTML/CSS + a few lines of JavaScript for the slider.

### Language switching

Nav bar has `EN | TH` links that reload the page with `?lang=th` or `?lang=en`.

### Files changed

| File | Change |
|------|--------|
| `web/src/app/page.tsx` | Rewrite: new landing page instead of OwnerConsole |
| `web/src/app/page.module.css` | (new) Landing page styles |
| `web/src/lib/roboforge-data.ts` | Remove `getDemoWorkspace()` (no longer needed) |
| `web/src/components/owner-console.tsx` | Revert: remove `activeDevice` prop from Cockpit (was added for demo) |
| `web/next.config.ts` | Keep `/demo` → `/` redirect |

### Files NOT changed

| File | Why |
|------|-----|
| `web/src/app/dashboard/*` | OwnerConsole stays for authenticated users |
| `web/src/app/login/*` | Auth flow unchanged |
| `web/src/app/admin/*` | Admin unchanged |
| Supabase / API / firmware | Zero backend changes |

### Implementation time

~1 hour total. Single commit.
