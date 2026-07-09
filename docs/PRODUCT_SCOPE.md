# BoothBop Product Scope

BoothBop is a private, local-first consumer photo booth. The 0.1.0 objective is
to make capture, editing, and sharing feel complete before monetization returns.

## 0.1.0 Release Scope

- Four-shot booth with countdown, flash, front/back camera, mirror, cancel, and
  framing guidance.
- Retake and reorder individual shots without restarting the session.
- Persistent-preview editor: the output remains visible while controls change.
- Five layouts: classic 4x1, 2x2, 2x6, 4x6, and story.
- Distinct photo looks, themed props, captions, border colors, and 30 templates.
- Strip, GIF, ping-pong loop, and looping video output.
- Import existing photos, Save / Share, Save All, and Photos album integration.
- Private on-device gallery with reopen, favorite, rename, and delete.
- Standard and high-quality export choices.
- Offline operation with no account, server, upload, ads, tracking, or analytics.
- BoothBop branding on generated outputs.

All listed features are free in 0.1.0. There is no Party mode, operator mode,
print action, paywall, StoreKit product, or subscription in this release.

## Release Quality Contract

- `npm run check` has zero type, lint, format, or unit-test failures and warnings.
- Playwright covers compact, standard, and Pro Max phone widths plus the main
  demo capture, editor, export, and gallery journey.
- The native smoke matrix installs a Release build from scratch, launches it,
  rejects blank/black screenshots, checks BoothBop launch failures, and cleans
  up each simulator.
- A signed archive and exported IPA must validate before any upload.
- The candidate is manually installed on a physical iPhone before TestFlight or
  App Store Connect distribution.

## Deferred

- Monetization and all entitlement logic.
- Party, kiosk, event-operator, and passcode modes.
- AirPrint and print fulfillment.
- Accounts, cloud galleries, QR event rooms, email/SMS delivery, and cross-device
  sync.
- Android distribution.
- AI features that upload photos or substantially increase the binary size.
