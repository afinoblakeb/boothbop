# BoothBop 0.0.3 Quality Release

## Purpose

Build the smallest dependable release on top of the App Store-approved 0.0.2
baseline. This is a home project: confidence should come primarily from unit,
browser, pixel, clean-install, and multi-simulator checks. Physical-device use
is a final personal look, not a large manual test program.

## In Scope

1. **Branding toggle** — Settings can remove BoothBop branding from strips,
   GIFs, and videos. It is free in this release and remains the future paid-tier
   seam.
2. **Five distinct looks** — Warm, Cool, B&W, Sepia, and Inverse, plus the
   untouched Original. The selected look must match across previews and every
   export format.
3. **Boom GIF** — a toggle within GIF that plays frames forward and backward.
   Boom is not a separate export format.
4. **Retake One** — select any of the four frames, capture one replacement, and
   update the current gallery session without duplicating it.
5. **Quality fixes** — only defects found while validating these flows or the
   released core journey. No prototype feature dump.

## Non-goals

- Subscriptions, paywalls, accounts, cloud storage, or analytics.
- Stickers, props, advanced editing, templates, social feeds, or business tools.
- Large-scale physical-device, thermal, or performance-lab testing.
- Porting the prototype editor wholesale.

## Product Rules

- Save / Share remains the dominant action and reachable without fighting a
  sticky panel.
- Original is always available and every look is visibly different.
- A failed or cancelled single retake preserves the original four photos.
- A successful single retake changes exactly one frame and one gallery record.
- Stale encoders from an earlier revision may never replace current output.
- Branding defaults on for continuity; users may turn it off permanently.
- Boom changes GIF only. Strip and video remain unchanged.

## Release Gates

- `npm run check` is green with zero warnings.
- Automated browser journeys cover home, capture, all review controls, Retake
  One, gallery reopen, Settings, and narrow viewports.
- Pixel assertions prove each filter and branding state changes output as
  intended.
- Fresh installs launch to recognizable BoothBop UI on supported iPhone
  simulators, including the smallest and largest target sizes.
- Release build, Capacitor sync, Xcode archive, and repository hygiene pass.
- The candidate is committed, tagged, uploaded, and submitted to App Review.

## Distribution Record

- Source tag: `appstore-v0.0.3-build-0.0.3`
- Binary commit: `0e9497c50529e2de94e79fdb18319ff136689ccd`
- Version/build: `0.0.3 (0.0.3)`
- Delivery UUID / build ID: `55737bca-d3ca-49c6-a962-192da51accd6`
- App Store version ID: `e94d4b29-d4dd-4def-bb96-89257b91811b`
- Review submission ID: `fb8cfa63-d89b-454e-8ad3-166b776cc856`
- Submitted: `2026-07-11T04:39:47.707Z`
- Release behavior: automatic after approval (`AFTER_APPROVAL`)

## Submission Evidence

- `npm run check`: 9 files and 76 tests passed with zero warnings.
- `npm run check:e2e`: all 8 production-browser journeys passed.
- Strict Release cold-launch smoke passed on iPhone 17 Pro / iOS 26.5 and
  advanced beyond the native launch screen to recognizable BoothBop UI.
- The iPhone 17e CoreSimulator instance did not finish booting within 120
  seconds; this was a simulator infrastructure timeout before app install or
  launch. Compact behavior is covered at 320x568 in the browser matrix.
- Signed archive and App Store export succeeded with a cloud-managed Apple
  Distribution certificate and `get-task-allow = false`.
- Apple server-side IPA validation and upload completed with no errors.
- App Store Connect accepted build processing as `VALID`, copied all five
  screenshots, accepted the version metadata and review item, and moved the
  submission to `WAITING_FOR_REVIEW`.
