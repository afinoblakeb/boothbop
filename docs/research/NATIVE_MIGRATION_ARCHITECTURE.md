# BoothBop Native iOS Migration Architecture

Status: Proposed from BopFX discovery  
Date: July 23, 2026

## Decision

Move iOS to native Swift incrementally. Do not rewrite the whole application in
one branch, and do not continue adding camera or media complexity to React.

The native migration follows a strangler pattern:

1. Extract native capabilities from Capacitor plugin classes into independent
   Swift modules.
2. Build native feature surfaces directly on those modules.
3. Keep the existing React experience available as a fallback while each
   native surface proves parity.
4. Replace the iOS root shell only after capture, review, gallery, settings,
   save, and share are independently native and migration-tested.
5. Keep the web PWA as a separate product target; removing Capacitor from iOS
   does not require deleting the web application.

## Why This Direction

The current release proves that native adapters can recover camera quality and
reliability, but it also reveals the architectural tax:

- React owns the visible camera state while AVFoundation owns the real camera.
- JavaScript timers coordinate native shutter and freeze-frame state.
- UIKit camera content lives below a transparent `WKWebView`.
- Native controls embedded inside the preview cannot receive touches unless
  moved above the web view.
- Every lifecycle change crosses React, a TypeScript adapter, Capacitor,
  `CAPPlugin`, UIKit, and AVFoundation.
- Full-quality media repeatedly crosses the native/web boundary as files,
  blobs, canvases, or base64 payloads.

BopFX increases this pressure because Vision analysis, Metal rendering, and
full-resolution rerendering naturally share native buffers and queues. Keeping
the effect engine native while React owns capture sequencing would preserve the
most failure-prone boundary.

## Target Modules

The names are responsibilities, not a requirement to create seven packages
immediately.

| Module           | Owns                                                                                                                      | Must not own                                        |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| `CameraCore`     | Authorization, `AVCaptureSession`, focus/exposure, preview frames, photo capture, interruption, lifecycle generations     | UIKit navigation, effect selection, Capacitor calls |
| `EffectsCore`    | Effect descriptors, Vision analysis, landmark smoothing, person masks, Core Image/Metal render graphs, capability probing | Camera session lifecycle, gallery persistence       |
| `CaptureFeature` | Native preview surface, countdown, four-shot sequence, freeze/recovery timing, Retake One                                 | Full media export, permanent storage                |
| `MediaCore`      | Versioned captured-session model, still/motion masters, 2.5x7 strip composition, GIF/Boom/MP4 rendering                   | Screen presentation                                 |
| `LibraryCore`    | Session manifest and file storage, thumbnails, migration, deletion transactions                                           | Camera ownership                                    |
| `ShareCore`      | Photo/video file preparation, `UIActivityViewController`, destination-specific aspect presets                             | Rendering UI state                                  |
| `BoothBopUI`     | Design tokens and native controls shared by capture, review, gallery, settings                                            | AVFoundation or file I/O                            |

## Non-Negotiable Data Model

Native features exchange identifiers and file URLs, not encoded image payloads.

```swift
struct CapturedSession: Codable, Identifiable {
    let schemaVersion: Int
    let id: UUID
    let createdAt: Date
    let masters: [CapturedFrame]
    var selectedEffect: EffectSelection
    var stripStyle: StripStyle
}

struct CapturedFrame: Codable, Identifiable {
    let id: UUID
    let originalURL: URL
    let motionURL: URL?
    let pixelWidth: Int
    let pixelHeight: Int
    let orientation: Int
    let mirroredForDisplay: Bool
}
```

- Raw masters are immutable.
- A Living Strip motion clip is an optional immutable master paired with one
  still. Motion capture failure never invalidates the still.
- Effects and layout are non-destructive metadata.
- Preview thumbnails are disposable derived files.
- Final strip/GIF/video files are derived artifacts keyed by source and render
  settings.
- A schema version makes migration explicit before React storage is retired.

## Concurrency Contract

Native migration must preserve the proven queue ownership in
`docs/IOS_AGENT_CONTEXT.md`.

- `CameraSessionCoordinator` owns the serial AVFoundation session queue.
- Sample delivery remains a bounded serial queue with late frames discarded.
- Vision uses its own bounded queue and permits one analysis in flight.
- Full-resolution effects and media export use task-scoped worker queues with
  cancellation and autorelease pools.
- Living Strip preview samples are normalized to bounded 720px frames before
  retention; each window is anchored to the corresponding
  `AVCapturePhoto.timestamp` and encoded before the next compressed clip is
  published.
- UIKit and SwiftUI state mutations are `@MainActor`.
- A session generation travels through every callback and publication.
- Swift actors may coordinate higher-level jobs, but they must not hide
  `AVCaptureSession.startRunning()` on a cooperative executor. The blocking
  session work remains on its dedicated dispatch queue.

## Migration Milestones

### Extracted Foundation: `CameraCore` Timing

The discovery branch now contains a first framework-neutral Swift package at
`ios/CameraCore`. It owns no AVFoundation session, buffers, files, or UI. Its
first two responsibilities are:

- selecting a deterministic 15-frame output window around an exact shutter
  timestamp despite source-rate differences, jitter, drops, and duplicates;
- retaining generation- and capture-scoped timeline state until the exact
  `AVCapturePhoto.timestamp` resolves;
- decimating source samples to the 30 FPS target cadence before retention so a
  delayed photo callback remains bounded even when the camera emits 60 FPS.

