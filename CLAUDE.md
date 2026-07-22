# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

BoothBop is developed entirely by AI agents (Claude + Codex). This file and
the verification loop below are the contract that keeps that safe: make a
change, then prove it with `npm run check` before considering the work done.

Before changing native iOS, camera, launch, lifecycle, permissions, sharing,
media export, or distribution behavior, read `docs/IOS_AGENT_CONTEXT.md` and
preserve every invariant defined there.

## Product reset contract

Read `docs/PRODUCT_RESET.md` and `ROADMAP.md` before product work.

- Production development starts from App Store release `0.0.1 (0.0.2)` at
  commit `465876d` on `codex/product-reset`.
- `codex/0.1.0` and `codex/prototype-june-2026` are prototype references. Never
  merge either branch wholesale into the release line.
- A release may add at most one user-facing capability. Complete
  `docs/FEATURE_BRIEF_TEMPLATE.md` before implementing it.
- Existing prototype code creates no commitment to ship. Reimplement or port
  only the minimum approved behavior.
- `0.0.3` is a quality baseline with no new feature: launch proof, end-to-end
  core-flow coverage, and compact-device layout correctness come first.

## Quality bar — pristine, zero noise

This project holds a **high quality bar**. Treat every warning and error as a
defect to fix — **never dismiss it as "noise."** Apple/iOS strictness is a
feature; match it.

- `npm run check` stays green: 0 type/lint/test failures, **0 warnings**.
- The Xcode build and the on-device console should be clean. When something
  logs a warning, **eliminate the cause** (call `SplashScreen.hide()` when
  ready, adopt the UIScene lifecycle, don't register the service worker in the
  native shell, remove unreferenced assets) — don't explain it away.
- When triaging device logs, attribute **every** line to its source: fix
  anything our code emits; the rest is iOS/WebKit system output (LaunchServices
  `LSD`, `WebContent`, CoreMedia) present in every app — name it precisely, never
  hand-wave it.

## The verification loop (run this after every change)

```bash
npm run check      # typecheck + lint + format:check + tests — the single gate
```

CI runs `npm run check` plus the production Playwright journey. Treat a red
gate as "not done." Individual pieces, for tighter loops:

```bash
npm run typecheck                         # tsc --noEmit
npm run lint                              # eslint . (0 warnings expected — keep it that way)
npm run lint:fix                          # auto-fix lint
npm run format                            # prettier --write . (fix formatting)
npm run test                              # vitest run (one-shot)
npm run test:watch                        # vitest (re-run on change while iterating)
npm run check:e2e                         # production build + Playwright browser journeys
npx vitest run src/lib/strip.test.ts      # a single test file
npx vitest run -t "pickMimeType"          # tests matching a name
```

Other commands:

```bash
npm run dev          # local dev server; camera works because localhost is a secure context
npm run build        # tsc -b && vite build → dist/
npm run preview      # serve the production build
npm run gen:assets   # regenerate public/ icons from brand/ art (only when brand art changes)
```

## Bug-fix protocol (from the global rule)

When a bug is reported, **first write a failing test that reproduces it**, then
fix it and prove it with that test going green. This repo now has a Vitest
harness for exactly that — put the repro in the matching `src/lib/*.test.ts`.

## Architecture — the big picture

A 100%-client-side selfie photo-booth PWA. Take 4 photos on a countdown, then
export a **photo strip (PNG)**, **animated GIF**, or **looping video**. No
backend, no accounts, no uploads — privacy is the product. Deploys to GitHub
Pages on push to `main`.

**`src/App.tsx` is the orchestrator** — it owns the state machine + capture/media
flow and wires the screens together; it renders, but holds no screen markup
itself. It's driven by a **4-phase state machine**:

```
idle ──openCamera──▶ preview ──runSequence──▶ capturing ──▶ review
  ▲                     │                         │            │
  └──────── cancelToHome / failToHome ◀───────────┴────────────┘
Gallery and Settings are overlays, orthogonal to phase.
```

