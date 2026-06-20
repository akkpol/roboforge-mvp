# Beta Readiness Runbook

Use this when checking whether RoboForge is ready for the first 100-1000 user
beta. It is a proof path, not a replacement for product judgment.

## What Ready Means

RoboForge is beta-ready only when these are true:

- users can log in and own a Garage
- Ops can create a physical claim kit
- the robot can be claimed by code or QR
- Connection Quest records setup outcomes
- local Cockpit keeps live drive commands off Supabase
- `/admin` shows enough health data to understand failures
- firmware passes bench and raised-wheel checks on the real kit

Until the physical board arrives, treat hardware proof as incomplete.

## Local Checks

From `web/`:

```powershell
npm run check:supabase
npm run seed:beta -- --users=100 --robots=10
npm run seed:beta -- --users=1000 --robots=300
npm run lint
npm run build
```

Expected meaning:

- `check:supabase` should return `ok: true`.
- If only the publishable key is available, `verificationLevel:
  limited_by_rls` is acceptable.
- For a full read-only count check, set `SUPABASE_SERVICE_ROLE_KEY` locally and
  rerun `npm run check:supabase`.
- `seed:beta` without `--execute` is dry-run only and should keep
  `liveJoystickRowsInSupabase` at `0`.

## Supabase Remote Proof

Use the Supabase connector or SQL editor to verify the production project before
inviting testers.

Minimum evidence:

- expected tables exist
- RLS is enabled on beta tables
- expected security-definer RPCs exist
- anon cannot call admin RPCs
- `app_admins` has the intended admin user
- migrations include the latest beta health and connection updates

The last connector verification on June 19, 2026 found:

- 16 expected tables present
- RLS enabled on all expected tables
- 7 expected security-definer functions present
- 44 public policies
- 15 applied migrations
- latest migration: `20260619010141 add_latest_connections_to_beta_health`

Refresh this snapshot before using it as launch evidence.

## Test Branch Seed

Only seed a disposable Supabase branch or test project:

```powershell
$env:ROBOFORGE_ALLOW_PROD_SEED='true'
npm run seed:beta -- --users=100 --robots=10 --execute --batch=<test-batch>
```

After seeding, open `/admin` with an `app_admins` account and confirm:

- user and robot counts match the seed scale
- claim kits appear
- hardware readiness breakdown appears
- connection failures are grouped
- control sessions are summaries, not joystick rows
- feedback reports appear

Do not use `--execute` on the production project unless there is an explicit
reason and a rollback plan.

## Vercel Proof

After pushing `main`, verify the single SaaS project.

- latest production deployment is `Ready`
- `https://roboforge-saas.vercel.app/` returns `200`
- `/?lang=th` returns Thai copy
- `/admin` returns without server error
- production error/fatal logs are empty

## Hardware Proof

When the physical kit arrives, follow
`docs/ROVER_01_CANDIDATE_HARDWARE_TH.md` and `firmware/README.md`.

Required evidence:

- hardware profile saved in `/admin`
- power switch and fuse/protected pack verified
- battery voltage calibrated against a multimeter
- non-driving protocol check saved as bench evidence
- raised-wheel drive check saved as raised-wheel evidence
- only then consider a low-speed floor test

The goal is not to make Supabase drive the robot. Supabase should prove who owns
the robot, what setup did, what failed, and whether the prototype is safe enough
for the next step.
