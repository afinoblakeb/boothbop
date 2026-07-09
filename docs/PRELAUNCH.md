# BoothBop — Extensive Pre-Launch Checklist (iOS App Store)

The exhaustive "are we actually ready?" list. Status: ✅ done · 🔲 to do ·
⚠️ needs a decision/verify. Owner: **[You]** (device/Apple), **[Me]** (code/docs),
**[Apple]** (review). Companion to `docs/APP_STORE.md` (submission copy) and
`docs/PERMISSIONS.md`.

> Bottom line right now: the **code/native side is in good shape**; the gaps are
> the **human/Apple loop** (account, screenshots, App Store Connect, on-device
> QA) plus a handful of **P1 polish** items. Nothing here should be a surprise
> at submission if we work the list.

---

## 1 · Apple account, signing & identifiers

- ✅ Apple Developer Program enrollment (Individual).
- 🔲 **[You]** Bundle ID `com.boothbop.app` registered in the Developer portal (Identifiers).
- 🔲 **[You]** Distribution certificate + App Store provisioning profile (Xcode "Automatically manage signing" is fine).
- 🔲 **[You]** Confirm the **Team** is selected on the App target; signing is green with no "personal team" warning.
- ⚠️ **[You]** Capabilities: confirm **no** unintended entitlements are enabled (Push, iCloud, App Groups, etc. — we use none). Extra entitlements trigger review questions.

## 2 · App Store Connect — app record

- 🔲 **[You]** Create the app record (Platform iOS, name "BoothBop", primary language, bundle ID, SKU).
- 🔲 **[You]** Primary category **Photo & Video**; secondary optional.
- 🔲 **[You]** Pricing: **Free**; availability: all territories (or chosen set).
- 🔲 **[You]** Age rating questionnaire → **4+** (no objectionable content; camera is user-initiated).
- 🔲 **[You]** Content rights: confirm you own/are licensed for all content (brand art is yours).
- 🔲 **[You]** Routing/region restrictions: none.

## 3 · Build, version & archive

- ✅ `MARKETING_VERSION = 1.0.0`; build number `1`.
- ✅ `npm run check` green (typecheck + lint `--max-warnings=0` + prettier + 36 tests).
- ⚠️ **[Me]** Don't register the **service worker in the native shell** (SW is moot in WKWebView; avoids console noise / stale-asset weirdness). _P1, pending._
- ⚠️ **[Me]** Remove unused `@capacitor/haptics` + `@capacitor/status-bar`, **or** intentionally wire haptics on capture (nice native feel + 4.2). _Decision pending._
- 🔲 **[You]** **Always run `npm run build && npx cap sync ios` immediately before Archive** so the bundled web assets are current (stale-asset trap).
- 🔲 **[You]** Product → Archive → validate → upload to App Store Connect. Confirm the build processes (no ITMS errors, no missing-icon/encryption flags).
- ✅ `ITSAppUsesNonExemptEncryption = false` (no export compliance prompt).
- ⚠️ Optional: remove `armv7` from `UIRequiredDeviceCapabilities` (meaningless on arm64-only iOS 15+). Cosmetic.

## 4 · Listing metadata (copy is drafted in `docs/APP_STORE.md`)

- ✅ App name, subtitle, keywords, description, promo text, What's New drafted.
- 🔲 **[You]** Paste into App Store Connect; proofread on the rendered page.
- ⚠️ **Video claim consistency**: the listing advertises "looping video." Confirm video records on device (it does) so the claim is truthful (Guideline 2.3.1). If it ever didn't, strip every "video" mention AND hide the tab.
- 🔲 Support URL (`https://boothbop.com/support/`) and Marketing URL set.
- 🔲 Copyright string (e.g. "© 2026 Blake Billiet").

## 5 · Screenshots & app preview

- 🔲 **[You]** Capture on a real device: **6.9"/6.7"** (required) and **6.5"** iPhone sizes; 5.5" only if supporting older.
- 🔲 Screenshot #1 = a **finished strip/GIF** (the desire), not the camera UI (ASO best practice).
- 🔲 Show: strip result, the booth/countdown, theme variety, the GIF/video, and (optionally) the auto-save Settings.
- ⚠️ No status-bar clutter / personal info / placeholder text in shots. Real, attractive content.
- 🔲 Optional: a 15–30s **app preview** video (4 snaps → strip → GIF).
- ⚠️ Each future premium drop = refresh "What's New" + a new hero screenshot.

