# RoboForge

RoboForge is a mobile-first robot identity and control platform. This repo now has three active surfaces:

- **Public Demo:** product story, multi-robot Garage, Forge/Neo themes, simulated Cockpit, Beta application, and demo booking.
- **SaaS Web:** authenticated owner workspace in `web/` using Next.js and Supabase while preserving the original demo UX.
- **Device Mode:** the same interface served by Rover-01 over its ESP32 Wi-Fi access point with local motor control.

## Current Product Direction

RoboForge should grow from the current demo into a real robot owner platform.
The experience people see first should still feel like RoboForge: Garage,
Cockpit, fleet selection, Forge/Neo themes, robot controls, and a companion-led
setup flow.

For SaaS work, continue from the current `web/` direction: `/dashboard` is the
logged-in owner Garage, Supabase stores owner/robot/session data, and the same
product flow gradually connects to real robot units.

If the product direction changes later, update these docs first so future work
starts from the latest intent.

For the current beta direction, read [PRODUCT_REQUIREMENTS.md](PRODUCT_REQUIREMENTS.md).
For a short prompt to start future work, read [SESSION_BRIEF.md](SESSION_BRIEF.md).
For the beta verification path, read [docs/BETA_READINESS_RUNBOOK.md](docs/BETA_READINESS_RUNBOOK.md).
For the likely first rover hardware from the prototype photos, read
[docs/ROVER_01_CANDIDATE_HARDWARE_TH.md](docs/ROVER_01_CANDIDATE_HARDWARE_TH.md).

## App Surface Architecture

RoboForge should feel like one product, not two separate apps.

- The **SaaS Web** app is the internet-side home for login, Garage ownership,
  claim kits, missions, admin visibility, and beta health.
- The **Device Mode** app is the lightweight control surface served near the
  robot. It talks to the robot local API over the robot Wi-Fi so live joystick
  commands do not depend on Supabase or a round trip through the cloud.

Keep Supabase as the beta system of record. Store ownership, setup progress,
session summaries, important events, and feedback there. Keep high-frequency
drive commands local to the user's device and the robot during the session.

Hardware can change later. The product boundary is the robot protocol, not a
specific board, as long as the robot can answer status checks and accept the
RoboForge control commands.

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

The stable app-to-robot API is documented in [docs/ROBOT_PROTOCOL.md](docs/ROBOT_PROTOCOL.md).
Use it as the contract for ESP32 now and for other boards later.
