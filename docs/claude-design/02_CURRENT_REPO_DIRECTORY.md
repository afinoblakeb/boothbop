# BoothBop Current Repo Directory

This is a curated directory map for design work. It intentionally excludes most
generated files, caches, and dependency folders.

## Root

```text
.
|-- README.md
|-- ROADMAP.md
|-- CLAUDE.md
|-- AGENTS.md -> CLAUDE.md
|-- package.json
|-- vite.config.ts
|-- capacitor.config.ts
|-- index.html
|-- src/
|-- docs/
|-- ios/
|-- fastlane/
|-- public generated assets in dist/ after build
|-- brand/ source brand assets
`-- scripts/ asset generation scripts
```

## Source Tree

```text
src/
|-- App.tsx
|-- main.tsx
|-- index.css
|-- constants.ts
|-- types.ts
|-- vite-env.d.ts
|-- gifenc.d.ts
|-- icons.tsx
|-- components/
|   |-- InstallCard.tsx
|   |-- LegalFooter.tsx
|   |-- TopBar.tsx
|   `-- ZoomableImage.tsx
|-- screens/
|   |-- IdleScreen.tsx
|   |-- CameraScreen.tsx
|   |-- ReviewScreen.tsx
|   |-- GalleryScreen.tsx
|   |-- SettingsScreen.tsx
|   `-- MigrationScreen.tsx
|-- ui/
|   |-- Button.tsx
|   |-- Callout.tsx
|   |-- Heading.tsx
|   |-- IconButton.tsx
|   |-- OverlayScreen.tsx
|   |-- SectionLabel.tsx
|   |-- SegmentedControl.tsx
|   |-- Toggle.tsx
|   `-- index.ts
|-- hooks/
|   `-- useAutosave.ts
|-- lib/
|   |-- camera.ts
|   |-- demo.ts
|   |-- entitlements.ts
|   |-- gallery.ts
|   |-- gif.ts
|   |-- importPhotos.ts
|   |-- nativeShare.ts
|   |-- photosAlbum.ts
|   |-- platform.ts
|   |-- purchases.ts
|   |-- render.ts
|   |-- sequence.ts
|   |-- settings.ts
|   |-- storePlugin.ts
|   |-- strip.ts
|   |-- style.ts
|   |-- templates.ts
|   |-- video.ts
|   |-- videoNative.ts
|   `-- watermark.ts
|-- demo/
|   |-- set1-1.jpg ... set1-4.jpg
|   |-- set2-1.jpg ... set2-4.jpg
|   `-- set3-1.jpg ... set3-4.jpg
`-- test/
    `-- setup.ts
```

## Current Screens

```text
IdleScreen
  Home/start screen, demo shoot entry, import photos, My Photos, install/legal

CameraScreen
  Live camera preview, countdown, capture state, thumbnails, camera controls

ReviewScreen
  Output preview, Edit drawer, Save/Share, output tabs, filters, props,
  presets, layouts, colors, shot reorder, Save All, Take Again

GalleryScreen
  Local session gallery, favorites filter, styled covers, delete, open session

SettingsScreen
  Autosave settings, export quality, GIF/video speed, Pro/IAP controls,
  custom Pro caption, purchase/restore

MigrationScreen
  PhotoBlast migration guidance for the web/PWA path

TopBar
  Sticky brand/home, My Photos, Settings

ZoomableImage
  Inline image plus fullscreen zoom overlay
```

## Important Render/Data Files

```text
src/lib/strip.ts
  Layout geometry and strip composition.
  Current layouts: 4x1, 2x2, 2x6, 4x6, story.
  Current themes: classic, rust, teal, mustard, olive, carbon.

src/lib/render.ts
  Frame filters and sticker/prop drawing.
  Current filters: none, mono, warm, glam, vintage.
  Current stickers: none, sparkles, hearts, party.

src/lib/templates.ts
  Current style presets.
  Existing presets: Classic, Spark Grid, B&W Strip, Story Glam, Wedding 2x6,
  Retro 4x6.

src/lib/settings.ts
  Capture delay, capture sound, autosave settings, export quality, GIF/video
  speed, strip layout/theme persistence.

src/lib/gallery.ts
  IndexedDB session storage.

src/lib/demo.ts
  Demo photo sets used for App Store screenshots and simulator testing.
```

## Existing Docs To Read Before Designing

```text
docs/MINI_PHOTOBOOTH_COMPETITIVE_RESEARCH.md
  Feature parity matrix and catch-up roadmap versus Mini Photobooth.

docs/PRODUCT_SCOPE.md
  Current free/pro product boundaries.

docs/PLAN.md
  Product strategy and staged release plan.

docs/MONETIZATION.md
  Pro/IAP monetization assumptions.

docs/PRELAUNCH.md
  Launch quality checklist.
```

## Design-Relevant Constraints

- The app is currently a narrow `max-w-md` centered shell for phone-first use.
- Native iOS exists through Capacitor; avoid designs that require a backend.
- Keep camera, share, gallery, file, and native capability calls routed through
  `src/lib/`.
- Generated assets in `public/`/`dist/` should not be manually edited.
- Demo photos live in `src/demo/` and are bundled only through the demo loader.
- Tests run in jsdom, so real canvas pixels and camera behavior are verified
  manually, not with unit tests.
