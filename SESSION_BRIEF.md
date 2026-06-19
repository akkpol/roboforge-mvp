# RoboForge Session Brief

Use this brief to understand what the product is trying to become.

## What I Want

I want RoboForge to become a platform where normal people can use real robots
without learning IoT first.

The first target is a real beta with 100-1000 users, so we can learn whether the
product and backend can handle early usage.

## Product Shape

- Users can sign up and log in.
- Users have their own Garage.
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
- The backend records enough data to know what worked, what failed, and where
  users got stuck.
- Hardware details may change. The product should support the current prototype
  first, then stay flexible enough for future boards if they can speak the same
  robot protocol.
- Supabase is currently on the free plan, so design the backend to be useful and
  lightweight.
- The physical robot contract is `docs/ROBOT_PROTOCOL.md`; keep live motor
  commands local to the robot Wi-Fi.
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
- Hardware profile capture for board, motor driver, battery, wiring, fuse,
  power switch, and readiness status.
- Bench checklist capture for power, robot Wi-Fi, protocol checks,
  raised-wheel movement, emergency stop, and floor readiness.

## Ask When Needed

If hardware details matter and are not in the repo, ask for the current board,
motor driver, battery, wiring, or prototype photo before making a hardware-level
decision.
