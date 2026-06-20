# RoboForge Beta Requirements

## Product Goal

RoboForge is a robot identity and owner platform for real robots. The first goal
is to let 100-1000 early users try the product with real owner accounts, real
Garage ownership, and a simple path to connect a physical robot.

The product architecture is the three-layer modular robotics model:

- Layer A: Physical Modular Hardware, starting with standard kits and expanding
  toward partner modules and a hardware marketplace.
- Layer B: Abstraction Engine, hiding firmware, protocols, modules, OTA, and
  behavior logic behind robot profiles.
- Layer C: Control And Sharing, giving customers one app for Web Garage, local
  control, automation, streaming, swarm, and blueprint sharing.

The product should feel easy for non-IoT users: open the robot, follow the app,
connect, and drive like a game.

RoboForge should not feel like a technical control panel. It should feel like a
guided robot platform for normal people: a Garage for ownership, missions for
learning by doing, hardware lessons tied to the parts they actually have, and a
safe upgrade path for code and firmware.

In customer language, the promise is:

> Own a robot, learn how it works, upgrade it safely, and play through setup
> like a game.

This means the product must explain what to do next before it exposes technical
details. Technical detail still matters, but it should appear at the moment the
user needs it.

## First Users

- Individual robot builders and early adopters.
- Schools or workshop groups that may manage multiple robots.
- Beta testers who can report setup, connection, and driving problems.

## First Paid Offer

The first paid offer should stay narrow:

> RoboForge Rover-01 Beta Kit + guided setup workshop + Web Garage.

This is not a general robot marketplace yet. Sell the first complete path:

- a prepared Rover-01 beta kit after hardware proof
- a guided setup workshop so non-IoT users can get through first connection
- a Web Garage owner account with claim, Connection Quest, missions, and support

Keep payment handling outside the app until the real kit clears the hardware
proof gates. The app should collect paid-pilot applications and upgrade demand
signals, then Ops should decide who receives the first batch.

## Desired User Journey

1. A user creates an account.
2. The user opens their Garage.
3. The team creates a claim kit for a physical robot.
4. The user claims a robot with a QR code or claim code.
5. The robot appears in the Garage with identity, theme, status, and progress.
6. The app guides the user through a simple connection quest.
7. The user connects to the robot local Wi-Fi and opens the local Cockpit.
8. The user checks safety, arms the robot, drives, releases to stop, and ends
   the session.
9. The user sees simple missions that teach the hardware piece by piece.
10. The user can see the robot's current code/firmware version and understand
    whether an upgrade is available.
11. The system records enough summary data to know whether the beta worked.

## Customer Product Model

The product should organize itself around five customer-facing areas:

- **Web Garage:** the user's home base for owned robots, progress, claim codes,
  status, and next steps.
- **Connection Quest:** the guided setup path from power-on to robot Wi-Fi to
  local Cockpit.
- **Missions:** game-like tasks that teach and validate real behavior, such as
  first connection, raised-wheel drive, battery check, and first floor test.
- **Hardware Codex:** plain-language explanations for the actual parts in the
  user's kit, starting with ESP32, motor driver, motors, battery, wiring, power
  switch, and safety protection.
- **Firmware Lab:** the safe code and firmware area. The first beta should show
  versions, compatibility, release notes, and guarded instructions before it
  allows one-click firmware updates.

These names are product modules, not separate products. They should be built in
phases while keeping one customer mental model.

## Entry Points

- `/` explains the product path and routes people by role.
- `/login` is the owner entry for account creation and Google/email login.
- `/login?lang=th` is the Thai owner entry from the Thai landing page.
- `/dashboard` is the logged-in owner Garage.
- `/dashboard?claim=CODE` is the QR/code claim path for a physical beta kit.
- `/admin` is the Beta Ops view for claim kits, hardware profiles, bench
  evidence, health, and failure review.
- `/demo/index.html` is the public no-login concept demo and must stay separate
  from real ownership/control. It is not the MVP product.

## Core Features For The First Beta

- Account and login.
- Personal Garage.
- Admin/Ops claim kit creation for physical robots, including QR, firmware
  config, local Wi-Fi details, and protocol check steps.
- Admin/Ops hardware profile capture for the prototype board, motor driver,
  battery, wiring status, fuse/switch, and readiness gate.
