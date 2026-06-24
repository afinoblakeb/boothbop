# BoothBop — iOS App Store launch

Living checklist + the submission-ready content for the iOS App Store. Path:
**Capacitor** (wrap the web app). The React Native premium rebuild stays a
post-validation option (see [ROADMAP.md](../ROADMAP.md) / [MONETIZATION.md](MONETIZATION.md)).

Legend: **[Me]** AI can do · **[You]** needs Mac/iPhone/Apple account · **[Apple]** their queue.

> Listing copy + metadata below were drafted and then audited by three App Store
> expert reviewers (legal/privacy, metadata, approval-risk). Their fixes are
> applied. The most important output is the **Phase 2 build must-fixes** section —
> read it before wrapping with Capacitor.

---

## Status

- ✅ Apple Developer Program (Individual)
- ✅ Domain (boothbop.com) + `support@boothbop.com`
- ✅ Brand + logo art
- ✅ Working web app (PWA), trademark cleared
- ✅ **Privacy Policy** live → https://boothbop.com/privacy
- ✅ **Terms** live → https://boothbop.com/terms
- ✅ **Support page** live → https://boothbop.com/support
- ✅ In-app Privacy · Terms footer links
- ✅ App Store Connect copy + answers drafted & expert-reviewed (below)
- ⬜ Capacitor iOS project (Phase 2 — see must-fixes below)
- ⬜ Device test → TestFlight → submit

---

## The plan

### Phase 1 — Legal & listing prep · [Me] · **DONE**

Privacy / Terms / Support pages live; listing copy + every App Store Connect
answer prepared and expert-reviewed below.

### Phase 2 — Capacitor iOS project · [Me] scaffolds, [You] runs

- Install Capacitor, add iOS platform, generate `ios/`
- `capacitor.config` — app id `com.boothbop.app`, **bundle the web `dist/`; never
  point the WebView at a remote URL**
- `NSCameraUsageDescription` (camera permission string)
- `ITSAppUsesNonExemptEncryption = NO`
- Allow inline camera in WKWebView (`allowsInlineMediaPlayback`, clear
  `mediaTypesRequiringUserActionForPlayback`)
- Disable the PWA service worker inside the native shell (assets are bundled)
- Native polish (this IS the Guideline 4.2 defense, not garnish): native Share
  sheet (Capacitor Share plugin, not `navigator.share`), haptics on capture, real
  splash screen, status-bar styling, native app icon
- Generate full iOS icon set + splash from the 1024 art
- **Apply the Phase 2 build must-fixes below**

### Phase 3 — Build & device test · [You] + guidance

Install Xcode → open `ios/` → automatic signing → run on a real iPhone. Use the
**Phase 2 verification matrix** below — several items are submission-gating.

### Phase 4 — TestFlight · [You] + [Apple] (light)

Create app record (bundle ID, name) → Archive & upload → processes (~5–60 min) →
Internal TestFlight (immediate, no review) → optional External (beta review ~1 day).

### Phase 5 — App Store submission · [You] + [Apple]

Screenshots → fill listing → pricing Free → App Privacy / Age Rating / Export /
Review notes → Submit → respond → release.

### Phase 6 — Post-launch · future

Monitor · Pro tier via IAP · Android via Play · maybe the RN premium rebuild if validated.

---

## ⚠️ Phase 2 build — expert-review MUST-FIXES (before first submission)

These were found by auditing the **current web code** against how it behaves
inside a Capacitor WKWebView. They are the difference between a ~50% and ~85%+
first-submission pass. None are visible in the web app today.

