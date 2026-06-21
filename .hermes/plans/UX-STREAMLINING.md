# RoboForge UX Streamlining Plan

## Current Problem

The app has **two separate experiences** and **7 internal screens** making first-time users overwhelmed:

```
SaaS path:   Landing → Login → Dashboard → OwnerConsole (7 screens)
Demo path:   Landing → /demo/index.html → Demo SPA → flat HTML/CSS app
```

**User confusion points (diagnosed from live browsing):**

1. Two separate entry points with different UI (SaaS and Demo)
2. 7 Console screens with no clear "what do I do first" guide
3. Profile settings at a separate URL (/dashboard/settings)
4. Demo doesn't guide toward creating an account

---

## Proposed Changes

### Change 1: Merge Demo into SaaS with a "try mode" toggle

**Current:** Demo at `/demo/index.html` as a separate Vite app.
**Proposed:** Move demo experience INLINE into the SaaS dashboard as a "Preview" state.

- When user visits `/dashboard` without logging in → show a lightweight preview page with "Create an account" and "Login" CTAs, not a login wall
- The preview shows the Garage with mock robots and a "Try the Cockpit" button that opens a simulated Cockpit

**Why:** Users can see the product *before* committing to sign up.

---

### Change 2: Reduce Console screens from 7 → 4

**Current screens:** garage, connect, profile, cockpit, missions, engineer, store
**Proposed screens:** garage, cockpit, learn, store

| New Screen | Merges | Purpose |
|-----------|--------|---------|
| **garage** | (existing) | Fleet overview + physical layer status |
| **cockpit** | cockpit + connect | Single control entrance — "Connect first, then drive" |
| **learn** | missions + engineer | Progressive learning path: missions → codex → firmware |
| **store** | store (existing) | Upgrades, beta applications, hardware interest |

**Removed:**
- `profile` → merged into garage (robot identity shown top-level)
- `connect` → merged into cockpit (guided connection shown *inside* cockpit before driving)
- `missions` → merged into learn section
- `engineer` → merged into learn section (codex + firmware become lessons in the learning path)

---

### Change 3: Add "Next Step" callout card to Garage

Current `owner-console.tsx` already has `nextStep` copy in i18n but it's not prominently shown.
**Proposed:** Top of Garage shows a card:

```
┌─────────────────────────────────────────┐
│  🚀 START HERE                          │
│  Step 1: Create your RoboForge account  │  ← or "Login"
│  Step 2: Try the hosted demo            │
│  Step 3: Get a Rover-01 kit             │
│  Step 4: Connect and drive              │
└─────────────────────────────────────────┘
```

Each step is clickable and routes to the next action.

---

### Change 4: Profile settings integrated into Garage

Move from `/dashboard/settings` (separate URL) to a **modal** that slides out from the topbar gear icon directly inside the OwnerConsole.

Users stay in the same context instead of switching pages.

---

### Change 5: Simplify landing page path

**Current:** Landing → "Enter Web Garage" → `/dashboard` → auth wall → `/login`
**Proposed:** Landing → "Try the demo" (inline preview) with "Create account" always visible

- Remove `/dashboard` auth redirect wall
- `/dashboard` shows preview when unauthenticated (not a redirect)
- `/login` stays as the hard login/signup page

---

## Implementation Order

```
Phase 1 (1-2h):
  - [ ] Merge "connect" screen into "cockpit" (guided connection shown before drive controls)
  - [ ] Remove "profile" screen, show robot identity in garage top area
  - [ ] Move profile settings from /dashboard/settings → inline modal in garage topbar

Phase 2 (1-2h):
  - [ ] Merge "missions" + "engineer" → "learn" screen with progressive disclosure
  - [ ] Add prominent "Next Step" card to garage
  - [ ] Update bottom navigation to 4 tabs: garage, cockpit, learn, store

Phase 3 (2-3h):
  - [ ] Replace /dashboard auth redirect with preview mode
  - [ ] Merge demo experience into SaaS dashboard
  - [ ] Landing page refinement
```

---

## Key Principle

**Do not change the codebase architecture.** All changes stay within:
- `web/src/components/owner-console.tsx` (the main UI)
- `web/src/lib/roboforge-data.ts` (data types)
- `web/src/app/dashboard/page.tsx` (server page)
- `web/src/app/dashboard/settings/` (move to inline modal)

No changes to Supabase, firmware, hardware manifests, API routes, or server actions.
