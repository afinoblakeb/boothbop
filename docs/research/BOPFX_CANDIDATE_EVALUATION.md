# BopFX Candidate Evaluation

Status: Native discovery in progress  
Device: Blerque, iPhone 15 Pro, iOS 26.5.2  
Date: July 23, 2026

## Current Recommendation

Continue production discovery with **Spectral Echo** as the lead effect and
**Cutout Chorus** as the strongest alternate. Keep **Funhouse** as a playful
secondary direction while its face influence area is tuned. Reject
**Mirror Bloom** as a default consumer effect; its kaleidoscopic body geometry
is technically interesting but too unsettling and composition-dependent.

Treat **Tuning Frame** as a higher-priority interaction experiment than adding
another effect. It lets the user directly shape hue, saturation, and warmth on
the live camera frame and composes with every current or future effect.

Retain **Spin Cycle** as a provisional orientation-mashup candidate. Its
simulator output is clear and energetic, but it has not yet been evaluated on
Blerque. It intentionally uses no face analysis, so it is cheaper and more
predictable for groups than the first face-centered version.

None of these experiments is production-ready.

## Decision Classes

This ledger prevents an entertaining prototype from silently becoming release
scope:

| Class                      | Candidate                                      | Current evidence                                                       | Next decision                                               |
| -------------------------- | ---------------------------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------- |
| Lead production brief      | Spectral Echo                                  | Strong live device identity, face tracking, and full-resolution render | Harden only after discovery closes                          |
| Strong alternate           | Cutout Chorus                                  | Distinct device result and successful person matte                     | Measure and bound segmentation cost                         |
| Lab hold                   | Funhouse                                       | High delight but inconsistent influence radius across faces            | Tune against more face sizes and scenes                     |
| Pending device ranking     | Spin Cycle                                     | Deterministic simulator still/video only                               | Run the physical scorecard                                  |
| Architecture spike         | Living Strip                                   | Deterministic 2-second H.264 composition and tested timestamp model    | Judge direction, then decide whether to wire capture        |
| Interaction layer          | Tuning Frame                                   | Physical preview/still/freeze contract confirmed                       | Keep separate from effect ranking                           |
| Rejected default           | Mirror Bloom                                   | Technically valid but composition-dependent and often unflattering     | Retain only as a research reference                         |
| Device-limited future work | ARKit expression and TrueDepth spatial effects | Capability probes and architecture boundaries only                     | Do not pursue until a baseline effect earns production work |

The strongest recommendation remains Spectral Echo. Spin Cycle can displace a
secondary candidate, but it cannot become the lead without stronger device
evidence. Living Strip is evaluated as a media format, not scored as a spatial
effect.

## Ranked Effects

| Rank | Candidate     | Device result                                                                  | Recommendation                                                |
| ---: | ------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------- |
|    1 | Spectral Echo | Clear face tracking and a legible, animated chromatic identity                 | Advance to a focused production brief                         |
|    2 | Cutout Chorus | Strong visual separation; person matte worked in ordinary indoor lighting      | Retain as the bold alternate; optimize segmentation cost      |
|    3 | Funhouse      | Immediately playful, but sensitive to mask radius and transition softness      | Keep in lab until different face sizes look consistently good |
|    4 | Spin Cycle    | Simulator fixture gives a clear four-panel quarter-turn composition            | Evaluate on device before ranking against the face effects    |
|    5 | Mirror Bloom  | Distinct but often reads as body-horror geometry rather than a flattering look | Reject as a default; retain only as research reference        |

## Physical Device Evidence

The first deterministic full-resolution fixture on Blerque produced:

| Effect        | One debug run | Vision result |
| ------------- | ------------: | ------------- |
| Original      |         58 ms | No analysis   |
| Spectral Echo |        117 ms | One face      |
| Funhouse      |         26 ms | One face      |
| Cutout Chorus |        145 ms | Person mask   |
| Mirror Bloom  |         27 ms | One face      |

These are directional cold-path observations from an unoptimized Debug lab,
not shipping performance benchmarks. They prove that landmarks, segmentation,
Core Image, and Metal complete on the target device without replacing the
quality-first `AVCapturePhotoOutput` path.

