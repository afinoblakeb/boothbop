# BoothBop 0.0.5 Reliability Audit

Date: 2026-07-22

## Purpose

This audit is the release ledger for build `0.0.5`. Reliability is the only
goal: no new user-facing capability is approved here. Apple upload remains
blocked until every release blocker is fixed, the complete automated gate is
green, and the owner accepts a signed iPhone build.

## Release Blockers

| ID          | Severity | Failure                                                                                                                           | Evidence                                                                   | Status                                                                                                                                 |
| ----------- | -------- | --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| CAM-01      | P0       | Rapid Settings/Camera transitions can leave a transparent web surface over a stopped native preview.                              | Deterministic native-bridge Playwright race.                               | Fixed in `03339b7`; lifecycle queue, request ownership, and visible-preview gate.                                                      |
| CAM-02      | P0       | Backgrounding or a native capture interruption can return to a dead preview.                                                      | Visibility transition and native notification tests.                       | Fixed in `fbd7e4d`; explicit stop/reopen reconciliation and recoverable interruption surface.                                          |
| CAM-03      | P1       | A stalled native stop or preview-position call can block later camera starts.                                                     | Fake-timer bridge tests.                                                   | Fixed in `f68d954`; bounded stop and positioning calls.                                                                                |
| CAM-04      | P1       | A capture exception can strand the state machine in `capturing`.                                                                  | Native capture rejection journey.                                          | Fixed in `fbd7e4d`; recoverable camera error and sequence ownership.                                                                   |
| CAM-05      | P1       | Native capture can wait forever or accept stale output callbacks.                                                                 | Swift source contracts and Release build/analyze.                          | Fixed in `fbd7e4d`; capture watchdog, output identity, preparation checks, and interruption observers.                                 |
| CAM-06      | P0       | Preview-layer connection creation can overlap `startRunning()` while session configuration is open.                               | Physical-device `NSGenericException`, source contract, build, and analyze. | Fixed in `9c30c46` and `8e06f84`; topology commits before start, preview attaches after start, and later positioning is geometry-only. |
| CAM-07      | P1       | Backgrounding or opening an overlay while native startup is pending can leave a camera under stale UI.                            | Deferred-start and simultaneous-overlay Playwright races.                  | Fixed in `370a871`; pending starts are cancellable, lifecycle work is serialized, and overlays are mutually exclusive.                 |
| CAM-08      | P1       | WebKit suspension can prevent JavaScript from stopping AVFoundation, while stale processing and file cleanup outlive the session. | Swift source contracts and Release build/analyze.                          | Fixed in `dd987a9`; UIKit-owned background teardown, interruption settlement, bounded processing, and explicit file ownership.         |
| CAM-09      | P1       | Delayed interruption or face-metadata callbacks from an old session can affect a newly opened preview.                            | Generation-filter unit and native source-contract tests.                   | Fixed in the final reliability pass; starts, events, and preview metadata share a monotonic session generation.                        |
| LAUNCH-01   | P1       | A transient splash bridge failure can permanently latch the launch cover.                                                         | Retry and startup-boundary tests.                                          | Fixed in `fbd7e4d` and `370a871`; bounded automatic retry plus error-boundary splash release.                                          |
| LAUNCH-02   | P1       | A React startup exception or legacy native service worker can leave stale or blank UI.                                            | Startup boundary and native cleanup tests.                                 | Fixed in `694fa9d` and `370a871`.                                                                                                      |
| LAUNCH-03   | P1       | Unavailable WKWebView preference storage can abort initial React rendering.                                                       | Storage-throwing native launch journey.                                    | Fixed in `f68d954`; launch preferences use guarded storage.                                                                            |
| LAUNCH-04   | P1       | Replacing the window root controller during startup emits unbalanced UIKit appearance transitions.                                | Physical-device console and native source contract.                        | Fixed in the final reliability pass; Bridge remains the stable root and the launch storyboard is a temporary overlay.                  |
| MEDIA-01    | P1       | A timed-out native video can continue while web fallback starts a second encoder.                                                 | Timeout/abort ordering tests.                                              | Fixed in `45f3da4`; cancel exact job before fallback and clear timers.                                                                 |
| MEDIA-02    | P1       | GIF cancellation or partial decode can leak `ImageBitmap` resources.                                                              | Partial-failure and abort ownership tests.                                 | Fixed in `38b5839`.                                                                                                                    |
| MEDIA-03    | P1       | Obsolete GIF/video work can cover another selected output or compete with camera startup.                                         | Rapid format-switch and Camera transition journey.                         | Fixed in `62ad9f5`; obsolete jobs are invalidated before format or camera transitions.                                                 |
| SHARE-01    | P1       | A stalled native share can permanently lock sharing and leak its cache file.                                                      | Native bridge timeout/retry tests.                                         | Fixed in `6e0a980` and `62ad9f5`; conversion, write, share, and cleanup are bounded.                                                   |
| VIDEO-01    | P1       | WebKit can omit `MediaRecorder.onstop`, leaving export pending forever; empty output can be accepted.                             | Stalled-recorder and zero-byte tests.                                      | Fixed in `9edd09f`; bounded shutdown, track cleanup, and nonempty-output validation.                                                   |
| GALLERY-01  | P1       | Gallery decode exceptions or IndexedDB aborts can leave operations pending forever.                                               | Decode-error and transaction-abort tests.                                  | Fixed in `8d48f5a`.                                                                                                                    |
| SETTINGS-01 | P1       | Older Photos-permission responses can overwrite newer autosave settings.                                                          | Reverse-resolution hook tests.                                             | Fixed in `4558347`.                                                                                                                    |
| FLAGS-01    | P1       | Expired emergency kill switches can fail open or fail to refresh after resume.                                                    | Offline expiry, persistence failure, monotonic revision, and resume tests. | Fixed in `6d1fb39`.                                                                                                                    |