**Where things live:**

| Path                        | What                                                                                                                                                                                                              |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `App.tsx`                   | the orchestrator: phase state machine, capture/encode/share flow, screen wiring                                                                                                                                   |
| `screens/`                  | one file per screen — `IdleScreen`, `CameraScreen`, `ReviewScreen`, `GalleryScreen`, `SettingsScreen`, `MigrationScreen`                                                                                          |
| `components/`               | shared widgets — `TopBar`, `InstallCard`, `LegalFooter` (Privacy/Terms/Support), `ZoomableImage` (tap-to-zoom preview)                                                                                            |
| `hooks/`                    | `useAutosave` — auto-save settings + Photos-permission logic (see `docs/PERMISSIONS.md`)                                                                                                                          |
| `ui/`                       | the custom design-system primitives — compose these, don't hand-type classes: `Button`, `IconButton`, `SegmentedControl`, `Toggle`, `Callout`, `Heading`, `SectionLabel`, `OverlayScreen` (barrel: `ui/index.ts`) |
| `types.ts` · `constants.ts` | shared UI types (`Phase`, `Format`) and constants (`SHOTS`, `LOGO`)                                                                                                                                               |
| `lib/`                      | all real, React-free logic (see below)                                                                                                                                                                            |

- `runSequence()` (in App.tsx) is the heart: the 4-shot capture loop
  (countdown → flash → `captureSquareFrame` → push canvas to `frames[]`). An
  `abortRef` lets cancel / permission-loss bail out mid-sequence. On completion
  it stops the camera and auto-saves the session to IndexedDB (best-effort).
- All real logic lives in **pure, React-free modules under `src/lib/`**. Keep it
  that way: new logic goes in `src/lib/` with a unit test; screens are
  presentational; `App.tsx` orchestrates.

**`src/lib/` modules:**

| Module         | Responsibility                                                                                                         |
| -------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `camera.ts`    | `getUserMedia` (front camera + fallback); `captureSquareFrame` (centered **and mirrored** to match the selfie preview) |
| `strip.ts`     | `composeStrip` canvas compositing; `stripGeometry` (pure layout math, unit-tested); the 6 `THEMES`                     |
| `gif.ts`       | `encodeGif` — synchronous gifenc quantize/applyPalette per frame                                                       |
| `video.ts`     | `encodeVideo` via canvas `captureStream` + `MediaRecorder`; `pickMimeType` negotiates mp4→webm                         |
| `gallery.ts`   | IndexedDB CRUD (`boothbop`/`sessions`) + canvas↔blob helpers                                                           |
| `watermark.ts` | brand wordmark on GIF/video (strip is exempt — it has its own footer)                                                  |
| `platform.ts`  | capability detection — `canShareFiles` drives behavior; `isIOS` only tailors copy                                      |
| `icons.tsx`    | brand `<img>` icons (generated) + inline monochrome SVG utility icons                                                  |

## Conventions and gotchas that aren't obvious from one file

- **Current export warm-up.** The strip re-renders live via `useMemo`. After a
  capture, `pregenerate()` starts GIF and video encoding in the foreground and
  caches both results; the tabs reuse that cache. This is part of the released
  baseline, but it increases post-capture work. Do not expand or rewrite it
  without measuring the core review transition in the 0.0.3 quality cycle.
- **Share vs. download is feature-detected, never UA-sniffed.**
  `probeShareFiles()` decides whether the primary button is "Save / Share"
  (native share sheet) or "Save Photo" (download). Share failures fall back to
  download. `isIOS()` is only for wording install instructions.
- **Base path.** The site serves from the custom-domain root (boothbop.com), so
  Vite `base` is `/`. Every public asset URL must still go through
  `import.meta.env.BASE_URL` (see `LOGO`, `ICONS`, watermark `SRC`) so a sub-path
  build still works — hard-coding `/foo.png` is a latent bug. Override the base
  for a project-page build with `BASE_PATH=/your-repo/ npm run build`.
