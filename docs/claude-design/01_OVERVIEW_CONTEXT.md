# BoothBop Design Handoff: Overview Context

Audience: Claude Design or another design-focused agent.

Purpose: produce screen wireframes and media template designs that can be
implemented in this repo without fighting the existing architecture.

## Product Summary

BoothBop is a local-first iPhone photo booth app. The core loop is:

1. Prop up the phone.
2. Start a four-shot countdown.
3. Capture four square selfie frames.
4. Review a classic 1x4 photostrip by default.
5. Optionally edit look/layout/props/templates.
6. Save/share the strip, GIF, boomerang GIF, looping video, or all assets.

The app should feel like a fast private selfie booth first, then grow into a
lightweight event booth. Mini Photobooth is the feature benchmark, but BoothBop
should stay simpler, more immediate, and privacy-forward.

## Existing Implementation Context

Framework and language:

- React + TypeScript.
- Vite.
- Tailwind CSS v4 utilities.
- Capacitor iOS native shell.
- Canvas-based rendering for strips, GIFs, and video.
- IndexedDB local gallery.

Important repo files:

- App orchestrator: `src/App.tsx`.
- Screens: `src/screens/*.tsx`.
- Shared components: `src/components/*.tsx`.
- UI primitives: `src/ui/*.tsx`.
- Render/export logic: `src/lib/*.ts`.
- Template presets: `src/lib/templates.ts`.
- Photo looks and sticker renderers: `src/lib/render.ts`.
- Strip layouts/themes: `src/lib/strip.ts`.
- Product research: `docs/MINI_PHOTOBOOTH_COMPETITIVE_RESEARCH.md`.

Design deliverables should respect the existing structure. If a design implies
new code, describe where it should live:

- New screen-level UI: `src/screens/`.
- Reusable UI: `src/components/` or `src/ui/`.
- Pure state/data/rendering logic: `src/lib/`.
- New template metadata: `src/lib/templates.ts` or a future
  `src/lib/templateCatalog.ts`.
- New bitmap template/sticker assets: propose `src/assets/` or `public/`, but
  call out bundle-size implications.

## Visual Direction

Current brand:

- Retro 1958-1965 atomic-age photobooth.
- Crisp, flat, high-contrast UI.
- No gradients.
- No glassmorphism.
- No glow effects.
- No decorative bokeh/orbs.
- No overly rounded cards.
- Borders are usually 2px black ink.
- Buttons are bold, rectangular, display-type controls.
- The finished photostrip is the hero artifact.

Existing color tokens from `src/index.css`:

| Token         | Hex       | Use                           |
| ------------- | --------- | ----------------------------- |
| `cream`       | `#f6e7cf` | App background                |
| `paper`       | `#faf6ee` | Button/control fill           |
| `ink`         | `#111111` | Text and borders              |
| `orange`      | `#e85a1a` | Primary action/selected state |
| `orange-dark` | `#c84a16` | Error/pressed emphasis        |
| `mustard`     | `#d9a441` | Accent/theme                  |
| `teal`        | `#3e7c78` | Accent/success/info           |
| `olive`       | `#6e7551` | Accent/theme                  |
| `warmgray`    | `#a89f92` | Secondary labels              |
| `brown`       | `#4b443c` | Muted body/support text       |

Typography:

- Display: `Bebas Neue`, fallback `Oswald`.
- Sans/workhorse: `Oswald`.
- Letter spacing should stay normal, not negative.
- Use uppercase display labels sparingly but consistently.

Existing UI conventions:

- Use existing primitives where possible:
  - `Button`
  - `IconButton`
  - `SegmentedControl`
  - `Toggle`
  - `Callout`
  - `Heading`
  - `SectionLabel`
  - `OverlayScreen`
- Do not design nested cards.
- Do not design marketing landing pages as the app's primary screen.
- App screens should feel dense, usable, and direct.
- For app controls, prefer icons or compact segmented controls over explanatory
  paragraphs.

## Responsive Targets

Design all core screens for these targets:

- iPhone compact portrait: 390 x 844.
- iPhone large portrait: 430 x 932.
- iPhone landscape: 844 x 390.
- iPad portrait: 820 x 1180.
- iPad landscape/event kiosk: 1180 x 820.
- Desktop browser preview: 1440 x 1100.

Primary implementation target today is iPhone portrait. iPad landscape matters
for future event mode and Mini Photobooth parity.

Safe-area constraints:

- The app root uses `height: 100dvh` plus safe-area padding.
- Avoid bottom controls that collide with home indicator.
- Keep primary action visible without scrolling when drawers are collapsed.
- If a drawer opens, the drawer may scroll internally or the screen may scroll,
  but the primary save/share action should remain easy to recover.

## What Not To Design

Do not design these as near-term screens unless explicitly requested:

- Account creation.
- Cloud login.
- User analytics dashboard.
- Multi-device event sync.
- Backend QR gallery.
- DSLR native control UI.
- AI/green-screen editor.
- Large enterprise operator console.

These are plausible future features, but they are not the next highest-impact
catch-up path.

## Output Expectations For Claude Design

Preferred deliverables:

1. Markdown wireframe specs with precise component hierarchy.
2. Optional simple ASCII layout blocks for structure.
3. Template metadata tables that can become TypeScript objects.
4. CSS/Tailwind class suggestions using existing tokens.
5. Explicit mobile and iPad variants where layout changes.
6. Notes about which existing files should change.

If producing code:

- Use TypeScript and React TSX.
- Use Tailwind utility classes.
- Use existing `src/ui` primitives instead of inventing a new design system.
- Keep business logic out of screen components.
- Do not call browser/native APIs directly from components.
- Keep new pure logic in `src/lib/` with tests.
- Keep assets base-path-aware when referenced from code.

## Core Design Goal

Make BoothBop feel like it has enough polished event/photo-template depth to be
worth paying for, without losing the one-tap booth flow. The highest priority is
to make the output artifact beautiful and varied; the second priority is to make
event mode credible.
