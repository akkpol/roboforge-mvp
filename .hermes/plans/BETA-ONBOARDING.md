# RoboForge Next Phase Plan

## Current State (What's Done)

```
✅ Landing page     — clean demo preview
✅ Google login     — working
✅ Profile settings — profile layer + form
✅ Dashboard        — OwnerConsole with 5 screens
✅ Cockpit          — demo controls working
✅ Admin panel      — claim kit creation, bench tests, health dashboard
✅ Firmware         — ESP32 Robot Protocol v1 complete
✅ Supabase         — 16 tables, RLS, RPCs
✅ Vercel deploy    — auto-deploy from GitHub
```

## Gap to Beta Launch

The app works but nobody can test the FULL journey because the most important flow — **Claim → Connect → Drive** — requires a physical Rover-01 kit that doesn't exist yet.

**Without a kit**, the next best thing we can build is a **complete simulated onboarding flow** so a beta tester can:

1. Create account → see Garage with demo robot
2. Run a guided "Simulated Connection Quest" (no hardware)
3. Try the demo Cockpit
4. Complete a "First Drive" mission
5. See their profile + progress

This validates the UX without hardware.

---

## Plan: Simulated Beta Onboarding

### Phase 1: Fix Demo Landing → Login → Dashboard Flow (2h)

**Problem:** Landing page has "Try Demo" and "Create Account" but after login, user lands on a Dashboard that looks very different from the landing demo. Jarring transition.

**Fix:** After login, show a welcome screen:
```
"Welcome to your Garage, [Name]!"
"You have 1 robot: AEGIS-01 (Digital Form)"
[Enter Garage →]
```

**Files:**
- `web/src/app/dashboard/page.tsx` — add welcome state for first-time users
- `web/src/lib/supabase/server.ts` — check if `owner_profiles.created_at` is recent (< 5 min) to detect first visit

---

### Phase 2: Simulated Connection Quest (3h)

**Problem:** Connection Quest requires real Wi-Fi. A beta tester with no kit sees a disabled button.

**Fix:** Add a "Simulated Connection" mode:

```
Screen: "Connection Quest — Simulated Mode"
┌────────────────────────────────────┐
│ 🔌 Step 1: Power on Rover-01      │ [✓ Done]
│ 📶 Step 2: Join Wi-Fi             │ [Skip → simulated]
│ 🌐 Step 3: Open 192.168.4.1       │ [Skip → simulated]
│ ✅ Step 4: Confirm connection      │ [Complete Quest]
│                                    │
│ ⚠️ This is a simulation.           │
│ Real connection requires a kit.    │
└────────────────────────────────────┘
```

After completing → `robot_progress.first_connection_complete = true`

**Files:**
- `web/src/components/owner-console.tsx` — add `isSimulated` prop to Connection quest
- `web/src/app/dashboard/actions.ts` — allow completing connection without real session ID

---

### Phase 3: First Drive Mission (2h)

**Problem:** Missions screen is empty placeholder.

**Fix:** Add 1 real mission:

```
Mission 01: First Drive
├── ✓ Connect to demo [completed if connection quest done]
├── ○ Arm simulated controls [user clicks ARM in Cockpit]
├── ○ Send drive command [user clicks joystick]
└── ○ Complete safely [user clicks stop]
```

After completing → `robot_progress.first_drive_complete = true`

**Files:**
- `web/src/components/owner-console.tsx` — Missions component content
- `web/src/lib/roboforge-data.ts` — mission definitions

---

### Phase 4: Polish (1h)

- [x] Landing page language switch EN/TH works
- [ ] Add "Continue with Google" to landing page (not just /login)
- [ ] Show profile completion % in Garage
- [ ] `onboarding_completed = true` after first drive mission

**Files:**
- `web/src/app/page.tsx` — add Google CTA
- `web/src/components/owner-console.tsx` — progress bar

---

## Files Changed (Total)

```
web/src/app/page.tsx               — add Google CTA
web/src/app/dashboard/page.tsx     — welcome state
web/src/app/dashboard/actions.ts   — simulated connection completion
web/src/components/owner-console.tsx — Connection quest + Missions
web/src/lib/roboforge-data.ts      — mission definitions
web/src/lib/supabase/server.ts     — first-visit detection
```

**Zero backend changes.** All Supabase/firmware/hardware unchanged.

---

## Deliverable

After Phase 1-4, a beta tester can:
1. Open [roboforge-saas.vercel.app](https://roboforge-saas.vercel.app) → see demo
2. Create account via Google
3. Enter Garage → see "Welcome" + demo robot
4. Run simulated Connection Quest → complete
5. Enter Cockpit → arm → drive → stop
6. Complete "First Drive" mission → `onboarding_completed = true`

This is a **complete simulated user journey** that proves the app works end-to-end.