- Admin/Ops bench checklist for real prototype evidence: power, robot Wi-Fi,
  protocol checks, raised-wheel movement, emergency stop, and floor readiness.
- Claim robot by QR or code.
- Robot profile with type, name, theme, device info, and progress.
- Connection Quest for real robot setup.
- Local Cockpit for live driving.
- Lyra as setup and troubleshooting guide.
- Hardware Codex foundation: each physical kit should have understandable
  explanations for its board, motor driver, battery, motor layout, and safety
  gates.
- Firmware Lab foundation: show firmware/config identity and update guidance
  before enabling any risky write-to-device update flow.
- Device Cockpit migration path: keep local motor control as a static
  robot-served bundle, but move its source under the main web architecture so
  the product is one app with separate SaaS and device build targets.
- Session summaries for connection and control.
- Important robot events and error logs.
- Feedback reports from beta users.
- Admin/Ops view for beta health.

## Firmware Upgrade Boundary

Firmware upgrade is a real hardware risk. A bad update can leave the robot
unusable until the owner reconnects by USB or the team repairs it.

For the first build slice:

- show firmware version, board profile, and compatibility status
- show release notes in simple language
- require hardware profile readiness before recommending firmware changes
- keep live motor commands local to the robot Wi-Fi
- implement config/manifest generation first
- add one-click or OTA firmware upgrade only after a real kit has passed bench,
  raised-wheel recovery, and rollback/recovery tests

Later, Firmware Lab can add guided update flows, rollback instructions, signed
firmware packages, and per-board compatibility checks.

## Lyra Direction

Lyra should help the user understand what to do next. The first version can be a
scripted guide instead of a full AI agent.

Useful first jobs:

- Explain connection steps in plain language.
- Translate error codes into human advice.
- Suggest the next setup or mission step.
- Help the user recover when the robot is not found.
- Collect feedback after a failed setup or control session.

## Hardware Direction

The first physical path can use ESP32 and local Wi-Fi. Hardware then expands to
Raspberry Pi, Arduino-class boards, partner modules, and self-describing module
manifests. The stable contract should be the robot protocol in
`docs/ROBOT_PROTOCOL.md`:

- `status`
- `arm`
- `drive`
- `stop`
- `info`

Hardware can change later if the robot still speaks the same RoboForge control
language.

The modular platform direction is documented in
`docs/MODULAR_ROBOTICS_PLATFORM.md`. Keep the first implementation
profile-first: Hardware Profile, Module Slots, and Blueprint preview in the Web
Garage. Then extend the same Layer B/C model into the hardware marketplace, OTA
firmware generator, Blockly editor, swarm control, and video streaming.

The current candidate from the prototype photos is ESP32 DevKit /
ESP32-WROOM-32, L298N, TT DC motors, and a 2S 18650 Li-ion pack. Keep the
details in `docs/ROVER_01_CANDIDATE_HARDWARE_TH.md` and `/admin` Hardware
Profile, but do not treat the exact board as the product boundary.

## Backend Direction

Supabase should be used as the beta system of record, not as a live joystick
stream.

Store:

- Users and owner profiles.
- Workspaces and members.
- Robots and claim codes.
- Robot device information.
- Robot bench and raised-wheel test results.
- Connection session summaries.
- Control session summaries.
- Important robot events.
- Feedback reports.

Keep high-frequency joystick data on the user's device or the robot during the
session. Supabase should receive summaries and important events so the free plan
stays usable during the first beta.

## Beta Success Signals

- 1000 accounts can exist without confusing ownership or privacy problems.
- 300 robots can be claimed or simulated for testing.
- Users can understand the connection flow without knowing IoT.
- The team can see which physical robots passed bench and raised-wheel checks
  before floor testing.
- The team can see where users fail: account, claim, Wi-Fi connection, Cockpit,
  safety check, control, or feedback.
- The database does not grow mainly from noisy joystick commands.
- Row-level security keeps each user's robot data separate.

## Open Assumptions To Test

- Whether users can reliably find and join the robot Wi-Fi from common phones.
- Whether QR/code claim is the easiest ownership path.
- Whether Lyra should stay scripted or become AI-assisted after enough beta
  error data exists.
- Which hardware board and motor driver combination becomes the first standard
  kit.
- How much admin visibility is needed before the first paid beta.
