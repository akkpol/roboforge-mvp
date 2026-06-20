# RoboForge

RoboForge is a mobile-first modular robot platform. The product architecture is:

- **Layer A, Physical Modular Hardware:** standard kits, partner modules, and
  the future hardware marketplace.
- **Layer B, Abstraction Engine:** robot profiles, module manifests, config and
  firmware generation, and visual behavior authoring.
- **Layer C, Control And Sharing:** Web Garage, local Cockpit, automation,
  streaming, swarm, blueprints, and marketplace sharing.

The repo still has multiple runtime surfaces while this architecture is being
unified:

- **Web Garage:** the main product app in `web/`.
- **Device Cockpit:** the static local-control build produced from
  `web/device` and served by Rover-01 over ESP32 Wi-Fi.
- **Public Demo:** a no-login tryout surface served from `web/public/demo`. It
  is not the product MVP.

## Current Product Direction

RoboForge should grow from the three-layer modular robotics architecture, not
from a standalone MVP page.
The experience people see first should still feel like RoboForge: Garage,
Cockpit, fleet selection, Forge/Neo themes, robot controls, and a companion-led
setup flow.

For product work, continue from the current `web/` direction: `/dashboard` is
the logged-in Web Garage, Supabase stores account/robot/session data, and the
same product flow connects to real robot units through local device control.

If the product direction changes later, update these docs first so future work
starts from the latest intent.

For the current beta direction, read [PRODUCT_REQUIREMENTS.md](PRODUCT_REQUIREMENTS.md).
For a short prompt to start future work, read [SESSION_BRIEF.md](SESSION_BRIEF.md).
For the beta verification path, read [docs/BETA_READINESS_RUNBOOK.md](docs/BETA_READINESS_RUNBOOK.md).
For the modular robotics platform boundary, read
[docs/MODULAR_ROBOTICS_PLATFORM.md](docs/MODULAR_ROBOTICS_PLATFORM.md).
For the likely first rover hardware from the prototype photos, read
[docs/ROVER_01_CANDIDATE_HARDWARE_TH.md](docs/ROVER_01_CANDIDATE_HARDWARE_TH.md).

## Runtime Architecture

RoboForge should feel like one product, not two separate apps.

- The **Web Garage** app is the internet-side home for login, robot profiles,
  kit codes, missions, admin visibility, blueprints, and beta health.
- The **Device Cockpit** is the lightweight static control surface served near
  the robot. It talks to the robot local API over the robot Wi-Fi so live
  joystick commands do not depend on Supabase or a round trip through the cloud.
- The **Public Demo** is only a tryout and sales surface. It must not become a
  second product.

The Device Cockpit source now lives under `web/device` with a separate static
build target for ESP32 LittleFS. That keeps one product architecture without
pretending the ESP32 can run the Next/Supabase SaaS runtime.

Keep Supabase as the beta system of record. Store ownership, setup progress,
session summaries, important events, and feedback there. Keep high-frequency
drive commands local to the user's device and the robot during the session.

Hardware can change later. The product boundary is the robot protocol, not a
specific board, as long as the robot can answer status checks and accept the
RoboForge control commands.

## Run The Web Garage

```powershell
cd web
npm install
npm run dev
```

The public no-login demo remains available at `/demo/index.html` from
`web/public/demo`.

## Build Targets

```powershell
cd web
npm run build
npm run build:device
```

`npm run build` produces the Next/Supabase Web Garage build. `npm run
build:device` produces `web/dist-device/` and copies it to `firmware/data/` for
LittleFS.

## Current Build Boundary

The first shipped build slice is the Rover-01 Standard Kit path inside the
larger three-layer platform:

- Layer A starts with ESP32 Rover-01 and partner-ready kit facts.
- Layer B starts with Hardware Profile, Module Slots, Blueprint, and generated
  config/manifest from the production contracts in `hardware/`.
- Layer C starts with Web Garage, Connection Quest, and local Cockpit.

The first production foundation contracts live in:

- `hardware/standards/` for robot profile, module manifest, and device ID
  contracts.
- `hardware/kits/rover-01/` for the first standard kit manifest.
- `hardware/templates/` for the ESP32 config template used by Ops and firmware
  package generation.
- `web/src/app/api/` for module registry, config-only firmware generation, and
  the guarded OTA route.

Payment, OTA flashing, Blockly, plug-and-play discovery, video streaming,
swarm, and paid blueprint marketplace are still part of the platform
architecture. Their contracts can exist now, but risky behavior only moves in
after the lower safety gates exist.

See [firmware/README.md](firmware/README.md) for wiring, battery configuration, upload steps, and the mandatory raised-wheel safety test.

The stable app-to-robot API is documented in [docs/ROBOT_PROTOCOL.md](docs/ROBOT_PROTOCOL.md).
Use it as the contract for ESP32 now and for other boards later.
