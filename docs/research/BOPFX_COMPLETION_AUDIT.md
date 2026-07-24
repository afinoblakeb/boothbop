# BopFX Discovery Completion Audit

Status: Physical decision session pending  
Branch: `codex/bopfx-living-portraits`  
Audit date: July 24, 2026

## Completion Standard

The discovery goal is complete only when every required outcome has direct
evidence. Simulator output, source inspection, and passing tests do not replace
physical-camera evidence. A preliminary ranking does not replace the final
ranking after Spin Cycle and Living Strip are exercised on Blerque.

## Requirement Audit

| Requirement                                | Status                           | Authoritative evidence                                                                                                                                                                                                             | Remaining proof                                                                                                             |
| ------------------------------------------ | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Native capability matrix                   | Complete                         | `BOPFX_NATIVE_CAPABILITY_MATRIX.md`; runtime probes in `BopFXNativeSupport`; local iOS SDK compilation                                                                                                                             | None for discovery scope                                                                                                    |
| Multiple native Swift MVPs                 | Complete                         | `BopFXRenderer.swift`, `BopFXLabPicker.swift`, Tuning Frame, Sequence, Spin Cycle, Living collector, deterministic fixture artifacts                                                                                               | Production hardening is explicitly out of scope                                                                             |
| Blerque installation and hands-on evidence | Partial                          | Initial face effects and Tuning Frame were installed and observed on Blerque; timings and non-identifying observations are recorded in `BOPFX_CANDIDATE_EVALUATION.md`                                                             | Install the current commit and evaluate Spin Cycle plus real Living capture, retry, cancellation, playback, and reliability |
| Final ranked recommendation                | Partial                          | Preliminary ranking identifies Spectral Echo as lead, Cutout Chorus as alternate, Funhouse as lab hold, and Mirror Bloom as rejected default                                                                                       | Score Spin Cycle and Living Strip, then record the final ranking and technical disposition                                  |
| Incremental native migration architecture  | Complete                         | `NATIVE_MIGRATION_ARCHITECTURE.md` defines data, concurrency, module, milestone, rollback, and release boundaries                                                                                                                  | None for discovery scope                                                                                                    |
| Focused tests and build verification       | Complete for current local state | 268 repository tests, 42 CameraCore Swift tests, 37 production browser journeys, Debug/Release simulator builds, Debug static analysis, multi-device iOS smoke, deterministic BopFX fixture, and unsigned arm64 iPhone compilation | Run the signed Debug build and physical console gate during the final Blerque session                                       |

Overall status: **not complete**. Requirements three and four still contain
physical evidence gaps.

## Capability Evidence

The capability matrix covers:

- AVFoundation full-quality still capture and bounded sample delivery;
- Vision face landmarks and person segmentation;
- Metal-backed Core Image and the boundary for custom Metal kernels;
- ARKit face mesh, blend shapes, eye transforms, and gaze;
- TrueDepth live depth and photo-depth delivery;
- broad baseline, Neural Engine, TrueDepth, current Pro, and simulator classes;
- runtime checks, fallback behavior, orientation, quality, queueing, memory, and
  performance constraints.

The current MVPs deliberately use the broad baseline. ARKit and TrueDepth are
capability probes and future enhanced modes, not hidden dependencies of the
main camera. Shipping code does not gate behavior by an iPhone model-name list.

## Native Lab Evidence

The native lab contains visibly distinct implementations:

- Spectral Echo: landmark-aligned chromatic repetitions;
- Funhouse: landmark-centered localized displacement;
- Cutout Chorus: person-segmented repeated silhouettes;
- Mirror Bloom: face-centered kaleidoscopic geometry;
- Spin Cycle: deterministic center-framed quarter-turn panels;
- Tuning Frame: live hue, saturation, and warmth interaction;
- Sequence: one confirmed effect per captured frame;
- Living Strip: four shutter-centered motion windows paired with independent
  full-quality stills.

The deterministic fixture exercises native Vision/Core Image/Metal rendering,
still and animated outputs, and the real Living normalize/effect/playback/writer
path. Its current Living output passes the offline contract:

- H.264;
- 720x2016;
- 30 FPS;
- 60 decoded frames;
- 60 unique decoded frames in the deterministic fixture;
- 2.000 seconds.

This is processing evidence, not physical-camera evidence.

## Existing Physical Evidence

The prior Blerque session proved:

- Spectral Echo face landmarks and full-resolution output;
- Funhouse localized face deformation;
- Cutout Chorus person segmentation in ordinary indoor light;
- Mirror Bloom rendering;
- Tuning Frame agreement across preview, freeze, saved still, and strip.

Directional Debug still-render observations are already recorded:

| Effect        | Observed duration |
| ------------- | ----------------: |
| Original      |             58 ms |
| Spectral Echo |            117 ms |
| Funhouse      |             26 ms |
| Cutout Chorus |            145 ms |
| Mirror Bloom  |             27 ms |

Personal screenshots remain in the local private research archive and must not
enter the public repository.

## Remaining Physical Gate

The exact scorecard and blockers live in
`BOPFX_DEVICE_EVALUATION_PROTOCOL.md`. Completion still requires:

1. Spin Cycle across centered, low-light, group, and off-center scenes.
2. Preview, filtered freeze, saved still, and strip parity.
3. A real four-shot Living attempt with an unchanged countdown and 600 ms
   freeze timing.
4. Living playback orientation, mirroring, loop quality, and share impulse.
5. A successful Living retry with no stale frames.
6. Background cancellation without damaging the normal still strip.
7. A clean BoothBop device log with no crash or camera-session blocker.
8. Private artifact collection and a passing offline technical report.
9. Final score and recommendation updates in
   `BOPFX_CANDIDATE_EVALUATION.md`.

## Reproducible Resume Sequence

The owner explicitly deferred phone installation for the night of this audit.
When physical testing resumes:

```bash
npm run ios:bopfx:device -- status
npm run ios:bopfx:device -- prepare
```

Start logging in one terminal:

```bash
npm run ios:bopfx:device -- logs
```

Launch explicitly in another:

```bash
npm run ios:bopfx:device -- launch
```

Collect each successful Living artifact before replacing or cancelling its
attempt:

```bash
npm run ios:bopfx:device -- collect
```

After stopping the log stream:

```bash
npm run ios:bopfx:device -- report
```

The harness stores personal media and logs only under gitignored
`ios/DerivedData/bopfx-device`. It records the branch, commit, worktree state,
device class, and OS version without committing hardware identifiers.

## Scope Audit

| Boundary                                 | Evidence                                                                           |
| ---------------------------------------- | ---------------------------------------------------------------------------------- |
| No App Store submission or release       | No distribution command is part of the lab workflow                                |
| No production-readiness claim            | Every research document labels the effects experimental                            |
| No complete gallery/export/paywall scope | The lab is limited to capture, render, playback, and evidence                      |
| ARKit is not the primary camera          | The active path remains the existing AVFoundation session                          |
| Processing remains on-device             | No backend, upload, recognition, or cloud dependency was added                     |
| No identity recognition or embeddings    | Vision usage is detection, landmarks, and segmentation only                        |
| Camera/lifecycle invariants preserved    | Session ownership, generations, queues, cancellation, and teardown remain explicit |
| Native Swift owns analysis/rendering     | React exposes only a temporary bridge and does not implement the effect pipeline   |

## Closure Rule

Do not mark the discovery goal complete from this audit alone. Close it only
after the Blerque protocol is executed, private evidence is collected, the
automatic report is reviewed, and the final recommendation is committed.
