# Connection Quest Artboard Contract

## Reference Intake

- Source of truth: `docs/design-reference/connection-quest/prototype.png`
- Intrinsic reference size: `866 x 1815`
- Canonical CSS viewport: `430 x 900` inferred from the requested mobile wireframe and Playwright QA viewport.
- Reference scale note: reference appears to be roughly a 2x export of a `430 x 900` phone stage.
- Current QA screenshots:
  - `web/.qa-connect/connect-idle-mobile.png`
  - `web/.qa-connect/connect-online-mobile.png`

## Content Box

- Outer viewport: `430px` wide.
- Shell max width: `min(430px, 100%)` on phone, inherited from `.lumina-shell`.
- Phone gutters: `16px` each side.
- Usable content width: `398px`.
- Top bar reservation: `82-92px`.
- Bottom nav reservation: `58-66px`.
- Short viewport behavior: controlled scroll is allowed, but the first viewport should show through the primary action area when possible.

## Section Budget

| Section | Target | Minimum | Type | Compression order |
|---|---:|---:|---|---|
| Top bar | 54px | 48px | fixed app chrome | preserve brand/action recognition |
| Title copy | 90px | 78px | flexible | reduce top gap before shrinking headline |
| Progress rail | 52px | 46px | flexible | keep as one-row rail on phone |
| Rover connection card | 220px | 196px | fixed-ratio cluster | shrink stage/card before changing object order |
| Step cards | 170px | 156px | flexible | reduce icon/index sizes and body copy |
| Advanced details | 50px | 44px | flexible | closed by default |
| Lyra tip | 78px | 70px | fixed character crop + flexible bubble | crop lower body before shrinking face |
| Actions | 48px | 44px | flexible | keep primary action readable |
| Safety note | 26px | 22px | flexible | preserve safety note before wheel test |
| Bottom nav | 58px | 52px | fixed nav shell | preserve app-shell recognition |

## Numeric QA

- Run `npm run qa:connect` from `web/` with a local server on `http://127.0.0.1:3000`.
- The checker compares live DOM boxes against the prototype-derived `430 x 900` artboard and writes `composition-measurement.json`.
- Default QA is advisory; set `CONNECT_QA_STRICT=1` to make the command fail when the layout exceeds the budget.
- The live page target allows the `908px` inferred artboard plus `24px` shell padding, so a document height up to `932px` is treated as in-budget.

## Crop And Overlap Rules

- Background garden-lab image can crop freely on all sides.
- Rover wheels, face, antenna, and platform rim are no-crop zones.
- Platform glow may overlap the connection card interior freely; solid rover silhouette must not collide with map icons.
- Lyra face, pointing hand, and tablet are no-crop zones; lower torso can crop inside the helper card.
- Bottom nav must not overlap the safety note or action buttons.
- Advanced details drawer is closed by default and may expand page height.

## Fixed Vs Flexible

- Fixed-ratio assets: Rover cutout, summon platform, Lyra connection cutout.
- Rebuilt-native UI: top bar, progress rail, connection map, Wi-Fi choices, step cards, actions, safety note, bottom nav.
- Overlap-limited: Rover/platform/card glow and Lyra/bubble pointer.
- Flexible: copy density, card padding, vertical gaps, and hotspot guidance inside the Wi-Fi step/Lyra tip.