The app target compiles the same source files directly during this transitional
stage. A Debug-only AVFoundation adapter preserves explicit collection,
completion, and terminal-failure outcomes. This is not Milestone 1 completion,
but it proves the extraction and native-test pattern before camera ownership
moves.

### Milestone 0: Native Effects Lab

Current branch.

- Keep the released React application unchanged.
- Render live effects from the existing native sample stream.
- Use a Debug-only native picker above the web view.
- Evaluate creative quality and native rendering feasibility on Blerque.

Exit proof:

- Multiple effects switch interactively on device.
- Original mode incurs no effect analysis.
- Camera startup, navigation, and teardown do not regress.

Rollback:

- Delete the lab files and bridge methods; no user data changes.

### Milestone 1: Extract `CameraCore`

Move session state and AVFoundation delegates out of `BoothBopCamera:
CAPPlugin` into a framework-neutral `CameraSessionCoordinator`.

The existing plugin becomes a thin adapter:

```text
TypeScript -> CAPPlugin adapter -> CameraSessionCoordinator
Native UI -----------------------> CameraSessionCoordinator
```

Exit proof:

- Existing React camera journeys still pass through the adapter.
- A native test host can start, preview, capture, and stop without Capacitor.
- Queue and generation tests target `CameraCore`, not source-string patterns.

Rollback:

- Keep the adapter API unchanged and restore the previous coordinator
  implementation.

### Milestone 2: Native `CaptureFeature`

Make the camera screen, countdown, shutter sequence, freeze frame, delay
selection, and Retake One native. Present it from the existing Capacitor root as
a child/full-screen view controller.

React receives only a completed `CapturedSession` identifier or cancellation.
It no longer schedules four native captures.

Exit proof:

- The entire four-shot sequence continues while WebKit is paused.
- Countdown duration, 600 ms freeze, and 50 ms recovery buffer are additive.
- Rapid Settings/Gallery navigation cannot race camera startup.
- VoiceOver and compact-device layouts pass.

Rollback:

- Feature flag routes Camera back to the current React screen.

### Milestone 3: Native Review And Effects

Build a native review surface over `CapturedSession` and `EffectsCore`.

- Preview raw masters with non-destructive effects.
- Retake one frame using `CaptureFeature`.
- Compose the full-resolution strip natively.
- Produce GIF/Boom/video from captured masters, never from the preview texture.

Exit proof:

- Preview and export geometry agree.
- Effect changes never rewrite raw masters.
- Existing sessions reopen after app termination.
- Output quality equals or exceeds the current release.

Rollback:

- React review can read the same versioned session manifest.

### Milestone 4: Native Library, Settings, Save, And Share

Replace IndexedDB ownership with `LibraryCore` and native file storage. Migrate
existing sessions once, transactionally, with a manifest recording success.

Use native Photos and share APIs directly from file URLs. Remove base64 media
transport from iOS.

Exit proof:

- Existing gallery data survives update, failed migration, and retry.
- Select/delete is transactional.
- Strip, GIF, Boom, Reel/Post, and Story sharing work without JIT UI stalls.

Rollback:

- Keep the original IndexedDB untouched until native migration is verified and
  explicitly finalized.

### Milestone 5: Native Root Application

Make native navigation the scene root. During the transition, mount the
Capacitor bridge only for any remaining legacy screen.

Exit proof:

- Cold launch reaches native Camera without waiting for WebKit.
- Native Camera, Review, Library, and Settings cover the full iOS surface.
- Fresh install and update-over-existing tests pass.
- No core user journey depends on a `WKWebView`.

Rollback:

- Scene configuration can still select the legacy bridge root in the
  immediately preceding release.

### Milestone 6: Remove Capacitor From The iOS Target

Delete the iOS bridge, plugin wrappers, copied web bundle, and JavaScript/native
camera adapter only after at least one public version has run with the native
root and migration telemetry/evidence is satisfactory.

The React PWA remains buildable and deployable as its own target.

## UI Technology

Use UIKit where camera and Metal view ownership require precise lifecycle
control. SwiftUI can compose ordinary gallery, settings, and review controls,
hosted from stable UIKit view controllers. Do not force the live camera into a
SwiftUI-only lifecycle abstraction.

The first native design-system layer should contain:

- color and typography tokens;
- icon-button and command-button styles;
- segmented controls and toggles;
- bottom toolbars and sheets;
- spacing, corner-radius, and motion tokens;
- accessibility labels and Dynamic Type rules.

This is enough to keep the future-retro direction coherent without building a
general-purpose component framework.

## Release Discipline

- Each public version still adds at most one user-facing capability.
- Architecture extraction may ship as behavior-neutral work.
- Every native surface stays behind an internal feature flag until parity
  evidence exists.
- Never upload an experimental lab build.
- Keep a known-good release tag before each migration milestone.
- App Store users must never be required to reinstall to complete migration.

## Next Recommended Engineering Step

After selecting the winning BopFX concept, extract the current
`BoothBopCamera` implementation into `CameraSessionCoordinator` before wiring
production effect controls. This creates one native camera authority that both
the temporary Capacitor adapter and the future native `CaptureFeature` can use.
It is the highest-leverage decoupling step and does not require a full rewrite.

Do not integrate Living Strip into the current Capacitor sequence first. Its
correct ownership belongs inside the extracted `CameraCore` and
`CaptureFeature`: sample ingestion, photo timestamps, capture generations,
post-roll completion, and cancellation are one native state machine. React
should eventually receive only the completed session identifier.
