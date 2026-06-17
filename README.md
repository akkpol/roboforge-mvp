# RoboForge

RoboForge is a mobile-first robot identity and control platform. This repo now has three active surfaces:

- **Public Demo:** product story, multi-robot Garage, Forge/Neo themes, simulated Cockpit, Beta application, and demo booking.
- **SaaS Web:** authenticated owner workspace in `web/` using Next.js and Supabase while preserving the original demo UX.
- **Device Mode:** the same interface served by Rover-01 over its ESP32 Wi-Fi access point with local motor control.

## Current Direction

This project is past the "static MVP shell" stage. The original demo in `app/` is the UX source of truth for Garage, Cockpit, fleet selection, Forge/Neo themes, robot controls, and the product feel.

For SaaS work, do not replace that experience with a plain admin dashboard. Continue from the current `web/` direction: keep `/dashboard` login-gated, preserve the demo surface from `web/public/demo`, and incrementally connect Supabase auth, owner workspaces, robots, and sessions behind the same flows.

Future sessions should continue the SaaS integration from the existing demo experience, not restart or simplify the project back into a generic MVP.

## Live Demo

https://roboforge-mvp.vercel.app

## Run The Public Demo

```powershell
cd app
npm install
npm run dev
```

Public integrations are configured through:

```text
VITE_AIRTABLE_FORM_URL=
VITE_CALENDLY_URL=
```

Use `.env.public.local` for real URLs. Without them, the Beta form is saved to local storage and the booking action falls back to the Beta form.

## Build Targets

```powershell
cd app
npm run test
npm run build
npm run build:device
```

`npm run build` produces the Vercel-ready `app/dist/`. `npm run build:device` produces `app/dist-device/` and copies it to `firmware/data/` for LittleFS.

## Current Product Boundaries

The app does not accept payment, create cloud accounts, stream camera video, use autonomous control, or claim future body kits and sensor packs are currently shipping. The UI explicitly separates the Digital Form, Installed Hardware, and Future Body Kit.

See [firmware/README.md](firmware/README.md) for wiring, battery configuration, upload steps, and the mandatory raised-wheel safety test.
