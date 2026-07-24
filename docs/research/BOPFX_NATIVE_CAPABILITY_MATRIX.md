# BopFX Native Capability Matrix

Status: Discovery baseline  
Validated against: Xcode/iOS SDK available July 23, 2026  
Deployment target: iOS 15.0

## Decision

Use the existing `AVCaptureSession` as the camera authority and layer effects in
three capability tiers:

1. **Baseline:** AVFoundation + Vision + Core Image on Metal.
2. **Expression enhancement:** a separately evaluated ARKit face-tracking mode.
3. **Depth enhancement:** a separately configured TrueDepth capture mode.

The production baseline must not depend on ARKit, TrueDepth, Face ID, a device
name, or a Neural Engine. Runtime APIs decide which enhancements appear.

## Framework Matrix

| Capability              | Apple API                                              | Minimum useful tier                       | Runtime proof                                                           | BoothBop use                                                                  | Important boundary                                                                                                   |
| ----------------------- | ------------------------------------------------------ | ----------------------------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Live camera pixels      | `AVCaptureVideoDataOutput`                             | All supported iPhones                     | Session can add output and receives a real pixel buffer                 | Feed the native renderer while retaining `AVCapturePhotoOutput`               | Pixel-buffer preview must be oriented, mirrored, and aspect-filled independently of photo capture                    |
| Full-quality still      | `AVCapturePhotoOutput`                                 | All supported iPhones                     | JPEG codec and prepared photo settings succeed                          | Preserve the current quality-first capture path                               | Never derive final output from the lower-resolution preview buffer                                                   |
| GPU image graph         | `CIContext(mtlDevice:)` + `MTKView`                    | All supported iPhones with a Metal device | `MTLCreateSystemDefaultDevice() != nil`                                 | Color, compositing, masks, built-in warps, full-resolution rerender           | Reuse one `CIContext`; creating contexts repeatedly is expensive                                                     |
| Custom shader           | Metal compute/render kernel                            | All supported iPhones with a Metal device | Required GPU family/features checked on `MTLDevice`                     | Bespoke displacement, trails, feedback, and transition effects                | Add only when Core Image cannot express the desired look; custom kernels increase implementation and validation cost |
| 2D face geometry        | `VNDetectFaceLandmarksRequest`                         | Baseline                                  | Request performs successfully and returns observations                  | Face bounds, eyes, brows, lips, contour, roll/yaw/pitch-dependent composition | Geometry is 2D and sampled, not Face ID identity or a stable 3D face model                                           |
| Person matte            | `VNGeneratePersonSegmentationRequest`                  | Baseline on iOS 15+                       | Request reports a supported output format and produces a mask           | Subject cutouts, background replacement, silhouette repetitions               | Live segmentation is materially more expensive than landmarks; use balanced/fast preview and accurate still          |
| 3D face mesh            | `ARFaceAnchor.geometry`                                | Expression enhancement                    | `ARFaceTrackingConfiguration.isSupported`                               | Geometry-conforming masks, sculptural displacement, occlusion                 | ARKit owns an AR camera session; it is not a drop-in request inside the existing capture session                     |
| Expressions             | `ARFaceAnchor.blendShapes`                             | Expression enhancement                    | `ARFaceTrackingConfiguration.isSupported`                               | Blink, smile, jaw, brow, cheek, and gaze-driven animation                     | Face-tracking data requires privacy-policy disclosure and a distinct mode architecture                               |
| Gaze and eye transforms | `leftEyeTransform`, `rightEyeTransform`, `lookAtPoint` | Expression enhancement                    | AR face tracking supported and a face anchor is active                  | Eye-directed trails or responsive art                                         | Not available from ordinary Vision landmarks                                                                         |
| Real-time depth         | `AVCaptureDepthDataOutput`                             | TrueDepth enhancement                     | Front camera exists and selected format exposes supported depth formats | Depth contours, foreground slicing, spatial extrusion                         | Simulator cannot validate it; RGB/depth synchronization and smoothing are required                                   |
| Photo depth             | `AVCapturePhotoOutput.isDepthDataDeliverySupported`    | TrueDepth enhancement                     | Check after the session has been configured                             | Higher-quality depth-aware still rendering                                    | Must be enabled before `startRunning`; changing it live causes lengthy reconfiguration and preview freezing          |

## iPhone Support Classes

These classes are guidance for product decisions, not implementation gates.
Shipping code must use the runtime proof in the matrix.

| Device class                                      | Examples                                                                | Baseline Vision/Core Image/Metal                            | ARKit face mesh and blend shapes                                                                            | TrueDepth depth                                                       |
| ------------------------------------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Pre-Neural-Engine devices still capable of iOS 15 | iPhone 6s, 6s Plus, 7, first-generation SE                              | Yes, with conservative analysis frequency                   | Do not assume; hide when `ARFaceTrackingConfiguration.isSupported == false`                                 | No                                                                    |
| Neural Engine without TrueDepth                   | iPhone 8/8 Plus and later Touch ID models such as iPhone SE generations | Yes                                                         | Apple documents face tracking on Neural Engine devices beginning with iOS 14; still gate with `isSupported` | No                                                                    |
| Neural Engine with TrueDepth                      | iPhone X and later Face ID-equipped iPhones                             | Yes                                                         | Yes when runtime-supported                                                                                  | Usually available, but confirm the selected capture format and output |
| Current high-performance Pro devices              | Blerque, iPhone 15 Pro                                                  | Yes, best expected preview headroom                         | Yes                                                                                                         | Yes                                                                   |
| Simulator                                         | Simulated iPhones                                                       | UI, state, fallback, and deterministic fixture testing only | No trustworthy camera evidence                                                                              | No                                                                    |

