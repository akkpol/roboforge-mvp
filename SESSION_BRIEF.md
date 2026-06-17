# RoboForge Session Brief

Use this brief when opening a new working session.

## What I Want

I want RoboForge to become a platform where normal people can use real robots
without learning IoT first.

The first target is a real beta with 100-1000 users, so we can learn whether the
product and backend can handle early usage.

## Product Shape

- Users can sign up and log in.
- Users have their own Garage.
- Users can claim a real robot with a QR code or code.
- Users can connect to a robot in a simple guided flow that feels like a game.
- Users can open a Cockpit and control the robot.
- Lyra helps with setup, errors, and next steps.
- The backend records enough data to know what worked, what failed, and where
  users got stuck.
- Hardware details may change, so avoid locking the product too early to one
  exact board unless the current task is specifically firmware work.
- Supabase is currently on the free plan, so design the backend to be useful and
  lightweight.

## Current Direction

Keep the existing RoboForge product feel. It should not become a plain admin
dashboard. The Garage, robot identity, Cockpit, missions, theme, and companion
direction are part of the product.

## Helpful First Work Areas

- Product requirements for the beta.
- Supabase schema for ownership, claim, session, events, and feedback.
- Claim Robot flow.
- Connection Quest flow.
- Lyra setup and troubleshooting guidance.
- Admin/Ops view for beta health.
- Backend testing for 100-1000 early users.

## Ask When Needed

If hardware details matter and are not in the repo, ask for the current board,
motor driver, battery, wiring, or prototype photo before making a hardware-level
decision.
