# RoboForge Session Brief

Use this brief to understand what the product is trying to become.

## What I Want

I want RoboForge to become a platform where normal people can use real robots
without learning IoT first.

The first target is a real beta with 100-1000 users, so we can learn whether the
product and backend can handle early usage.

In plain customer terms: RoboForge should let people own a robot, learn how the
parts work, upgrade it safely, and move through setup like a game.

The first paid offer is intentionally narrow: RoboForge Rover-01 Beta Kit +
guided setup workshop + Web Garage. Use this to validate willingness to pay
while the full three-layer platform is built in phases.

The platform direction is:

- Layer A: Physical Modular Hardware, starting with the Rover-01 standard kit
  and growing into partner modules and a hardware marketplace.
- Layer B: Abstraction Engine, starting with profiles/config generation and
  growing into module discovery, OTA, and visual behavior programming.
- Layer C: Control And Sharing, starting with Web Garage and local Cockpit and
  growing into automation, streaming, swarm, blueprint sharing, and marketplace
  listings.

## Product Shape

- Users can sign up and log in.
- Users have their own Garage.
- The Garage separates Digital Form, Physical Unit, and Future Upgrade so a
  starter digital robot does not get confused with a claimed physical kit.
- The team can create claim kits for real robot units, including QR, firmware
  config, local Wi-Fi details, and protocol check steps.
- The team can store prototype hardware details in Ops before changing firmware
  for a specific unit.
- The team can record bench and raised-wheel test results before putting a
  physical robot on the floor.
- Users can claim a real robot with a QR code or code.
- Users can connect to a robot in a simple guided flow that feels like a game.
- Users can open a Cockpit and control the robot.
- Lyra helps with setup, errors, and next steps.
- Missions teach and validate each step, from first connection to safe driving.
- Hardware Codex explains the real parts in the kit in plain language.
- Firmware Lab should start by showing version, compatibility, and safe update
  guidance before any one-click firmware upgrade is allowed.
- Device Cockpit should move under the `web/` architecture while preserving a
  separate static build target for ESP32 LittleFS. The customer product should
  feel like one app even when the repo emits SaaS and device bundles.
- The backend records enough data to know what worked, what failed, and where
  users got stuck.
- Hardware details may change. The product should support the current prototype
  first, then stay flexible enough for future boards if they can speak the same
  robot protocol.
- Supabase is currently on the free plan, so design the backend to be useful and
  lightweight.
- The physical robot contract is `docs/ROBOT_PROTOCOL.md`; keep live motor
  commands local to the robot Wi-Fi.
- The beta verification path is `docs/BETA_READINESS_RUNBOOK.md`.
- The likely first hardware candidate from prototype photos is documented in
  `docs/ROVER_01_CANDIDATE_HARDWARE_TH.md`.

## Current Direction

Keep the RoboForge product feel: Garage, robot identity, Cockpit, missions,
theme, and companion guidance. The user should feel like they are setting up and
controlling their own robot, not filling out technical forms.

## Helpful First Work Areas

- Product requirements for the beta.
- Supabase schema for ownership, claim, session, events, and feedback.
- Claim kit creation for each physical robot.
- Claim Robot flow.
- Connection Quest flow.
- Lyra setup and troubleshooting guidance.
- Admin/Ops view for beta health.
- Backend testing for 100-1000 early users.
- Firmware/local protocol checks for the physical prototype.
- Device Cockpit migration into `web/`.
- Hardware profile capture for board, motor driver, battery, wiring, fuse,
  power switch, and readiness status.
- Bench checklist capture for power, robot Wi-Fi, protocol checks,
  raised-wheel movement, emergency stop, and floor readiness.
- Hardware Codex foundation for ESP32, motor driver, battery, motor layout, and
  safety protection.
- Firmware Lab foundation for version display, compatibility status, release
  notes, and safe upgrade guidance.

## Ask When Needed

If hardware details matter and are not in the repo, ask for the current board,
motor driver, battery, wiring, or prototype photo before making a hardware-level
decision.