## 6 · App Privacy ("nutrition label") & data

- ✅ Architecture collects nothing (on-device, no backend, no SDKs).
- 🔲 **[You]** App Privacy → **Data Not Collected** (confirm every category = No).
- ✅ R6 plugin audit: only first-party Capacitor plugins + our local `BoothBopPhotos`; no analytics/3rd-party SDK.
- ⚠️ Confirm the **privacy page** and the **App Privacy label** agree (both say "nothing collected").

## 7 · Legal & support pages

- ✅ Privacy, Terms, Support pages live at boothbop.com and bundled.
- ✅ **In-app legal links now open in an escapable in-app Safari view** (`@capacitor/browser`) — fixes the dead-link bug. 🔲 **[You]** verify on device they open + the "Done" button returns to the app.
- 🔲 Support email (`support@boothbop.com`) monitored and auto-reply sane.

## 8 · Permissions & usage strings

- ✅ `NSCameraUsageDescription`, `NSPhotoLibraryAddUsageDescription`, `NSPhotoLibraryUsageDescription` present + well-worded.
- ✅ Photos permission **flow fully codified** — see `docs/PERMISSIONS.md` (album=full, camera-roll=add-only, limited/denied handling, Open-iOS-Settings deep link, launch re-check).
- 🔲 **[You]** Device-verify every row of the permission chart (esp. "Select Photos" → revert + Open Settings; revoke-in-Settings → relaunch auto-reverts).
- ⚠️ Camera permission denial/revocation → app sends the user home with a clear message (implemented; verify on device).

## 9 · Functionality QA — the must-fixes (R1–R6) + new features

