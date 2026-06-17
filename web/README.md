# RoboForge Web

Next.js SaaS shell for RoboForge owner accounts.

## Current SaaS Direction

Do not turn this into a generic dashboard. The original RoboForge demo is the
source of truth for the product experience: Garage, Cockpit, fleet selection,
Forge/Neo themes, robot controls, density, and visual tone.

`/dashboard` is the authenticated SaaS entry point and preserves the demo
surface as native Next.js components. Future work should keep the existing
Garage, Cockpit, fleet selection, Forge/Neo themes, robot controls, density,
and visual tone while connecting more real hardware paths.

New sessions should continue the SaaS integration here. Do not restart from a
blank MVP shell or rebuild a plain admin control panel unless the product
direction is explicitly changed.

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

The QR opens `/dashboard?claim=<code>`. After login, the owner Garage claims the
robot and removes the code from the URL.

The generated manifest includes the `firmware/include/config.h` block, local
Wi-Fi SSID/password, claim URL, and the protocol check commands for that unit.

For Google auth, add this app callback in Supabase Redirect URLs:

```text
https://<your-domain>/auth/callback
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

## Deploy

Use a new Vercel project with Root Directory set to `web`.

The existing root `vercel.json` still deploys the Vite demo in `app`, so do not
reuse that Vercel project for this SaaS app unless you intentionally migrate it.

## Checks

```bash
npm run lint
npm run build
```

Known warning: `npm audit` reports a moderate `postcss` advisory through
Next.js 16.2.9. The offered fix currently uses `--force` and downgrades Next to
an old major version, so do not apply it blindly.