| #      | Risk                                                                                                                                                                                                                                                                                                                   | Guideline    | Fix                                                                                                                                                                                                                       |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **R1** | **PWA "Add to Home Screen / no app store / free" card + the PhotoBlast migration screen render INSIDE the native app.** `InstallCard` & the migration screen hide only when `isStandalone()` is true — which is **false** in a Capacitor WebView. A reviewer sees "add to home screen, no app store" → instant reject. | 2.3.10 / 4.2 | Add `isNativeShell()` (detect `window.Capacitor` / `capacitor://`) and early-return `null` from `InstallCard`, the migration screen, and the "No app store" footer copy when native. **Do NOT rely on `isStandalone()`.** |
| **R2** | **Privacy/Terms footer links dead-end in the WebView.** `<a href="/privacy/">` does a full navigation; inside `capacitor://localhost` it can land on a blank/error page with no way back → "broken."                                                                                                                   | 2.1 / 4.2    | Verify `dist/privacy`, `dist/terms`, `dist/support` are bundled; for native, open them via the **Capacitor Browser plugin / SFSafariViewController** (or in-SPA routes) so they load offline and are escapable.           |
| **R3** | **Camera must actually work in WKWebView.** `getUserMedia` needs iOS 14.3+ and the native layer to grant the prompt; classic failure = black/frozen preview = dead app on the reviewer's device.                                                                                                                       | 5.1.1 / 2.1  | Set `NSCameraUsageDescription`; allow inline media. **Verify on a real iPhone**: native permission prompt fires, live pixels show, full 4-shot completes; test deny + revoke-mid-session.                                 |
| **R4** | **Save/Share is a no-op in WKWebView.** `navigator.share({files})` is unreliable; the `<a download>` fallback does effectively nothing in WKWebView → "I tapped Save and nothing happened."                                                                                                                            | 2.1          | Route share/save through the **Capacitor Share plugin** and a save-to-Photos plugin. If saving to Photos, add **`NSPhotoLibraryAddUsageDescription`**.                                                                    |
| **R5** | **Video export may not work in WKWebView** (`MediaRecorder`). It's currently rendered as a **disabled/greyed tab** — a dimmed non-functional control is itself a 4.2/2.1 smell, AND the listing advertises "looping video" → 2.3.1 metadata mismatch if it can't record.                                               | 2.1 / 2.3.1  | Decide on-device: if video works, keep it; if not, **fully hide the tab** (don't render disabled) AND remove every "video / looping video" claim from the description + What's New. Don't advertise a greyed feature.     |
| **R6** | Confirm no third-party SDK enters via a Capacitor plugin (would break "Data Not Collected").                                                                                                                                                                                                                           | 5.1.2        | Audit each plugin added. Keep it Data Not Collected.                                                                                                                                                                      |

### Non-negotiables before first submission

1. No PWA-install / "add to home screen" / "no app store" UI or copy in the native build (R1).
2. Camera works on a real iPhone — prompt fires, live preview, full capture (R3).
3. Privacy & Terms load offline in-app and are escapable (R2).
4. Save/Share actually works via native plugin (R4).
5. Video is consistent end-to-end — works, or fully removed from app + listing (R5).
6. `NSCameraUsageDescription` (+ `NSPhotoLibraryAddUsageDescription` if saving to Photos); `ITSAppUsesNonExemptEncryption=NO`; bundle ID matches `capacitor.config`.
7. All native polish shipped (native share, haptics, splash, status bar, icon).

**Expert read:** plan as-is ≈ 50% first-pass; fix R1/R2/R3/R4 → ~85%+. Highest-leverage item is **R1** (a reviewer bounces it in 30 seconds without even testing).

---

## Pre-launch checklist (the "can I hit Submit?" gate)

- [ ] Bundle ID `com.boothbop.app` registered (permanent)
- [ ] 1024×1024 icon (no alpha, no rounded corners) + full iOS icon set + splash
- [ ] Phase 2 must-fixes R1–R6 done & verified on device
- [ ] `NSCameraUsageDescription` present · `ITSAppUsesNonExemptEncryption = NO`
- [ ] Privacy Policy URL live (✅) · Support URL live (✅)
- [ ] App Privacy = Data Not Collected · Age Rating 4+ · Export = exempt
- [ ] Name, subtitle, promo text, description, keywords
- [ ] Screenshots for required iPhone sizes
- [ ] Category Photo & Video · Pricing Free
- [ ] Version 1.0.0 / build 1
- [ ] Tested on a real device; TestFlight build verified; no crashes
- [ ] Review notes written (below)

---

## App Store Connect — submission content

### App name (≤30)

**`BoothBop: Photo Booth`** (21) — brand + the top search keyword. (Pure brand
`BoothBop` only if you'll drive installs via social/paid, not search.)

### Subtitle (≤30)

**`4 snaps, instant photo strips`** (29) — recommended (adds snaps/instant/strips/
photo, none of which are in the title). Treat the alt below as discarded, not
either/or, so keywords don't get double-indexed.
Alt: `Selfie strips, GIFs & loops` (27) — if you pick this, **drop `selfie,gif,loop`
from keywords.**

### Promotional text (≤170)

`Prop up your phone, tap start, strike four poses. BoothBop turns them into a photo strip, GIF, or looping video—all on your device. No accounts. No uploads.` (156)

> ⚠️ Remove the "GIF, or looping video" phrasing if video export is cut in Phase 2 (R5).

### Description

```
Bring the classic photo booth to your phone.

Prop up your phone, tap start, and strike a pose—BoothBop snaps four photos
back to back on a countdown, just like the real thing. Seconds later you've
got a finished photo strip ready to save and share.

It's the perfect party trick: weddings, birthdays, game nights, holidays, or
a quiet afternoon making faces with friends. Set it on a shelf, gather
everyone in frame, and let the countdown do the rest.

TURN FOUR POSES INTO SOMETHING SHAREABLE
- Classic 4x1 vertical strip or a 2x2 grid
- Animated GIF that loops your four shots
- Short looping video, ready to send

MAKE IT YOURS
- Retro atomic-age themes in cream, orange, and teal
- Swappable border colors and styles for every strip
- Adjustable shutter delay—more time to get into position
- Front-facing camera tuned for selfies and group shots

YOUR PRIVATE BOOTH
- 100% on-device: photos are captured and processed right on your phone
- Nothing is ever uploaded—no servers, no cloud, no account, no sign-up
- No ads, no tracking, no analytics
- A private gallery saves every session locally, so you can reopen,
  reshare, or delete any strip whenever you like
- Works fully offline

Photos never leave your device unless you choose to share them. That's it—
no catch.

Prop it up. Tap start. Strike a pose. BoothBop.
```

> ⚠️ If video is cut in Phase 2 (R5), delete the "Short looping video, ready to
> send" line and the "video" mention in the GIF line.

### Keywords (≤100, no spaces after commas)

`photobooth,photostrip,gif,selfie,collage,grid,loop,party,retro,vintage,countdown,burst,booth` (92)

Notes (expert-reviewed): removed **`boomerang`** (Meta/Instagram brand → 2.3.7
spam-rejection risk) and **`strip`** (already indexed via the subtitle "strips");
added **`photostrip`** and **`booth`**. Excludes words already in the title/subtitle.

### What's New (v1.0)

```
Welcome to BoothBop!

This is our first release. Prop up your phone, tap start, and strike four
poses—then turn them into a photo strip, an animated GIF, or a looping video.

- Four-shot countdown capture, like a real photo booth
- 4x1 strip and 2x2 grid layouts
- Animated GIF and looping video export
- Retro atomic-age themes and custom border colors
- Adjustable shutter delay
- A private, on-device gallery for every session
- Fully on-device and works offline—nothing is ever uploaded

Thanks for booth-bopping with us. Feedback: support@boothbop.com
```

> ⚠️ Remove the "looping video" line + the "Animated GIF and looping video export"
> bullet's video half if video is cut (R5).

### Categories

Primary **Photo & Video** · Secondary **Entertainment**.

### App Privacy

Top-level answer: **No, we do not collect data** → label **"Data Not Collected."**
Camera + photos are NOT "collected" (nothing leaves the device, no servers/SDKs/
analytics). Tracking: **No**. Must match the live Privacy Policy (it does).

### Age Rating → 4+

Answer **None/No** to every content question. Unrestricted Web Access: **No** (only
the app's own bundled content loads — true only because the WebView never loads a
remote URL; keep it that way per R1/Phase 2). User-generated content: **No** in the
rating sense — only the user's own local photos, no in-app community/feed/server.

### Export Compliance → Exempt

Only standard encryption (HTTPS/OS crypto). Add to Info.plist:

```xml
<key>ITSAppUsesNonExemptEncryption</key>
<false/>
```

### Identifiers

- Bundle ID: `com.boothbop.app` (permanent; register exactly; must match `capacitor.config`)
- Version `1.0.0` · Build `1` (increment build every upload)

### App Review notes (paste into the reviewer Notes field)

```
Thank you for reviewing BoothBop.

NO LOGIN REQUIRED. There is no account, sign-up, or paywall. The full app is
available immediately on launch—no demo credentials needed.

WHAT THE APP DOES
BoothBop is a self-contained native photo-booth app. It uses the live device
camera (front-facing) to capture four photos on a countdown, then composites
them on-device into a photo strip (4x1 or 2x2), an animated GIF, and a short
looping video.

HOW TO TEST (about 30 seconds)
1. Launch and allow camera access when prompted.
2. (Optional) Choose a theme/border color and adjust the shutter delay.
3. Tap Start. The app counts down and captures four photos automatically.
4. View the strip, then switch between strip / GIF / video outputs.
5. Open the on-device gallery to see the session saved locally; tap Share to
   use the standard iOS share sheet, or delete it.

RE: GUIDELINE 4.2 (MINIMUM FUNCTIONALITY)
BoothBop is built with a web technology layer inside a native shell, but it is
NOT a repackaged website and does not merely display web content:
- The UI is rendered in an embedded WKWebView via Capacitor, but ALL HTML/JS/CSS
  is bundled in the app binary—nothing is loaded from a remote URL and the app
  never points the web view at a website.
- It drives the real device camera for live capture (core device functionality).
- The camera, GIF/video encoding, on-device gallery (IndexedDB), and the native
  iOS share sheet are driven through native Capacitor plugins.
- All processing happens on-device; the app fully functions in Airplane Mode.
- There is no open/unrestricted web browser; only the app's own bundled
  experience loads.

PRIVACY
No data is collected. Photos are captured and processed entirely on-device and
are never uploaded—no servers, accounts, analytics, ads, or third-party SDKs.
Content leaves the device only if the user explicitly shares it via the iOS
share sheet. Permission string included: NSCameraUsageDescription.

Contact: support@boothbop.com · Website: boothbop.com
```

---

## Capacitor — done & the "when Xcode finishes" runbook

**Done (web side, no Xcode needed):**

- Capacitor 8 installed (`@capacitor/core`, `ios`, `cli`) + plugins
  (`share`, `haptics`, `status-bar`, `splash-screen`)
- `capacitor.config.ts` — `com.boothbop.app`, `webDir: dist`, **no `server.url`
  (bundled assets only)**, brand background
- npm scripts: `ios:sync`, `ios:open`, `ios`
- R1 native-shell guard shipped (install/migration UI hidden in the native build)

**Remaining — run once Xcode is installed (mostly [Me], then [You] in Xcode):**

```bash
# 1. CocoaPods (Capacitor iOS dependency manager)
brew install cocoapods        # or: sudo gem install cocoapods

# 2. Generate the native iOS project (creates ios/, runs pod install)
npx cap add ios

# 3. App icons + splash from the brand art (generates the iOS icon set)
npx @capacitor/assets generate --ios

# 4. Build the web app, copy it into the native project, open Xcode
npm run ios
```

Then, **in Xcode [You]:** select Signing & Capabilities → your Team (Apple ID) →
plug in your iPhone → press Run. First run: on the iPhone, trust the developer
cert under Settings → General → VPN & Device Management.

**Still to do in the native project (after `cap add ios`):**

- `ios/App/App/Info.plist`: add `NSCameraUsageDescription` (and
  `NSPhotoLibraryAddUsageDescription` if saving to Photos) +
  `ITSAppUsesNonExemptEncryption = NO`
- R4: route Save/Share through `@capacitor/share` (web `navigator.share` is
  unreliable in WKWebView); add haptics on capture (R3 native feel)
- R3/R5: verify camera + video on the real device (the on-device must-checks)

## Build notes (Phase 2)

- **`NSCameraUsageDescription`** — e.g. "BoothBop uses the camera to take your
  photo-booth pictures." Required; missing it = automatic Guideline 5.1.1 reject.
- **`NSPhotoLibraryAddUsageDescription`** — required IF strips are saved to the
  system Photos library (R4 likely needs this).
- Screenshots: show countdown, a finished strip, GIF/video output, theme picker,
  gallery. No "beta", no Apple trademarks, no non-iOS device frames.
- Developer name on the listing = your personal legal name (Individual account).
