# RoboForge Web

Next.js SaaS shell for RoboForge owner accounts.

## Current SaaS Direction

RoboForge Web is the logged-in owner version of the product. It should keep the
core RoboForge experience people already understand from the demo: Garage,
Cockpit, fleet selection, Forge/Neo themes, robot controls, density, and visual
tone.

`/dashboard` is the authenticated SaaS entry point. Future work should connect
more real hardware paths behind that owner flow.

If the owner flow, hardware flow, or visual direction changes, write the new
intent here before building on it.

## Started Work To Preserve

- Supabase auth helpers, middleware, login, callback, and sign-out routes are in
  place.
- Google OAuth is wired through the app callback flow.
- The first multi-user schema with row-level security is in `supabase/schema.sql`.
- `/dashboard` is login-gated and uses real owner workspace, robot, progress,
  claim, connection, control-session, and feedback data.
- `/admin` is login-gated for `app_admins` and can create physical robot claim
  kits with a one-time code, claim URL, and QR image.
- The next product work is firmware/local robot protocol integration behind
  the existing RoboForge experience.

## Run Locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

## Supabase Auth

Create a Supabase project, enable Google auth and/or email/password auth, then add:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_APP_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

Run `supabase/schema.sql` in the Supabase SQL editor to create the first
multi-user tables with row-level security.

`SUPABASE_SERVICE_ROLE_KEY` is server-only and only needed for the optional beta
seed script. The `/admin` Ops view uses the authenticated user plus the
`app_admins` table.

## Claim Kits

Open `/admin` with an account in `app_admins`, then create a claim kit for each
physical robot. The action creates a robot, device row, progress row, hashed
claim code, QR link, printable card data, and a firmware kit manifest in one
flow.

Claim kit creation intentionally asks for the real board, motor driver, battery
chemistry/cell count, motor channel mapping, wiring note/photo, power switch,
and fuse/protected pack before it writes the kit. Do not create a physical kit
from defaults when those facts are unknown.

The QR opens `/dashboard?claim=<code>`. After login, the owner Garage claims the
robot and removes the code from the URL.

The generated manifest includes the `firmware/include/config.h` block, local
Wi-Fi SSID/password, claim URL, and protocol check commands that write evidence
JSON for that unit.

After the kit exists, use the Hardware Profile panel in `/admin` to store the
actual board model, motor driver, battery chemistry/cell count, wiring status,
power switch, fuse/protected pack, and readiness status before changing
firmware for that physical unit.

Use the Bench Checklist panel in `/admin` to record the real kit test path:
power, robot Wi-Fi, protocol checks, raised-wheel movement, emergency stop, and
floor readiness evidence.

For Google auth, add this app callback in Supabase Redirect URLs:

```text
https://roboforge-saas.vercel.app/auth/callback
http://localhost:3000/auth/callback
```

Set the Supabase Auth Site URL to the production app:

```text
https://roboforge-saas.vercel.app
```

In Vercel, set this public env var for production:

```text
NEXT_PUBLIC_APP_URL=https://roboforge-saas.vercel.app
```

In Google Cloud, use the Supabase callback URL from the Google provider setup:

```text
https://<project-ref>.supabase.co/auth/v1/callback
```

## Beta Load Test

Dry-run the expected row volume for the first beta without writing data:

```bash
npm run seed:beta -- --users=1000 --robots=300
```

The script defaults to dry-run. Only use `--execute` against a disposable
Supabase branch or test project after setting `ROBOFORGE_ALLOW_PROD_SEED=true`
and the service role key.

The estimate includes owner accounts, physical claim kits, robot device
profiles, bench and raised-wheel test records, connection summaries, control
summaries, events, and feedback. It intentionally does not model live joystick
commands as cloud rows.

## Deploy

Use a new Vercel project with Root Directory set to `web`.

For the SaaS app, use a separate Vercel project or intentionally migrate the
existing root project from the Vite demo in `app`.

## Checks

```bash
npm run lint
npm run build
```

Known warning: `npm audit` reports a moderate `postcss` advisory through
Next.js 16.2.9. The offered fix currently uses `--force` and downgrades Next to
an old major version. Review that fix manually before applying it.
