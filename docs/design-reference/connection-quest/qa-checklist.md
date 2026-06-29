# Connection Quest QA Checklist

## Canonical Viewport

- Use `430 x 900` mobile viewport for primary QA.
- Compare against reference source: `docs/design-reference/connection-quest/prototype.png`.
- Current screenshots:
  - `web/.qa-connect/connect-idle-mobile.png`
  - `web/.qa-connect/connect-measured-mobile.png`
  - `web/.qa-connect/connect-online-mobile.png`
- Numeric source of truth: `docs/design-reference/connection-quest/composition-measurement.json`.
- Latest numeric QA status: `ok`, document height `932px / 932px`, all tracked sections inside tolerance.

## Required Checks

- Top bar retains back button, RoboForge lockup, notification, and settings icons.
- Title reads `เชื่อมต่อ Rover` and stays inside first viewport.
- Progress rail shows 4 steps and changes state when MQTT status arrives.
- Rover sits fully on the summon platform; no wheel or antenna crop.
- Connection map order remains `แอปของคุณ -> Wi-Fi / Hotspot -> HiveMQ -> ESP32 Rover`.
- Hotspot copy states 2.4GHz or compatibility mode and internet requirement.
- Advanced details stay visually secondary and closed by default.
- Lyra helper card uses the new connection asset and does not show green fringe.
- Action buttons do not overlap the visual card, safety note, or bottom nav.
- Safety note remains visible before any wheel-test behavior.

## Current Reference-Fidelity Findings

[Resolved] Overall vertical density
Current:
The implementation full-page screenshot is now locked to the approved phone-stage budget with `documentOverflow: 0`.
Target:
The approved reference reads as a dense single phone-stage quest where the primary action and safety note are visible close to the bottom navigation.
Likely cause:
Original product clarification for hotspot fallback was added after the visual concept, increasing section count and card padding.
Recommended move:
Keep hotspot guidance folded into the Wi-Fi step and Lyra helper copy. Use `npm run qa:connect` before making density changes.

[Resolved] Visual card map density
Current:
The Rover visual card measures `221.3px` against a `220px` target and is within tolerance.
Target:
Rover stage should stay hero-like while the connection map remains compact beneath it.
Likely cause:
Rover stage and icon row originally used comfortable implementation defaults.
Recommended move:
Preserve the current compact stage variables unless the reference changes.

[Resolved] Lyra asset scale
Current:
Lyra reads as a compact helper strip and measures `84px` against a `78px` target, inside tolerance.
Target:
Lyra should feel like a helper tucked into the tip card, not a second hero.
Likely cause:
The generated asset has a large full bust, so the page crops and scales it with CSS.
Recommended move:
Keep CSS crop/scale as the default; regenerate only if edge QA finds face or hand artifacts.
