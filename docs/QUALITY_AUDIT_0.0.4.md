# BoothBop 0.0.4 Quality Audit

Date: 2026-07-21

## Release Scope

This release adds one capability: social-ready sharing for GIF animations. The
primary GIF action prepares an H.264 MP4 for video-first destinations while a
secondary action preserves access to the original GIF. A one-time in-app notice
educates existing users about that same capability without notifications,
accounts, analytics, a backend, or a permission prompt.

## Behavioral Evidence

- Strip shares a PNG, GIF shares a social MP4, and Video shares its existing
  video output with explicit action labels.
- The social MP4 preserves frame order, selected Look, Boom sequence and speed,
  and the branding preference.
- The square composition is centered on a 1080x1920 canvas and remains wholly
  inside Instagram's centered 1080x1350 feed crop.
- MP4 generation is cached until an output-affecting choice changes.
- A generation failure remains visible and leaves Share Original GIF usable.
- The release notice appears once for `0.0.4`, dismisses accessibly, persists
  dismissal, and fails soft if local storage is unavailable.

## Media Evidence

The production browser journey opens the generated file and verifies:

- MIME type `video/mp4` and `.mp4` filename.
- ISO BMFF `ftyp` marker and H.264 `avc1` codec marker.
- No unexpected AAC audio track.
- 1080x1920 dimensions, cream top/bottom margins, visible center content, and a
  duration between 5 and 6 seconds.
- The original `.gif` remains separately shareable.
- A repeated share reuses the prepared result in under 1.5 seconds.

## Automated Evidence

- `npm run check`: typecheck, lint, formatting, and 102 unit tests pass with
  zero warnings.
- `npm run test:e2e`: 13 production-browser journeys pass, including capture,
  all output formats, real MP4 inspection, failure fallback, update notice,
  and compact/standard/large layouts.
- `npm run ios:smoke`: fresh uninstall/install/Release launch passes on iPhone
  17e, iPhone 17, and iPhone 17 Pro Max simulators. Pixel checks prove each
  device advances beyond launch UI to recognizable BoothBop content.
- Native screenshots at all three sizes show the release notice, primary CTA,
  and legal controls without overlap or horizontal overflow.

## Simulator Recovery

The first iPhone 17e attempt stalled in a CoreLocation runtime migration before
app installation. The disposable simulator was deleted and recreated, after
which the complete three-device matrix passed. This was simulator state, not an
app launch failure.

## Deliberately Held Back

There is no direct social-network SDK, account, upload, caption editor, hashtag
generator, vertical template, music, analytics, remote notification, or app-icon
badge. App-icon badges would add permission and lifecycle state for no durable
benefit here; the in-app badge-like notice is deterministic and private.

## Remaining Platform Boundary

Simulators and automated browser tests cannot complete a handoff into the
installed Instagram app. The exported contract is a 9:16 H.264 MP4 without
audio whose complete square composition fits inside the centered 4:5 feed crop.
App Review receives the same signed binary validated by this matrix.