- ✅ R1: no "Add to Home Screen / no app store / install" UI in the native build.
- 🔲 R2: legal links escapable (now via in-app browser) — **verify on device**.
- 🔲 R3: camera fires, live preview, full 4-shot completes; deny + revoke-mid-session handled — **verify on device**.
- ✅ R4: native Save/Share works (validated earlier on device).
- ⚠️ R5: video — confirm `isVideoSupported()` is true in the WKWebView (it was) so the tab is **enabled**, not greyed. If ever unsupported, **hide** the tab entirely (don't render disabled) and cut video claims.
- ✅ R6: Data-Not-Collected holds.
- 🔲 **Auto-save**: album creates "BoothBop" album; strip/grid/gif/video each land correctly; camera-roll mode; the 1-toast-per-capture; **2× loop video** plays/loops as expected and is NOT stretched after backgrounding.
- 🔲 Gallery: save/reopen/delete/clear-all; persists across relaunch.
- 🔲 Share sheet offers Save Image/Video for PNG/GIF/MP4.

## 10 · On-device QA matrix

- 🔲 Devices: at least one **Face ID** iPhone (TrueDepth) + ideally one **Touch ID/older** if supporting iOS 15.
- 🔲 iOS versions: lowest supported (15.x) and latest.
- 🔲 Orientation: portrait lock behaves; no broken landscape.
- 🔲 Dark mode: UI + splash look right (we force a brand background).
- 🔲 Low-storage / Photos-full: save failures are graceful.
- 🔲 Interruptions: phone call / notification / backgrounding **mid-capture** and **mid-video-encode** (the stretch guard).
- 🔲 Airplane mode: app works offline; legal links degrade gracefully (they need network in-app).
- 🔲 First-launch cold start time + splash.

## 11 · Performance, stability, memory

- 🔲 No crashes across the QA matrix (watch Xcode Organizer → Crashes post-TestFlight).
- ⚠️ Memory on full-res-ish encodes (GIF + video pre-generate every capture when auto-save on) — watch on an older device; OOM = the classic camera-app failure.
- 🔲 No runaway blob-URL growth over many sessions (clearResults revokes; verify).
- 🔲 Battery/thermals reasonable during repeated capture.

## 12 · Accessibility (launch-quality polish)

- ⚠️ **[Me]** `aria-pressed`/selected state on format tabs, layout toggle, countdown, theme swatches (currently color-only — WCAG issue). _P1, pending._
- ⚠️ **[Me]** Tap targets ≥ 44pt for ✕ close, gallery delete, gear, nudge-dismiss. _P1, pending._
- ⚠️ **[Me]** No-scroll responsive layout: every screen (idle, camera, review, gallery, settings) fits with **no vertical scroll on ≥ iPhone 15 (393×852pt, safe-area-adjusted)**; verify `scrollHeight ≤ innerHeight` at 393×852 and 430×932. _P1._
- 🔲 VoiceOver pass over the main flow; Dynamic Type doesn't break layouts; contrast check on the off-state toggle.

## 13 · App Review guideline self-audit

- ✅ **4.2 minimum functionality**: native camera, on-device GIF/video encode, native share, **native Photos album auto-save** (web-impossible), bundled assets (no `server.url`), R1 guards. Reviewer notes drafted (`docs/APP_STORE.md`).
- ✅ **5.1.1 permissions**: purpose strings honest; permission requested in context.
- ✅ **2.1 completeness**: no placeholder/broken UI; legal links work.
- 🔲 **2.3.x metadata**: screenshots match the app; no misleading claims; keywords legit.
- ✅ **3.x payments**: none in v1 (IAP is v1.1 — defer).
- 🔲 **2.3.10**: no mention of other platforms / "beta" / irrelevant info in metadata.

## 14 · Web / PWA parity & migration funnel

- ✅ boothbop.com live; PhotoBlast→BoothBop migration gravestone + `?from=photoblast` welcome.
- 🔲 Confirm web build still deploys + works after all the native-era changes (CI green; spot-check the site).
- ⚠️ Legal pages in the PWA precache so an offline web user can open them.

## 15 · TestFlight

- 🔲 **[You]** Upload build → Internal testing (yourself + a few friends).
- 🔲 Walk the full QA matrix (§9–§12) on TestFlight before public submit.
- 🔲 Fix anything device-only that surfaces; re-upload.

## 16 · Final submission

- 🔲 All §1–§15 green (or consciously deferred).
- 🔲 Review notes pasted (the 4.2 narrative + "no login required").
- 🔲 Demo account: N/A (no accounts) — say so in notes.
- 🔲 Submit → choose **manual release** (so you control go-live) or auto.

## 17 · Post-submission / rejection playbook

- 🔲 Watch for "Metadata Rejected" (fixable without a new build) vs "Binary Rejected".
- 🔲 If **4.2**: point to the reviewer notes + native capabilities; offer a video of native features.
- 🔲 If **5.1.1**: ensure each prompt is contextual and strings are specific.
- 🔲 Keep replies factual and fast in Resolution Center.

## 18 · Day-1 ops & support

- 🔲 support@ inbox watched; canned replies ready.
- 🔲 Crash monitoring via Xcode Organizer (no 3rd-party SDK by design).
- 🔲 A plan to ship a quick 1.0.1 if something slips through.
- 🔲 Decide soft-launch vs announce (the growth plan in `docs/PLAN.md`; hold Product Hunt for the AR tentpole).

## 19 · Consciously deferred (NOT v1 blockers)

- BoothBop Pro **IAP** -> v1.1 (StoreKit, no backend).
- AR filters, depth/portrait, HD capture → later phases.
- Android / Play Store.
- Accounts / cloud storage (would force a backend — avoided on purpose).

## 20 · "Are we missing something?" — the easy-to-forget gotchas

- 🔲 **App icon** has **no alpha channel / no rounded corners** (1024² flat) — a classic auto-reject.
- 🔲 **Launch screen** renders correctly (storyboard) — no black flash.
- 🔲 The **`armv7`** capability + any stray default Capacitor config reviewed.
- 🔲 **Bundle display name** ("BoothBop") fits under the icon without truncation.
- 🔲 **Privacy manifest** (`PrivacyInfo.xcprivacy`) — Apple now expects one for "required reason" APIs (e.g. `UserDefaults`/file-timestamp). ⚠️ **We likely need to add one** even though we collect nothing. _Investigate — this is a real, easy-to-miss 2024+ requirement._
- 🔲 **Third-party SDK privacy manifests** — N/A (no 3rd-party SDKs), but confirm Capacitor core doesn't require one.
- 🔲 Screenshots don't show a **different app version** or unshipped features.
- 🔲 "Sign in with Apple" — **not required** (we have no third-party login at all).
- 🔲 Confirm the app **doesn't crash on a device with Photos access fully denied from the start**.
- 🔲 Confirm **deleting the BoothBop album in Photos** mid-use doesn't break saving (plugin re-creates; verify).