Comparative live-device screenshots were reviewed and retained in the local
research archive. They contain personal imagery and are intentionally excluded
from BoothBop's public repository.

The simulator is useful for deterministic rendering, state, orientation, and
fallback tests. Its person-segmentation request failed despite explicit CPU
compute-device selection, while the same request succeeded on Blerque. The
simulator is therefore not evidence of segmentation availability or speed.

## Tuning Frame Experiment

The native Debug lab now places three direct-manipulation controls on the camera
frame:

- top horizontal edge: cool to warm;
- left vertical edge: hue rotation;
- right vertical edge: desaturated to saturated;
- neutral midpoint: haptic detent;
- double-tap any edge: reset that axis.

One immutable `BopFXTuning` value feeds the live Metal preview, the
full-resolution still renderer, and the shutter freeze. Color tuning runs
before the selected spatial effect. Dragging a color axis does not restart
Vision analysis.

At shutter time the camera now pins:

1. the selected effect;
2. hue, saturation, and warmth;
3. the phase of the last displayed effect frame.

`AVCapturePhotoOutput.capturePhoto` starts before any main-thread rendezvous or
image conversion. For a filtered frame, the already-visible Metal surface stops
accepting new samples and remains on screen for the gated 600 ms hold. It is not
replaced by a later CPU-generated image, so no raw frame can flash through. The
same effect, tuning, and phase are used to render the saved full-resolution
still. Original mode retains the current preview pixel buffer and converts that
buffer off the camera queues.

The first Blerque strip confirmed that combined hue/warmth tuning survives all
four full-resolution captures and final strip composition. The current ranges
can create deliberately extreme results; broader skin-tone and lighting checks
are still needed before deciding whether production controls should expose the
full lab range.

## Sequence

The lab can assign a different effect to each confirmed capture:

1. Spectral Echo
2. Funhouse
3. Cutout Chorus
4. Spin Cycle

The sequence advances only after AVFoundation confirms a successful photo.
Failed captures do not consume an effect. Spin replaced Mirror Bloom after the
orientation-mashup experiment proved more legible in deterministic output.
Before production, make effect order explicit non-destructive session metadata.

## Bounded Follow-Up Experiments

### Living Strip

Capture about 500 ms of native video around each shutter while preserving the
full-quality JPEG as the master. A practical first prototype should maintain a
small rolling preview-buffer window, keep roughly 250 ms before and after the
shutter, and compose four portable MP4 clips. Do not make Apple Live Photo
containers the primary artifact; they are awkward to composite and share.

The simulator-only composition fixture now produces a 720x2016, 30 FPS,
two-second H.264 MP4 at the 2.5x7 strip ratio. Four panels move independently.
The latest approximately 2.49 MB artifact contains 60 unique decoded frames.
The fixture now exercises the same pixel-buffer normalization, per-frame
effect, playback-plan, and writer path as the camera lab. It proves the
portable processing path, not physical camera delivery.

The real capture experiment must:

- anchor each window to `AVCapturePhoto.timestamp`, which shares the capture
  session clock with video presentation timestamps;
- choose approximately 250 ms before and after that exact timestamp;
- normalize accepted motion frames to a bounded 720px buffer at no more than
  30 FPS rather than retaining full camera buffers;
- encode and release each shot before retaining the next compressed clip;
- keep the existing full-quality JPEG completely independent;
- ingest post-roll frames even while the filtered preview surface is frozen;
- carry capture ID and session generation through collection, cancellation,
  encoding, and temporary-file publication.

The timing contract now lives in the native `ios/CameraCore` Swift package.
`LivingFrameWindowSelector` chooses 15 output targets across the exact
half-second window and requires at least 12 unique source frames. It rejects
compressed endpoint coverage and large central gaps. `LivingCaptureTimelineRecorder`
scopes samples to a capture ID and session generation, preserves a bounded
provisional window until `AVCapturePhoto.timestamp` arrives, accepts exact
timestamps when retained coverage supports them, and drops motion on clock
discontinuity.
Input is bucketed to the 30 FPS target cadence before retention, so a delayed
photo callback cannot overflow the active window when the camera delivers
60 FPS samples.

