# RoboForge Web

Clean restart web shell for **Lumina Garden Garage**.

This round intentionally keeps the public product surface small:

- `/` is the mock-first Lumina Garden Garage.
- `/login` is the Supabase auth shell.
- `/auth/callback` and `/auth/sign-out` stay available for the auth flow.

Old public product routes such as dashboard, admin, settings, demo, missions,
engineer, store, and profile are intentionally removed from the Next.js app for
this restart.

## Product Direction

Lumina Garden Garage is a soft, friendly, anime-inspired setup screen for
Rover-01. The first experience should feel plug and play:

1. Show the Rover and Lyra companion immediately.
2. Confirm the four starter hardware parts.
3. Guide the owner into the first connection mission.
4. Keep future tabs disabled until their wireframes are approved.

Every new visible screen after this point should start with a wireframe or
mockup confirmation before coding.

## Current Stack

- Next.js App Router
- Tailwind CSS 4 with `@tailwindcss/postcss`
- Small shadcn-style primitives in `src/components/ui`
- `motion` for soft entrance and interaction animation
- `next-themes` for palette switching
- `lucide-react` for lightweight icons
- Supabase SSR client shell with `@supabase/ssr` and `@supabase/supabase-js`

## Theme System

Theme palettes live in `src/app/globals.css`.

Supported palettes:

- `lumina`
- `mint`
- `peach`
- `lavender`
- `sky`
- `light`

Use semantic CSS variables instead of hardcoded colors when adding UI. The
theme switcher should change palette only, not layout.

## Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Supabase Auth Shell

Create `.env.local` when real auth is needed:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_APP_URL=
```

For Google auth, add these callback URLs in Supabase:

```text
http://localhost:3000/auth/callback
https://<production-domain>/auth/callback
```

The current UI remains mock-first. Do not wire new data-heavy flows until the
screen has been designed and approved.

## Checks

```bash
npm run lint
npm run build
```
