# Roadmap

## Current: consumer iOS and PWA

BoothBop is a React/Vite photo-booth app distributed as both an installable PWA
and an iOS app through a thin Capacitor shell. The web app remains the source of
truth; the native project bundles the production build and adds native media,
Photos, sharing, and camera integration.

## 0.1.0: complete the consumer loop

The immediate release is free and consumer-only:

1. Capture or import four photos.
2. Retake and reorder individual shots.
3. Edit against a persistent preview using layouts, looks, props, captions,
   colors, and templates.
4. Export a strip, GIF, ping-pong loop, or video.
5. Save, share, reopen, favorite, rename, and delete local sessions.

Release gates are browser unit tests, multi-viewport Playwright journeys,
fresh-install native simulator smoke tests, a signed archive, and a physical
iPhone review. See [docs/PRODUCT_SCOPE.md](docs/PRODUCT_SCOPE.md) and
[docs/RELEASE.md](docs/RELEASE.md).

## After 0.1.0

- Collect consumer feedback on capture completion, editing comprehension, and
  sharing behavior.
- Improve accessibility and add regression coverage for permission-denied and
  storage-failure states.
- Expand high-quality creative templates and text/prop tools.
- Automate App Store screenshots from deterministic demo sessions.
- Revisit monetization only after there is a tested, defensible paid-value
  contract; see [docs/MONETIZATION.md](docs/MONETIZATION.md).

## Architecture rules

1. Keep platform capabilities behind `src/lib/` modules or native Capacitor
   plugins, not inside screens.
2. Feature-detect behavior instead of relying on user-agent strings.
3. Keep assets base-path-relative and bundled for offline use.
4. Keep screens presentational and React-free logic unit-testable.
5. Never weaken capture readiness, permission-loss, or black-frame protection.

## Explicitly deferred

Subscriptions, Party/operator mode, printing, accounts, cloud galleries, QR
event rooms, remote delivery, Android distribution, and upload-based AI tools.