Do not maintain a hard-coded list such as “iPhone X or newer.” It mishandles
Touch ID models with Neural Engines, future devices, camera-format constraints,
and simulator behavior.

## Candidate Requirements

| Candidate                       |         Landmarks | Person matte | ARKit | Depth | Expected support                        |
| ------------------------------- | ----------------: | -----------: | ----: | ----: | --------------------------------------- |
| Spectral Echo                   |               Yes |           No |    No |    No | Baseline                                |
| Funhouse                        |               Yes |           No |    No |    No | Baseline                                |
| Cutout Chorus                   |                No |          Yes |    No |    No | Baseline, with the highest preview cost |
| Mirror Bloom                    |               Yes |           No |    No |    No | Baseline                                |
| Spin Cycle                      |                No |           No |    No |    No | Baseline Metal/Core Image               |
| Tuning Frame color stage        |                No |           No |    No |    No | Baseline Metal/Core Image               |
| Living Strip motion capture     |                No |           No |    No |    No | Baseline AVFoundation                   |
| Expression-driven future effect | Optional fallback |           No |   Yes |    No | Enhanced devices only                   |
| Spatial depth future effect     | Optional fallback |     Optional |    No |   Yes | TrueDepth devices only                  |

All current MVP candidates deliberately fit the broad baseline. That lets
the discovery compare creative merit without confusing it with hardware
availability. ARKit and depth should be separate experiments only if the
baseline candidates fail to feel differentiated enough.

Tuning Frame is not a fifth effect. It is a bounded Core Image color stage that
runs before whichever effect is selected and requires no Vision analysis.

Spin Cycle deliberately uses a center crop rather than a face anchor. The
visual idea does not benefit from Vision, and removing that dependency makes
the composition stable for groups, profiles, obscured faces, and empty frames.

Living Strip keeps `AVCapturePhotoOutput` as the still authority. Its future
motion path uses timestamps from the existing `AVCaptureVideoDataOutput`; no
TrueDepth, ARKit, microphone, or new permission is required.

## Performance And Quality Contract

- Preserve `AVCapturePhotoOutput` for every final still.
- Preview analysis is advisory geometry. Re-run Vision with accurate quality on
  each full-resolution captured still.
- Render every GIF/video frame from its captured still rather than recording
  the preview view.
- Keep sample delivery on the existing bounded output queue with
  `alwaysDiscardsLateVideoFrames = true`.
- Allow at most one Vision analysis in flight.
- Throttle landmark analysis initially to 12 Hz and reuse the latest geometry
  while Metal renders newer frames.
- Throttle or lower person-segmentation quality independently; it is not
  equivalent in cost to landmark detection.
- Reuse the Metal device, command queue, Core Image context, and intermediate
  storage.
- Treat orientation and selfie mirroring as explicit input metadata. The
  preview and saved image must agree.
- If analysis misses a face or person, render a stable original or
  non-face-aware fallback. Never flash black or reuse another person’s stale
  geometry indefinitely.
- Measure first-effect latency, preview frame cadence, dropped sample count,
  still-render duration, and memory on a physical device before production work.

## Architecture Consequences

### Why Vision is the baseline

Vision consumes the same `CVPixelBuffer` stream BoothBop already owns. It does
not require a second camera authority, it supports multiple faces, and the app
can repeat the same request against full-resolution stills.

### Why ARKit is optional

ARKit supplies the genuinely richer signals: a 3D topology, expression
coefficients, head pose, eye transforms, and gaze. It also changes camera
ownership and privacy obligations. A production ARKit mode needs a deliberate
handoff between AVFoundation and `ARSession`, plus proof that captured output
quality remains acceptable. It must not be slipped into the normal photo-booth
session.

### Why depth is optional

TrueDepth enables spatial effects that segmentation cannot reproduce, but
Apple’s capture APIs require depth support to be checked after format/session
configuration. Enabling depth changes the rendering pipeline, can freeze the
preview during reconfiguration, and adds photo-processing latency. Configure it
once before startup in a distinct mode or omit it.

## Primary Apple Sources

- [AVCamFilter: Applying filters to a capture stream](https://developer.apple.com/documentation/avfoundation/avcamfilter-applying-filters-to-a-capture-stream)
- [Tracking the user’s face in real time with Vision](https://developer.apple.com/documentation/vision/tracking-the-user-s-face-in-real-time)
- [VNDetectFaceLandmarksRequest](https://developer.apple.com/documentation/vision/vndetectfacelandmarksrequest)
- [Applying Matte Effects to People in Images and Video](https://developer.apple.com/documentation/vision/applying-matte-effects-to-people-in-images-and-video)
- [ARFaceTrackingConfiguration](https://developer.apple.com/documentation/arkit/arfacetrackingconfiguration)
- [ARFaceAnchor](https://developer.apple.com/documentation/arkit/arfaceanchor)
- [ARFaceAnchor blend shapes](https://developer.apple.com/documentation/arkit/arfaceanchor/blendshapes)
- [Enhancing live video with TrueDepth data](https://developer.apple.com/documentation/avfoundation/enhancing-live-video-by-leveraging-truedepth-camera-data)
- [AVCapturePhotoOutput depth delivery](https://developer.apple.com/documentation/avfoundation/avcapturephotooutput/isdepthdatadeliveryenabled)
- [Processing an image using built-in Core Image filters](https://developer.apple.com/documentation/coreimage/processing-an-image-using-built-in-filters)
