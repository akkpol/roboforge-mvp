# Loop Budget — RoboForge MVP

## Limits
| Metric | Cap |
|--------|-----|
| Daily token cap | 100,000 |
| Pause threshold | 80,000 |
| Max iterations per item per run | 3 |
| Max auto-PRs per day | 5 |

## Denylist Paths (NEVER auto-edit)
```
.env
.env.*
**/secrets/**
**/credentials/**
auth/**
payments/**
**/migrations/**
supabase/**
```

## Kill Switch
- Pause ALL loops: `cronjob action=pause job_id=<id>` for each job
- Emergency stop: `cronjob action=remove job_id=<id>`
