# BoothBop Roadmap

BoothBop is developed from the App Store release baseline, not from the June
feature prototype. The governing product decision is documented in
[docs/PRODUCT_RESET.md](docs/PRODUCT_RESET.md).

## Product Promise

Take four poses, receive a great classic photo strip, and save or share it
without setup or explanation.

Every release must improve that promise or leave it untouched. Feature count is
not a success metric.

## Current Production Baseline

- App Store candidate version: `0.0.4`
- Public App Store version: `0.0.3`
- Public App Store build: `0.0.3`
- Public release commit: `0e9497c`
- Public release tag: `appstore-v0.0.3-build-0.0.3`
- Version `0.0.4` review state: `DEVELOPER_REJECTED`, editable for replacement
- Replaced build: `0.0.4` at `b287baf`
- Replaced build tag: `appstore-v0.0.4-build-0.0.4`
- Replaced build branch: `codex/0.0.4-social-sharing`
- Active candidate branch: `codex/0.0.4-build-0.0.5-media-quality`

The previous feature work remains preserved on `codex/0.1.0` and
`codex/prototype-june-2026`. Those branches are research and implementation
references. They must never be merged wholesale into the release line.

## Completed: 0.0.3 Quality Foundation

The owner approved one explicit exception to the one-feature cadence: four
small, proven capabilities form the initial creative foundation. This was not
a return to the prototype feature bundle. The release required:

1. Prove a fresh native install advances beyond the launch screen.
2. Add an automated capture-to-review-to-save journey.
3. Eliminate horizontal overflow at 320x568 and larger phone sizes.
4. Remove redundant navigation and keep the primary booth action dominant.
5. Add only the free branding toggle, five distinct looks, GIF Boom toggle,
   and Retake One defined in `docs/QUALITY_RELEASE_0.0.3.md`.
6. Build, archive, and pass a compact-to-Pro-Max simulator matrix.

The release shipped as `0.0.3 (0.0.3)`. Its implementation and distribution
evidence is recorded in `docs/QUALITY_RELEASE_0.0.3.md`.

## Replaced Candidate: 0.0.4 Social-Ready Sharing

Candidate `0.0.4 (0.0.4)` adds one capability: GIF animations share as a
social-compatible H.264 MP4 while the original GIF remains available. Its
review submission was canceled so quality-corrected build `0.0.5` can replace
it. See `docs/features/0.0.4-social-sharing.md` and
`docs/QUALITY_AUDIT_0.0.4.md`.

## Submission Candidate: 0.0.4 Build 0.0.5

Build `0.0.5` is a replacement binary for App Store version `0.0.4`, not a new
feature release. Its scope is media quality, responsiveness, and lifecycle
correctness:

1. Make best-supported capture and export quality automatic; expose no output
   quality selector.
2. Keep screen previews bounded while full-quality exports retain source
   detail.
3. Preserve lossless gallery masters and load full sessions only when opened.
4. Move GIF processing off the UI thread and deduplicate, prewarm, cancel, and
   invalidate render jobs safely.
5. Improve native video frame fidelity, H.264 configuration, progress, and
   failure cleanup.
6. Prefer a full-resolution native iPhone camera with WebKit fallback, launch
   directly into capture, and retain camera access to My Photos and Settings.
7. Apply the future-retro design system, exact 2x6 classic geometry with square
   photos, and Select-then-Delete gallery interaction as quality corrections.
8. Re-run production-browser and simulator matrices, then archive and validate.

All 219 unit tests and 37 production-browser journeys pass. The
compact/standard/Pro-Max simulator matrix passes fresh launch, with the
standard-device overwrite update also passing. Apple validated the signed
`0.0.4 (0.0.5)` archive with no errors. Fifteen official-Simulator screenshots
are current in App Store Connect. See
`docs/features/0.0.4-build-0.0.5-media-quality.md` for exact evidence.

After this quality-only replacement, the one-feature monthly cadence resumes.

## Release Cadence

Each cycle contains one user problem and at most one new user-facing capability:

1. Problem evidence and a written feature brief.
2. A disposable interaction prototype.
3. Implementation with unit and end-to-end coverage.
4. Accessibility, compact-device, offline, and failure-state review.
5. Simulator-first release evaluation, with a personal device spot-check when
   practical or when hardware-specific behavior is added.
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
