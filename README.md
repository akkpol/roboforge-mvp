# RoboForge MVP

RoboForge is a mobile-first robot identity and control platform. This MVP has two builds from one Preact codebase:

- **Public Demo:** product story, multi-robot Garage, Forge/Neo themes, simulated Cockpit, Beta application, and demo booking.
- **Device Mode:** the same interface served by Rover-01 over its ESP32 Wi-Fi access point with local motor control.

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

## MVP Boundaries

The app does not accept payment, create cloud accounts, stream camera video, use autonomous control, or claim future body kits and sensor packs are currently shipping. The UI explicitly separates the Digital Form, Installed Hardware, and Future Body Kit.

See [firmware/README.md](firmware/README.md) for wiring, battery configuration, upload steps, and the mandatory raised-wheel safety test.
