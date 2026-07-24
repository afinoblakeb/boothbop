# BopFX Device Evaluation Protocol

Status: Ready for owner testing  
Target device: Blerque, iPhone 15 Pro  
Branch: `codex/bopfx-living-portraits`

## Purpose

This is a short decision session, not a general regression pass. It resolves
the two remaining discovery questions:

1. Is Spin Cycle strong enough on real people to rank beside the face-aware
   candidates?
2. Is Living Strip compelling enough as a playback concept to justify wiring
   real shutter-adjacent motion capture?

The two questions have different evidence. Spin Cycle already runs in the live
Debug camera lab. Living Strip currently has a deterministic, device-playable
H.264 composition fixture, but its real camera motion collector is not wired
into the app. Passing the Living Strip direction review does not prove its
capture pipeline.

## Test Boundaries

- Use a Debug build from the branch and commit recorded above.
- Do not upload or submit this build.
- Do not treat Simulator Vision, segmentation, camera, or performance as
  physical-device evidence.
- Keep Original as the control. Any camera startup, countdown, freeze, capture,
  or navigation regression is a blocker regardless of the effect score.
- Keep personal photos and videos outside the public repository. Record only
  scores, timings, and non-identifying observations here.

## Test Scenes

Use these four scenes so the candidates are judged against the same stress:

| Scene | Setup                                          | What it exposes                                  |
| ----- | ---------------------------------------------- | ------------------------------------------------ |
| A     | One person, even indoor light, centered        | Basic legibility and preview/still agreement     |
| B     | One person, side light or ordinary low light   | Edge quality, instability, and processing delay  |
| C     | Two people, both visible                       | Group composition and accidental face favoritism |
| D     | Off-center face, profile, or moderate movement | Fallback behavior and intentionality             |

This is eight short four-shot sessions: four with Original as a control and
four with Spin Cycle. Stop immediately if the camera becomes black, the
countdown shortens, or the app crashes.

## Spin Cycle

For each scene:

1. Open Camera from a cold app launch for Scene A and normal navigation for the
   remaining scenes.
2. Capture one Original control strip.
3. Select Spin Cycle in the native Debug picker.
4. Watch the live preview for five seconds while moving the phone slightly.
5. Capture the normal four-shot sequence.
6. Confirm every shutter freeze matches the selected effect.
7. Open the resulting strip and compare framing, rotation, color, and shot
   order with the preview.
8. Navigate away and back once, then confirm the live camera returns.

Score each dimension from 0 to 2:

| Dimension                         | 0                            | 1                               | 2                                   |   Score |
| --------------------------------- | ---------------------------- | ------------------------------- | ----------------------------------- | ------: |
| Intent is immediately legible     | Looks broken                 | Understandable after inspection | Reads as deliberate at first glance |         |
| Portrait composition              | Subjects are clipped or lost | Some scenes work                | All four scenes remain readable     |         |
| Preview, freeze, and still parity | Visible disagreement         | Minor surprise                  | Same composition throughout         |         |
| Group and off-center behavior     | Fails                        | Inconsistent                    | Predictable without face analysis   |         |
| Camera responsiveness             | Noticeably regresses         | Small but tolerable cost        | Indistinguishable from Original     |         |
| Share impulse                     | Would not keep it            | Amusing once                    | Would deliberately share it         |         |
| **Total**                         |                              |                                 |                                     | **/12** |

Advance Spin Cycle when it scores at least 10/12 with no blocker. Keep it in
the lab at 7-9. Reject or redesign it at 0-6.

## Living Strip

### Direction Review

Open the generated `living-strip.mp4` on Blerque at normal size and full screen.
Watch at least five loops with sound muted. The fixture contract is:

- H.264;
- 720 x 2016 pixels;
- 30 FPS;
- 60 frames;
- two seconds;
- four independently animated panels;
- each panel begins nearest its exact simulated shutter timestamp.

Score each dimension from 0 to 2:

| Dimension               | 0                                  | 1                        | 2                                   |   Score |
| ----------------------- | ---------------------------------- | ------------------------ | ----------------------------------- | ------: |
| Concept comprehension   | Looks like a broken video          | Motion becomes clear     | "Living photo strip" is immediate   |         |
| Still-photo readability | Motion ruins the strip             | Some frames distract     | Portraits remain the focus          |         |
| Motion window           | Too abrupt or too long             | Usable                   | Feels naturally shutter-centered    |         |
| Loop seam               | Obvious hitch                      | Detectable on inspection | Feels continuous                    |         |
| Device playback         | Stalls, scales badly, or artifacts | Minor issue              | Clean at normal and full size       |         |
| Share impulse           | No reason to share                 | Interesting novelty      | Clearly more shareable than a still |         |
| **Total**               |                                    |                          |                                     | **/12** |

The direction advances at 10/12 or better. A passing score authorizes the next
capture spike; it does not authorize production.

### Capture Proof Still Required

Do not mark Living Strip technically validated until a later build proves all
of the following with real camera samples:

- each half-second window is anchored to its matching
  `AVCapturePhoto.timestamp`;
- post-roll collection continues while the visible preview is frozen;
- the full-quality still remains independent from the bounded motion clip;
- cancellation and stale session generations publish no clip;
- every shot is normalized, encoded, and released before the next retained
  clip causes unbounded memory growth;
- four real clips compose with correct orientation and selfie mirroring;
- motion capture does not shorten countdown or freeze/recovery timing.

## Automatic Blockers

Any one of these overrides a creative score:

- black or stale camera preview;
- crash, hang, or camera session exception;
- raw frame flashing through a filtered freeze;
- countdown, 600 ms freeze, or 50 ms recovery buffer shortened by processing;
- preview and saved still use different orientation, mirroring, tuning, or
  effect;
- Original mode becomes slower or less reliable;
- personal media leaves the device or is added to the public repository.

## Decision Record

| Candidate              | Score | Blocker        | Decision                  | Short observation |
| ---------------------- | ----: | -------------- | ------------------------- | ----------------- |
| Spin Cycle             |   /12 |                | Pending                   |                   |
| Living Strip direction |   /12 |                | Pending                   |                   |
| Living Strip capture   |   N/A | Not integrated | Pending engineering spike |                   |

After filling this table, copy the decisions into
`BOPFX_CANDIDATE_EVALUATION.md`. The discovery goal closes only when the final
ranking distinguishes creative approval from technical validation.
