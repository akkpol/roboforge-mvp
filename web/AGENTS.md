<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## RoboForge Product Direction

- RoboForge is a multi-robot modular identity and control platform, not a
  rover-only controller.
- One customer can collect rover, tracked, drone, arm, and future robot types.
- The current physical Rover-01 is represented by a premium Digital Form.
- Always distinguish `Digital Form`, `Physical Unit`, and `Future Upgrade`.
- Forge Core is the default global theme. Neo Anime is the first alternate
  theme.
- Never imply that concept shells, autonomous capabilities, OTA, marketplace,
  streaming, or swarm controls already ship before the matching safety gates and
  runtime support exist.
- Device Cockpit source lives in `web/device`; keep it as a static local-control
  build target even though Web Garage uses Next/Supabase.
