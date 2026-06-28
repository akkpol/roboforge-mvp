# Loop Engineering — RoboForge MVP

## Active Loops

| Loop | Cadence | Level | Status |
|------|---------|-------|--------|
| Daily Triage | 1d | L1 (report) | Ready — skills exist, STATE.md + budget + run-log in place |
| PR Babysitter | 15m | L1 (watch) | Pending — activate after 1 week of daily triage |
| Post-Session Cleanup | on-demand | L1 (manual) | Ready — run `skill_view(name='post-session-cleanup')` |

## Project Knowledge (for loop context)
- **Stack**: Next.js 16, React 19, Supabase, npm
- **Vercel prod**: roboforge-saas.vercel.app (auto-deploy from main)
- **Supabase**: ufvsuzwlziokayoauyxh (robot-forge-db, SG)
- **PR mandatory** — never push direct to main
- **Landing page**: server component, NOT OwnerConsole
- **Device Cockpit**: web/device, static local-control build target

## Loop Files
- `STATE.md` — memory spine
- `LOOP.md` — this file
- `loop-budget.md` — token caps + denylist
- `loop-run-log.md` — append-only audit trail

## Kill Switches
- Pause: `cronjob action=pause job_id=<id>`
- Kill: `cronjob action=remove job_id=<id>`
- Budget: 100k tokens/day (see `loop-budget.md`)

## Hermes Skills Used
- `loop-triage` — `skill_view(name='loop-triage')`
- `post-session-cleanup` — `skill_view(name='post-session-cleanup')`
- `loop-engineering-universal` — full concept guide
