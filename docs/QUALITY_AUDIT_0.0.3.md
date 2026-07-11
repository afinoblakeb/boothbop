# BoothBop 0.0.3 Quality Audit

Date: 2026-07-10

## Reviewed Surface

- Released `0.0.1 (0.0.2)` source at commit `465876d`.
- Capture state machine, media rendering, gallery persistence, review and
  Settings UI, native splash, custom Photos/video plugins, Xcode configuration,
  simulator harness, and distribution archive.
- Compact, standard, and large browser viewports with deterministic camera and
  demo media.

## Defects Fixed

- Replaced format-only media caching with explicit render choices and revision
  guards, preventing an old GIF/video from resurfacing after an edit or retake.
- Added atomic gallery session updates so Retake One changes one saved session
  instead of creating a duplicate.
- Preserved the original four frames when a single retake is cancelled or its
  camera fails.
- Added camera request tokens so late or repeated camera requests cannot leak a
  stream or reopen a cancelled flow.
- Hid gallery/settings actions during camera use and added an explicit Cancel.
- Removed the duplicate home-gallery action and compact horizontal overflow.
- Replaced the scrolling style drawer with a full-screen, Photos-style editor:
  a persistent output preview, Done action, real Look thumbnails, secondary
  control rail, and fixed Look / Layout / Colors toolbar.
- Consolidated Edit, Retake One, and Save / Share into a compact review toolbar
  so the output remains visible without scrolling on 320px-wide phone layouts.
- Made native splash ownership explicit: it remains visible until React has
  committed and painted, preventing the prior blank interval.
- Added deadlines to native video writer waits so a failed AVAssetWriter cannot
  leave a worker blocked forever.
- Hardened iOS smoke recognition so SpringBoard and the branded launch splash
  cannot pass as the BoothBop home screen.
- Removed the Xcode App Intents metadata warning by weak-linking the Apple
  framework the tool expects; the iOS 15 deployment target remains supported.

## Feature Evidence

- **Branding:** one persistent Settings toggle controls strip, GIF, web video,
  native video, and auto-save output. Branding defaults on; the strip keeps its
  date when branding is removed.
- **Looks:** Original, Warm, Cool, B&W, Sepia, and Inverse use deterministic CPU
  pixel recipes. The same renderer is used before branding in every output.
- **Boom:** GIF-only toggle renders `1,2,3,4,3,2`, without duplicated endpoints.
- **Retake One:** any frame can be selected, cancelled without loss, or replaced
  with one countdown and one capture while preserving the other frames.

## Automated Evidence

- `npm run check`: 8 test files, 73 tests, zero type/lint/format warnings.
- `npm run check:e2e`: 8 production-browser journeys, including a real
  four-capture fake-camera flow, successful Retake One, one gallery record,
  six distinct rendered looks, Boom, branding persistence, and 320/390/430px
  review/editor viewport assertions.
- Clean generic iOS Release build: succeeded with zero warnings.
- Unsigned distribution archive: succeeded and reports version/build `0.0.3`.
- CI installs Chromium and runs both unit and production-browser gates.

## Simulator Status

The corrected simulator gate is intentionally strict and currently reports a
local CoreSimulator failure on this Mac: iOS 26.5 `simctl launch` stalls inside
SpringBoard/CoreSimulatorBridge, and a fully erased 17e runtime stalls in the
CoreLocation migration. The harness no longer treats either timeout, the home
screen, or the launch splash as success. This is not counted as a passing app
test. The Release app builds and installs; Xcode or CoreSimulator must recover
before the matrix can produce valid post-splash evidence.

## Deliberately Held Back

No templates, stickers, props, captions, reorder tools, party mode, imports,
subscriptions, paywall, or general-purpose editor were included. Automatic
Photos saving remains opt-in; Retake One updates the private gallery but does
not create a second automatic Photos export that the app could not later
remove.