`BopFXLivingCaptureBuffer` is a Debug-only AVFoundation adapter over that model
and is now wired into the existing serialized native camera session. It never
retains camera-owned sample buffers: accepted frames are synchronously
center-cropped into a bounded app-owned 450x450 BGRA pool before the delegate
returns. It reports collection, completion, copy failure, and terminal timing
failures explicitly rather than collapsing them into a missing result.

The native suite currently covers 24, 30, and 60 FPS input, jitter, dropped and
duplicate samples, clock rollback, exact timestamp correction, delayed photo
callbacks including delayed 60 FPS delivery, stale generations, cancellation,
capture-ID isolation, and hard frame caps. Run it with
`npm run ios:camera-core:test`; `npm run ios:bopfx:fixture` runs strict Swift
formatting and the native suite before the visual/media fixture.

`LivingStripPlaybackPlan` is the next extracted seam. It accepts exactly four
capture descriptors carrying capture ID, session generation, exact shutter
time, and selected source timestamps. It rejects reordered or mixed-generation
clips, starts each panel on the frame nearest its exact shutter time, and builds
a seamless ping-pong index sequence for a two-second, 30 FPS output. Repeated
source timestamps remain valid because 24 FPS and dropped-frame inputs may map
one source frame to multiple 30 FPS targets.
`LivingStripAssemblyCoordinator` gives every retry a distinct attempt ID and
commits a panel only after both its full-resolution still transaction and its
motion render succeed. `BopFXLivingStripWriter` is attempt-cancellable, owns one
absolute encode deadline, and publishes only after all four committed panels
compose. Simulator execution of normalization, 60 per-frame effects, and H.264
composition currently takes about 7.05 seconds. That is acceptable for the
Debug discovery lab, not a production latency claim.

Living remains optional at every boundary. `AVCapturePhotoOutput.capturePhoto`
is invoked before the Debug collector can wait on its sample queue, the normal
still resolves without waiting for post-roll motion, an unresolved motion
window fails after 1.5 seconds, and each normalize/effect job fails after 30
seconds. Backgrounding cancels an active attempt even when the camera session
has already stopped for off-camera composition. After the fourth valid still,
the review transition remains immediate while native teardown waits only for
the remainder of the active motion deadline; an expired or cancelled attempt
never defers teardown.

### Rotating Frame

The first face-centered implementation was rejected because it caused
preview/still framing drift, poor group behavior, and unnecessary Vision work.
The retained Spin Cycle implementation center-crops the camera frame and uses
four discrete quarter turns. It replaces Mirror Bloom in Sequence rather than
expanding the intended release catalog.

The effect is intentionally an orientation shuffle, not smooth arbitrary
rotation. Deterministic still and four-second MP4 evidence pass
`npm run ios:bopfx:fixture`; physical-device evaluation remains open.

## Reliability Gaps Before Production

- Measure sustained preview cadence and dropped samples for each effect.
- Smooth landmark motion across frames without retaining stale geometry after
  a face disappears.
- Bound Cutout Chorus segmentation frequency independently of face landmarks.
- Verify multiple faces, partial faces, glasses, low light, and backlight.
- Compare preview, freeze, saved still, strip, GIF, and video orientation.
- Persist effects as non-destructive metadata over immutable original masters.
- Move the four-shot sequence and freeze state into native `CaptureFeature`
  before shipping effects; React must not remain the timing authority.
- Replace source-string native contracts with a proper native test target when
  `CameraCore` is extracted.

## Production Decision Gate

Do not start a public effect release until one candidate proves all of the
following:

- users can understand and select it without explanation;
- it flatters more faces than it breaks;
- preview, freeze, and export agree;
- Original mode retains current camera performance;
- a missing face or mask falls back without a visual flash;
- camera startup, rapid navigation, and teardown remain reliable;
- the feature fits one focused release brief.

The remaining physical evaluation follows
`BOPFX_DEVICE_EVALUATION_PROTOCOL.md`. Its numeric score informs the decision
but does not override an automatic reliability blocker.
