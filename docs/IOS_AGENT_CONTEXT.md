# BoothBop iOS Agent Context

## Purpose

Read this file before changing native iOS, camera, launch, lifecycle,
permissions, sharing, media export, or distribution behavior.

BoothBop is a React application inside a Capacitor iOS shell, with custom Swift
plugins for capabilities that WebKit cannot provide reliably. Reliability
depends on treating React, Capacitor, UIKit, and AVFoundation as one coordinated
system rather than independent layers.

This contract was written after resolving first-launch black screens, rapid-nav
camera failures, stale preview callbacks, and this physical-device crash:

```text
NSGenericException: AVCaptureSession startRunning may not be called between
calls to beginConfiguration and commitConfiguration
```

The detailed evidence is recorded in `docs/RELIABILITY_AUDIT_0.0.5.md`.

## Source Map

- `ios/App/App/AppDelegate.swift`: UIKit scene setup and custom native plugins.
- `src/App.tsx`: shared application and camera-flow orchestration.
- `src/lib/cameraNative.ts`: serialized TypeScript/native camera adapter.
- `src/lib/boothBopCameraPlugin.ts`: Capacitor camera contract.
- `src/lib/camera.ts`: WebKit camera fallback.
- `src/lib/cameraNativeSource.test.ts`: native source invariants.
- `src/lib/cameraNative.test.ts`: native bridge ownership and timeout tests.
- `test-support/mocks/nativeCamera.ts`: programmable native bridge model.
- `tests/e2e/capture.spec.ts`: camera and lifecycle journeys.
- `scripts/ios-smoke.mjs`: Release simulator build, launch, visual, and crash gate.

## Core Lifecycle Contract

There must be one ordered camera lifecycle across every layer.

1. Request authorization.
2. Build and commit the `AVCaptureSession` topology.
3. Call `startRunning()` on the dedicated serial session queue.
4. Attach the native preview on the main queue.
5. Wait for a real video frame.
6. Finish photo-output preparation and image-pipeline warmup.
7. Resolve native startup only when all readiness conditions are true.
8. Position the already-attached preview using geometry-only updates.
9. Capture, process, publish, and explicitly release temporary media.
10. Stop AVFoundation before detaching the UIKit preview.

Never allow `start`, `stop`, configuration, preview installation, capture, or
teardown to bypass the serialized lifecycle.

## Pending Is a State

A camera that is starting is neither stopped nor active. Track pending startup
explicitly.

Navigation, backgrounding, interruption, cancellation, and unmount must cancel
pending work as well as active work. A later request must wait for the previous
stop operation before beginning another native start.

Do not gate cancellation solely on React's visible phase. Native work may exist
while React still reports `idle`, `review`, or an overlay transition.

## AVFoundation Invariants

- All session topology changes occur between `beginConfiguration()` and
  `commitConfiguration()` on the serial session queue.
- `commitConfiguration()` must complete before `startRunning()`.
- `startRunning()` and `stopRunning()` never run on the main thread.
- Creating or assigning an `AVCaptureVideoPreviewLayer` can create a session
  connection. Never do it while configuration or `startRunning()` is in flight.
- Attach the preview once per session. Later frame updates change only geometry.
- Stop the session before setting `previewLayer.session = nil`.
- Camera readiness requires a running session, installed preview, real pixels,
  and prepared photo resources. `startRunning()` returning is not readiness.
- Treat `startRunning()` as blocking. JavaScript timeouts restore UI control but
  do not cancel an AVFoundation call already blocking its native queue.

## Session Generations

Every native camera session has a monotonically increasing generation ID.

The start result, interruption events, runtime-error events, preview ownership,
and face metadata must carry or validate that generation. Delayed work from
generation N must never stop, reject, or draw over generation N+1.

Apply generation checks both before expensive work and immediately before
publishing a result or mutating UI.

## Queue Ownership

- `sessionQueue`: session, outputs, pending calls, generation, and lifecycle.
- `sampleQueue`: latest preview pixel buffer and first-frame observation.
- `photoProcessingQueue`: JPEG decode, crop, scaling, encoding, and file work.
- `metadataQueue`: AVFoundation metadata delivery only.
- Main queue: UIKit views, preview layer, launch overlay, and face overlays.

Do not read a queue-owned mutable property from another queue. Capture immutable
session/device/generation values before crossing queues, then revalidate
ownership when returning.

Heavy image processing must not occupy the session or sample queue. Keep it
bounded, skip stale work before decoding, and use autorelease pools around
full-resolution operations.

## Native Resource Ownership

