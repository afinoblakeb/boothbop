# BoothBop 0.0.5 iPhone Review

Candidate: App Store version `0.0.4`, build `0.0.5`, commit `6d45e79`.

This is the short physical-device gate. Simulator, browser, unit, layout, and
fresh/update launch checks already pass. Do not upload to Apple until every
blocker below passes on the owner's iPhone.

## Install

1. Open `ios/App/App.xcodeproj` in Xcode.
2. Select the `App` scheme and the owner's iPhone.
3. Press Run. Xcode installs the already-synced candidate from this commit.

## Five-Minute Core Pass

1. **Launch:** Cold-launch twice. Camera appears directly with no black screen,
   web landing page, or tappable logo.
2. **Camera quality:** In ordinary indoor light, confirm the preview is sharp,
   correctly oriented, naturally colored, and adjusts focus/exposure when the
   subject distance and lighting change.
3. **Shutter:** Take four photos with the 1-second countdown. There is no white
   screen between shots; each captured photo briefly freezes for about 200ms.
4. **Retake One:** Replace one photo. The other three remain unchanged and the
   replacement is sharp and correctly oriented.
5. **Edit:** Apply Warm, Cool, B&W, Sepia, and Inverse. Each is visibly distinct,
   the preview responds promptly, and Done returns to the full review screen.
6. **Strip:** Save/share the classic strip. It has four square photos, the cream
   brand footer, and an exact 2x6 proportion without distorted faces.
7. **Animation:** Review GIF, enable Boom, change speed, and review Video. Motion
   is smooth and output quality is visibly suitable for sharing.
8. **Instagram:** Share the animation to Post, Reel, and Story. All three accept
   the MP4; faces and branding remain inside each crop and are not softened or
   stretched.
9. **My Photos:** Reopen the session, return directly to Camera, select/delete a
   session, and confirm no per-photo trash buttons or web home route appears.
10. **Settings:** Toggle branding off, create another output, and confirm the
    GIF/video watermark is absent. Confirm the expected Photos save behavior.

## Release Blockers

Do not approve the build if any of these occur:

- Black or blank launch surface.
- White shutter screen, stalled controls, crash, or lost capture.
- Blurry, incorrectly mirrored/rotated, or unnaturally colored iPhone photos.
- Cropped Instagram Post/Reel/Story output or rejected media.
- Missing session, broken Retake One, distorted strip, or ineffective filter.
- Native navigation reaches the web `Take Photos` landing screen.

For a failure, capture one screen recording and note the action immediately
before it happened. That is enough evidence to reproduce and fix it.