## Confirmed Follow-Up Risks

These are remaining limitations to resolve or explicitly accept before release:

- Large native video payloads cross the Capacitor bridge as base64 and have a
  high transient-memory multiplier.
- Gallery session decoding is request-owned but not truly abortable.
- iOS simulators cannot execute BoothBop's `AVCaptureDevice` implementation;
  native camera lifecycle behavior is contract-tested and bridge-modeled, but
  final proof still requires a physical iPhone.
- Native launch smoke cannot assert a moving camera preview on a simulator. It
  does verify process survival, fresh/update launch, visual readiness, black
  frames, and fatal unified-log signatures.
- Playwright runs need per-run ports/output folders to prevent concurrent audit
  workers from colliding.

## Verification Record

- `npm run check`: 31 files and 206 tests passed; zero lint/type/format warnings.
- `npm run check:e2e`: all 32 production journeys passed.
- Release simulator build: passed with zero app warnings.
- Xcode Release static analysis: passed with zero app warnings.
- Native smoke: iPhone 17e, iPhone 17, iPhone 17 update install, and iPhone 17
  Pro Max all passed with zero black transition frames and no fatal app logs.
- The smoke harness now retains the launched PID, detects process death during
  readiness, and captures `NSGenericException`, `SIGABRT`, uncaught exception,
  `Fatal error`, and invalid `startRunning()` ordering signatures.
- A signed Release build was installed wirelessly on the paired iPhone 15 Pro.
  Two launches exercised the actual native-camera startup path; the app process
  remained alive and the second console sample was clean after removing the
  root-controller appearance-transition defect.

## Required Evidence

The candidate is not release-ready until all of the following are recorded:

1. `npm run check` passes with zero warnings.
2. `npm run check:e2e` passes every production journey.
3. `npm run ios:sync` succeeds.
4. Release simulator build and Xcode static analysis pass with zero warnings.
5. Native smoke covers fresh and update launch on compact, standard, and Pro
   Max simulators; deterministic bridge journeys cover Camera/Settings churn
   and background/foreground recovery.
6. A signed build installs and completes capture, Retake One, gallery reopen,
   GIF/video generation, and share on the owner's iPhone.
7. No App Store upload occurs until the owner explicitly approves that build.
