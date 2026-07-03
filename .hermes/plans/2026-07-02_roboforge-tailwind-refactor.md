# RoboForge Codebase Refactor Plan

> **Goal:** Simplify codebase to 2026 standards — Tailwind-first CSS, inline single-use UI into parent screens, keep only truly reusable components

**Current State:**
- globals.css: 3,833 lines (was 4,255), 116 custom classes
- 15 lumina components + 3 UI primitives + 2 top-level components
- Tailwind v4 installed but ZERO utility classes used in JSX
- All styling via bespoke CSS classes in globals.css

**Target State:**
- globals.css: ~300 lines (design tokens + complex visual art only)
- 5-7 truly reusable components
- Tailwind utilities for all layout/spacing/typography
- Co-located component styles where Tailwind can't express (hero art, animations)

---

## Task 1: Define Tailwind Theme in globals.css

Replace hand-written `:root` tokens with proper Tailwind v4 `@theme` block.

**Files:** `web/src/app/globals.css`

**Action:** Replace lines 1-73 (design tokens section) with Tailwind v4 `@theme`:

```css
@import "tailwindcss";

@theme {
  --color-background: #f7fbff;
  --color-background-2: #edf8ff;
  --color-foreground: #0d2448;
  --color-muted: #5e7599;
  --color-subtle: #92a4bf;
  --color-panel: rgba(255, 255, 255, 0.78);
  --color-panel-strong: rgba(255, 255, 255, 0.94);
  --color-line: rgba(85, 151, 209, 0.24);
  --color-line-strong: rgba(74, 190, 173, 0.48);
  --color-primary: #4ab8ff;
  --color-primary-strong: #226ddb;
  --color-primary-soft: rgba(74, 184, 255, 0.17);
  --color-mint: #45c49d;
  --color-mint-soft: rgba(69, 196, 157, 0.18);
  --color-lavender: #a88df5;
  --color-lavender-soft: rgba(168, 141, 245, 0.2);
  --color-peach: #f2aa72;
  --color-peach-soft: rgba(242, 170, 114, 0.2);
  --color-warm: #f4c150;
  --color-warm-soft: rgba(244, 193, 80, 0.22);
  --color-sky-soft: rgba(88, 178, 248, 0.18);
  --font-family-sans: Rajdhani, "Noto Sans Thai", sans-serif;
  --radius-lg: 28px;
  --radius-md: 24px;
  --radius-sm: 18px;
  --radius-pill: 999px;
}
```

Keep the `[data-theme]` variations but simplify to only change color properties.

---

## Task 2: Convert UI Primitives to Tailwind (Button, Badge, Progress)

**Files:** 
- `web/src/components/ui/button.tsx`
- `web/src/components/ui/badge.tsx`
- `web/src/components/ui/progress.tsx`

**Action:** Replace `cva` class mappings with Tailwind utilities directly.

**Button — before (cva → CSS classes):**
```tsx
const buttonVariants = cva("rf-button", { variants: { size: { default: "rf-button--default" }, variant: { primary: "rf-button--primary" } } });
```

**Button — after (Tailwind utilities):**
```tsx
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-[18px] font-bold cursor-pointer transition-all duration-180",
  {
    variants: {
      size: { default: "min-h-14 px-2 text-sm", icon: "w-11 h-11 p-0", sm: "min-h-10 px-3 text-[13px]" },
      variant: { 
        primary: "text-white bg-gradient-to-br from-[#41cbb7] to-[#1aa28d] shadow-lg",
        secondary: "text-white bg-gradient-to-br from-[#c6a7ff] to-[#8e71ed]",
        warm: "text-white bg-gradient-to-br from-[#74c8ff] to-[#3994e9]",
        ghost: "text-muted border border-line bg-transparent"
      }
    }
  }
);
```

**Badge:** Same pattern — inline `rf-badge` classes to Tailwind.

**Progress:** Same — `rf-progress` to Tailwind.

**Remove from globals.css:** `.rf-button`, `.rf-button--*`, `.rf-badge`, `.rf-badge--*`, `.rf-progress` (~120 lines saved).

