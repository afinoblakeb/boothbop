# BoothBop Roadmap

BoothBop is developed from the App Store release baseline, not from the June
feature prototype. The governing product decision is documented in
[docs/PRODUCT_RESET.md](docs/PRODUCT_RESET.md).

## Product Promise

Take four poses, receive a great classic photo strip, and save or share it
without setup or explanation.

Every release must improve that promise or leave it untouched. Feature count is
not a success metric.

## Current Baseline

- App Store version: `0.0.1`
- App Store build: `0.0.2`
- Git commit: `465876d`
- Release tag: `appstore-v0.0.1-build-0.0.2`
- Development branch: `codex/product-reset`

The previous feature work remains preserved on `codex/0.1.0` and
`codex/prototype-june-2026`. Those branches are research and implementation
references. They must never be merged wholesale into the release line.

## Next Release: 0.0.3 Quality Baseline

No new user-facing feature is planned for 0.0.3. It must:

1. Prove a fresh native install advances beyond the launch screen.
2. Add an automated capture-to-review-to-save journey.
3. Eliminate horizontal overflow at 320x568 and larger phone sizes.
4. Remove redundant navigation and keep the primary booth action dominant.
5. Verify the release on physical iPhone hardware and a small TestFlight group.

Only after 0.0.3 is accepted do we select one feature for the following month.

## Release Cadence

Each cycle contains one user problem and at most one new user-facing capability:

1. Problem evidence and a written feature brief.
2. A disposable interaction prototype.
3. Implementation with unit and end-to-end coverage.
4. Accessibility, compact-device, offline, and failure-state review.
5. Physical-device and TestFlight evaluation.
6. Ship, revise, or hold. A calendar deadline never overrides quality.

Use [docs/FEATURE_BRIEF_TEMPLATE.md](docs/FEATURE_BRIEF_TEMPLATE.md) before
starting feature code.

## Explicitly Unscheduled

- Subscription or in-app purchase.
- Party, operator, kiosk, or passcode modes.
- A large template, filter, or prop catalog.
- A general-purpose photo editor.
- Printing, cloud galleries, QR rooms, accounts, or remote delivery.
- Upload-based AI features.
- Android distribution.

These may be reconsidered when user evidence supports them. Existing prototype
code does not create a commitment to ship them.
