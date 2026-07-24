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

None of these experiments is production-ready.

## Ranked Effects

| Rank | Candidate     | Device result                                                                  | Recommendation                                                |
| ---: | ------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------- |
|    1 | Spectral Echo | Clear face tracking and a legible, animated chromatic identity                 | Advance to a focused production brief                         |
|    2 | Cutout Chorus | Strong visual separation; person matte worked in ordinary indoor lighting      | Retain as the bold alternate; optimize segmentation cost      |
|    3 | Funhouse      | Immediately playful, but sensitive to mask radius and transition softness      | Keep in lab until different face sizes look consistently good |
|    4 | Mirror Bloom  | Distinct but often reads as body-horror geometry rather than a flattering look | Reject as a default; retain only as research reference        |

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
4. Mirror Bloom

The sequence advances only after AVFoundation confirms a successful photo.
Failed captures do not consume an effect. Before production, replace Mirror
Bloom with a stronger fourth candidate and make effect order an explicit
non-destructive session setting.

## Bounded Follow-Up Experiments

### Living Strip

Capture about 500 ms of native video around each shutter while preserving the
full-quality JPEG as the master. A practical first prototype should maintain a
small rolling preview-buffer window, keep roughly 250 ms before and after the
shutter, and compose four portable MP4 clips. Do not make Apple Live Photo
containers the primary artifact; they are awkward to composite and share.

### Rotating Frame

Build a face-centered orientation mashup only after Tuning Frame is evaluated.
A four-panel quarter-turn composition is more legible than applying arbitrary
rotation to the whole live preview. It should replace Mirror Bloom in the lab,
not expand the catalog indefinitely.

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