- **The watermark is a deliberate paid-tier seam.** `encodeGif`/`encodeVideo`
  take a `watermark` flag; a future "remove watermark" tier just passes `false`.
  Keep that flag threaded.
- **Camera robustness is load-bearing.** `videoReady()` waits for real pixels so
  we never count down onto a black frame; track-`ended` and permission
  `onchange` listeners send the user home with `CAMERA_MSG`. Preserve these when
  touching the camera flow.
- **PWA / offline.** `vite-plugin-pwa` (autoUpdate) precaches the whole app, so
  it runs offline after first load. Fonts are self-hosted (`@fontsource`) for
  the same reason. A new runtime asset that must work offline needs to be part
  of the precache glob in `vite.config.ts`.

## Roadmap & platform strategy (read before big structural changes)

See **`ROADMAP.md`** for the full plan. The short version that shapes how to
write code today:

- **Current platforms are the web PWA and native iOS via Capacitor.** The React
  app remains the source of truth; `ios/` is the shipping native shell.
- **Android is deferred.** Do not add it without a separately approved feature
  brief and distribution plan.
- **Keep the shared app portable:**
  1. Route every platform capability through `src/lib/` (camera, share,
     storage). Never call `navigator.mediaDevices`, `navigator.share`, or
     `indexedDB` directly from a component — those `lib/` modules are the exact
     seam the existing Capacitor shell adapts with native plugins.
  2. Feature-detect behavior, don't UA-sniff (see `platform.ts`).
  3. Keep asset URLs base-path-relative via `import.meta.env.BASE_URL` (a native
     build sets `BASE_PATH=/`).
- Native changes remain additive: preserve the root web app and keep iOS code
  limited to capabilities the shared app cannot provide reliably.
- **Monetization is unscheduled.** Do not add StoreKit, a paywall, entitlement
  logic, or paid-feature copy without a future product decision and feature
  brief. The existing watermark parameter is an implementation seam only.

## Public-repo hygiene

This repo is **public** (GitHub Pages free tier requires it), so commit only
what's needed to build and run the app. Build artifacts, caches, local/`.env`
files, secrets, and editor/OS cruft are all gitignored — keep it that way and
never commit secrets or local-only files. `brand/` (source art for the asset
pipeline) and `scripts/` are dev-time only but intentionally tracked so assets
stay reproducible.

## What unit tests can and can't cover

Tests run in **jsdom** (`vitest.config.ts`), which has **no real canvas 2D
context, no live camera, no MediaRecorder**. So:

- **Covered (unit-testable):** pure logic and anything fakeable in jsdom —
  `stripGeometry`/`THEMES`, `platform.ts` (mock `navigator`), `gallery.ts` CRUD
  (via `fake-indexeddb`), `video.ts` mime selection (mock `MediaRecorder`).
  When adding logic, prefer extracting a pure function (like `stripGeometry`) so
  it can be tested without a browser.
- **Browser-covered:** `tests/e2e/` runs against a production build with real
  canvas and deterministic fake camera input. It protects compact layout,
  capture-to-save, filters, Boom, Retake One, Settings persistence, and gallery
  identity. Extend this suite for user-facing journeys and pixel integration.
- **Still hardware-specific:** the real iPhone camera, Photos library, and
  native share sheet. Keep their adapters small and run `npm run ios:smoke`
  plus a personal-device spot-check when those native paths change.

## Asset pipeline

Everything in `public/` is **generated** from two source PNGs in `brand/` by
`scripts/gen-assets.mjs` (`npm run gen:assets`, uses `sharp`). It is **not** part
of `npm run build` — run it only when the brand art changes, then commit the
regenerated `public/` files. Output is 8-bit palette PNG to keep the offline
precache small.

## Notes

- `AGENTS.md` is a symlink to this file so Codex reads the same guidance.
- There is no separate formatter/lint debate: **Prettier owns formatting,
  ESLint owns correctness** (`eslint-config-prettier` keeps them from fighting).