A temporary photo path returned to WebKit belongs to WebKit until it calls the
native `release` method.

- Session teardown may delete unpublished partial results.
- Session teardown must not delete a path already returned to WebKit.
- Every success and failure path must eventually release temporary media.
- A timeout must invalidate the exact operation before a fallback encoder or
  replacement operation starts.

## UIKit And App Lifecycle

UIKit owns safety when the app backgrounds. JavaScript `visibilitychange` is a
useful reconciliation signal, but WebKit may suspend before JavaScript executes.
The native plugin must therefore stop or invalidate camera resources when iOS
enters the background.

Keep one root view controller for the lifetime of a scene. BoothBop uses the
Capacitor Bridge controller as the stable root and places the launch storyboard
surface above it temporarily. Do not swap root controllers during appearance
transitions; that caused `Unbalanced calls to begin/end appearance transitions`.

Gallery and Settings are mutually exclusive overlays. Opening either while the
camera is starting must cancel or suspend that startup before mounting the
overlay.

## First Launch

First launch is a separate reliability scenario because it combines:

- TCC permission state.
- WebKit and Capacitor initialization.
- AVFoundation allocation.
- Photo-output preparation.
- Image decode/scaling warmup.
- Splash-screen ownership.
- Empty local storage and IndexedDB state.

Keep the launch surface visible until BoothBop can show either a real camera
surface or an actionable error. Splash hiding must be retryable and the React
startup error boundary must also release the native splash.

Warm expensive pipelines before the first shutter becomes available. Never
hide warmup latency by reducing the user's selected countdown interval.

## Warning And Crash Triage

Treat every app-owned warning as a defect.

Always attribute each console line:

- App-owned: BoothBop Swift/JavaScript errors, UIKit lifecycle warnings,
  uncaught exceptions, `Fatal error`, `SIGABRT`, plugin failures, or repeated
  WebView termination without successful recovery.
- Usually system-owned: isolated LaunchServices, CoreSimulator, Accessibility,
  WebContent, or CoreMedia diagnostics. Record the exact line and timing before
  classifying it; never dismiss a category wholesale.

The smoke crash predicate must include at least:

```text
NSGenericException
startRunning may not be called
Terminating app due to uncaught exception
Fatal error
abort() called
SIGABRT
```

## Required Verification Ladder

Native camera changes are not done after a successful Xcode build.

1. Add a failing deterministic reproduction before the fix.
2. Run `npm run check` with zero warnings.
3. Run `npm run check:e2e` across all production journeys.
4. Run `npm run ios:sync` so the native bundle contains current web code.
5. Build Release for iOS and run Xcode static analysis with zero app warnings.
6. Run `npm run ios:smoke` on compact, standard, and Pro Max simulators.
7. Cover fresh install and update-over-existing launch.
8. Install the signed Release build on the paired iPhone when native camera code
   changes.
9. Sample the physical-device console during cold camera startup.
10. Manually check cold launch, rapid Camera/Settings/My Photos navigation,
    background/foreground recovery, a four-photo capture, Retake One, gallery,
    GIF/video generation, and sharing before an App Store upload.

Simulator success does not prove `AVCaptureDevice` behavior. Simulators provide
valuable UIKit, WebKit, sizing, process-survival, and launch evidence, while the
physical iPhone is the final native-camera environment.

## Prohibited Shortcuts

- Do not call `startRunning()` from the main queue.
- Do not attach or replace a preview layer during session configuration.
- Do not make preview positioning recreate or reassign the session connection.
- Do not rely only on React phase to decide whether native work exists.
- Do not accept callbacks without request and generation ownership checks.
- Do not delete published temporary files during camera teardown.
- Do not perform full-resolution rendering on the session queue.
- Do not swap the scene's root view controller to hide launch latency.
- Do not call simulator-only testing sufficient for native camera changes.
- Do not upload to Apple until the owner explicitly accepts the installed build.

## Change Checklist

Before editing:

- Identify every queue and layer touched by the change.
- Define who owns cancellation, temporary files, callbacks, and UI visibility.
- Write the race or failure sequence in order, including pending states.
- Add a deterministic test capable of failing on the old implementation.

Before committing:

- Confirm stale callbacks cannot affect a newer session.
- Confirm backgrounding works while startup is pending.
- Confirm rapid overlay navigation cannot mount competing UI or strand camera
  work.
- Confirm countdown, freeze-frame, and recovery durations remain additive; do
  not steal preparation time from the user.
- Confirm Xcode and physical-device console output contains no app-owned noise.
- Record verification evidence in the current reliability or release document.
