# RoboForge UX Fix — Revised Plan (Deep Review)

## What the codebase ACTUALLY has

```
Bottom nav:  Garage | Cockpit | Missions | Engineer | Store  (5 items ✅)
Sub-screens: "connect" (button in garage) + "profile" (button in garage)

Landing:     8 CTAs competing for attention
SaaS:        /login → /dashboard → OwnerConsole
Demo:        /demo/index.html → separate Vite app
```

---

## Real Problem (not 7 screens — that was wrong)

**The app violates a fundamental UX rule: "Show, don't tell."**

A new user lands on roboforge-saas.vercel.app and sees:
- "YOUR ROBOT. EVOLVED."
- "Enter Web Garage" (goes to auth wall)
- "Try hosted demo" (goes to different app with different UI)
- "Login" (goes to login page)
- "Create a RoboForge account" (same as login)
- 4 sections of marketing text

The user expects: Open the page → see a robot → try controlling it → then sign up.

What actually happens: Open the page → read marketing → click "Try demo" → see a DIFFERENT app → click "Enter Web Garage" → hit auth wall. Journey broken.

---

## The Fix: Replace the landing page with a live demo

**Radical idea:** Delete the landing page entirely. Replace it with a live demo that IS the product.

```
BEFORE:
  /                → marketing page
  /login           → auth
  /dashboard       → auth wall → OwnerConsole
  /demo/index.html → separate app

AFTER:
  /                → live demo (no login required)
                     • shows Garage with 1 demo robot
                     • "Try Cockpit" button works immediately
                     • "Claim this robot" → prompts login
                     • Login CTA always visible in topbar
  /login           → remains for hard login
  /dashboard       → OwnerConsole (authenticated)
  /demo/*          → REMOVED or redirected to /
```

---

## Exact implementation steps (Phase 1)

### Step 1: Serve OwnerConsole at `/` without auth wall

**File:** `web/src/app/page.tsx`

Replace the current landing page with a simplified version of the OwnerConsole that:
- Does NOT call `getCurrentUser()` (no auth redirect)
- Shows garage with 1 demo robot
- "Enter Cockpit" opens a simulated cockpit (uses DemoRoverApi, already exists in `device/src/api.ts`)
- "Claim this robot" or "Create account" → redirects to `/login`
- Topbar shows "Login" and "Web Garage" links

**Why this works:** The OwnerConsole already supports demo mode. The `device/src/api.ts` already has `DemoRoverApi`. We just need to render it on the home page without auth.

---

### Step 2: Route existing demo traffic to the new home page

**File:** `web/next.config.ts` or `vercel.json`

Add a rewrite: `/demo/index.html` → `/`

Existing demo URL keeps working but loads the new unified experience.

---

### Step 3: Show "Connect Quest" button prominently in Cockpit

**File:** `web/src/components/owner-console.tsx`

When user is on Cockpit screen and not connected:
- Show a card: "🔌 Connect your Rover-01 → Wi-Fi: RoboForge-XXXX → Open cockpit"
- Button: "Start Connection Quest" → switches to `screen = "connect"`
- After connection success → auto-switch back to Cockpit with live controls

---

### Step 4: Clean up landing page CTAs

**File:** `web/src/app/page.tsx`

Keep only 2 CTAs:
1. "Try the demo" (primary) — starts Cockpit immediately
2. "Create account" (secondary) — goes to /login

Remove:
- "Enter Web Garage" (redundant with "Create account")
- "Try hosted demo" (merged into the page itself)
- "Apply for guided beta" (moved into store screen)
- Fleet roadmap section (move to /learn if needed)

---

## What this solves

| Before | After |
|--------|-------|
| Landing page = 8 CTAs, no robot | Landing page = demo robot you can control |
| Demo = separate app, different UI | Demo = the real app, just without login |
| Can't see product before signup | See AND control robot before signup |
| "Try demo" = 2 steps (landing → demo page → click) | "Try demo" = instant (page loads with robot) |
| Cockpit hidden behind 2 clicks | Cockpit = center of the experience |

---

## What stays the same

- ✅ OwnerConsole component unchanged (just used on home page too)
- ✅ Bottom nav unchanged (5 items)
- ✅ Server actions, Supabase, firmware, hardware — zero changes
- ✅ `/dashboard` still exists for authenticated users
- ✅ `/login` still exists for hard auth

---

## Files changed

```
web/src/app/page.tsx              (rewrite: serve demo OwnerConsole instead of marketing)
web/src/components/owner-console.tsx (small: show connect card in cockpit)
web/next.config.ts                (small: rewrite /demo to /)
```

**Total: 2 files modified, 1 file deleted (old demo SPA). Zero backend changes.**