---

## Task 3: Convert Layout Shells to Tailwind

Replace the main layout classes with Tailwind utilities.

**Remove from globals.css and use Tailwind in JSX:**
- `.lumina-shell` → `relative isolate mx-auto w-full max-w-[430px] min-h-screen overflow-x-clip px-4 pb-22`
- `.lumina-topbar` → `fixed top-[max(14px,env(safe-area-inset-top))] inset-x-4 z-50 flex items-center justify-between gap-3.5`
- `.topbar-left` → `flex items-center gap-2.5 min-w-0`
- `.brand-lockup` → `flex items-center gap-2.5 text-[#175399]`
- `.brand-mark` → `grid place-items-center w-[38px] h-[38px] border-2 border-[#2a67c8] rounded-[14px] bg-white/78 shadow-sm`
- `.round-action` → `relative flex items-center justify-center w-12 h-12 border border-line rounded-full text-[#18335d] bg-white/72 shadow-md`
- `.garage-layout` → `grid grid-cols-1 min-w-0 overflow-x-clip`
- `.bottom-nav` → `fixed bottom-[max(10px,env(safe-area-inset-bottom))] inset-x-4 z-50 flex items-center justify-between gap-1 p-1.5 border border-line rounded-[18px] bg-white/86 shadow-sm backdrop-blur-[18px]`

**Media queries for desktop:** Use Tailwind responsive prefixes (`md:`, `lg:`, `xl:`) instead of `@media` blocks.

---

## Task 4: Inline Single-Use Components into Parent Screens

Components used in exactly ONE place → inline their JSX into the parent. This eliminates component files, prop drilling, and makes maintenance simpler.

**Inline (remove component file, move JSX to parent):**

| Component | Used in | Lines |
|-----------|---------|-------|
| `action-bar.tsx` | `garage-screen.tsx` | 50 |
| `hardware-grid.tsx` | `garage-screen.tsx` | 94 |
| `mission-card.tsx` | `garage-screen.tsx` | 42 |
| `robot-shelf.tsx` | `garage-screen.tsx` | 60 |
| `hero-scene.tsx` | `garage-screen.tsx` | 44 |
| `lyra-tip.tsx` | `connect-screen.tsx` | 27 |
| `connection-map.tsx` | `connect-screen.tsx` (via connection-progress) | 34 |
| `connection-progress.tsx` | `connect-screen.tsx` | 43 |
| `rover-stage.tsx` | `connect-screen.tsx` + `hero-scene.tsx` | 34 |

**Keep as reusable components:**
| Component | Shared by | 
|-----------|-----------|
| `top-bar.tsx` | garage-screen, connect-screen, profile-screen, login, install |
| `bottom-nav.tsx` | garage-screen, connect-screen, profile-screen |
| `robot-silhouette.tsx` | hardware-grid (used multiple times in map) |
| `theme-provider.tsx` | layout.tsx |
| `Button` (ui) | everywhere |
| `Badge` (ui) | hardware-grid |
| `Progress` (ui) | unused currently |

**Special case — `rover-stage.tsx`**: Used in BOTH hero-scene and connect-screen. Keep as reusable component but simplify its CSS.

---

## Task 5: Convert Remaining Component CSS to Tailwind

For components that stay as separate files, convert their CSS classes to Tailwind utilities.

**After Tasks 1-4, globals.css should only contain:**
1. `@import "tailwindcss"` + `@theme` block (~60 lines)
2. `[data-theme]` variations (~30 lines)
3. Base element styles: `*`, `html`, `body`, `a`, `button:focus-visible` (~25 lines)
4. Complex visual art (hero backgrounds, gradients, masks) — things Tailwind can't express:  
   - `.poster-hero` + `::before`/`::after` + `.hero-atmosphere` (~60 lines)
   - `.hero-copy` + `h1` + `span` (~30 lines)
   - `.lyra-stage` + `::after` + `.lyra-asset` (~40 lines)
   - `.rover-stage` + `.rover-asset` + `.summon-ring` + `.platform-asset` (~50 lines)
   - `.rover-stage--connect` (~15 lines)
   - `.floating-lyra-nameplate` (~20 lines)
   - `.hardware-card-surface` (complex layered backgrounds) (~30 lines)
   - `@keyframes ringPulse` + `softRiseIn` (~30 lines)
   - Reduced motion + responsive for hero art only (~40 lines)

