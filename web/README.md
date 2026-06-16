# RoboForge Web

Next.js SaaS shell for RoboForge owner accounts.

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
```

Run `supabase/schema.sql` in the Supabase SQL editor to create the first
multi-user tables with row-level security.

For Google auth, add this app callback in Supabase Redirect URLs:

```text
https://<your-domain>/auth/callback
```

In Google Cloud, use the Supabase callback URL from the Google provider setup:

```text
https://<project-ref>.supabase.co/auth/v1/callback
```

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