**Target: ~300-400 lines total.**

---

## Task 6: Replace `.hardware-*` Art with Tailwind + Inline SVG Classes

The `.hardware-card`, `.hardware-card-surface`, `.hardware-illustration`, `.hardware-label`, `.check-badge` can mostly use Tailwind.

**Keep only the complex `::before` pseudo-element** (layered radial gradients) as a CSS class. Everything else → Tailwind.

---

## Task 7: Remove Dead Component Files

Delete files whose content was inlined in Task 4:
- `web/src/components/lumina/action-bar.tsx`
- `web/src/components/lumina/hardware-grid.tsx`  
- `web/src/components/lumina/mission-card.tsx`
- `web/src/components/lumina/robot-shelf.tsx`
- `web/src/components/lumina/hero-scene.tsx`
- `web/src/components/lumina/lyra-tip.tsx`
- `web/src/components/lumina/connection-map.tsx`
- `web/src/components/lumina/connection-progress.tsx`
- `web/src/components/lumina-garage.tsx` (1-line re-export, unused)

Update any remaining imports (e.g., `connect-screen.tsx` importing `LyraTip`, `ConnectionProgress`).

---

## Task 8: Verify Build + Visual Regression

```bash
cd web && npm run build
```

Ensure:
- No build errors
- No missing imports
- Visual output matches current production (use `npm run qa:connect` if applicable)
- All TSX compiles without type errors

---

## Files Changed Summary

| File | Action |
|------|--------|
| `web/src/app/globals.css` | Rewrite: ~300 lines (was 3,833) |
| `web/src/components/ui/button.tsx` | Tailwind-ify |
| `web/src/components/ui/badge.tsx` | Tailwind-ify |
| `web/src/components/ui/progress.tsx` | Tailwind-ify |
| `web/src/components/lumina/top-bar.tsx` | Tailwind-ify classes |
| `web/src/components/lumina/bottom-nav.tsx` | Tailwind-ify classes |
| `web/src/components/lumina/garage-screen.tsx` | Inline action-bar, hardware-grid, mission-card, robot-shelf, hero-scene JSX |
| `web/src/components/lumina/connect-screen.tsx` | Inline lyra-tip, connection-progress, connection-map JSX |
| `web/src/components/lumina/profile-screen.tsx` | Tailwind-ify classes |
| `web/src/components/auth-form.tsx` | Tailwind-ify classes |
| `web/src/components/lumina/rover-stage.tsx` | Simplify CSS (keep as reusable) |
| `web/src/components/lumina/robot-silhouette.tsx` | Tailwind-ify (keep as reusable) |
| `web/src/components/lumina/action-bar.tsx` | **DELETE** |
| `web/src/components/lumina/hardware-grid.tsx` | **DELETE** |
| `web/src/components/lumina/mission-card.tsx` | **DELETE** |
| `web/src/components/lumina/robot-shelf.tsx` | **DELETE** |
| `web/src/components/lumina/hero-scene.tsx` | **DELETE** |
| `web/src/components/lumina/lyra-tip.tsx` | **DELETE** |
| `web/src/components/lumina/connection-map.tsx` | **DELETE** |
| `web/src/components/lumina/connection-progress.tsx` | **DELETE** |
| `web/src/components/lumina-garage.tsx` | **DELETE** |
| `web/src/app/login/page.tsx` | Tailwind-ify classes |
| `web/src/app/profile/page.tsx` | Tailwind-ify classes |

**Estimate:** globals.css goes from 3,833 → ~350 lines. Component count goes from 20 → ~10 files. Every layout/spacing property uses standard Tailwind utilities.
