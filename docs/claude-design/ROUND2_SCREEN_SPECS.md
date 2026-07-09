# ROUND2_SCREEN_SPECS

Implementation-ready specs for every near-term BoothBop screen, plus a separate
future/event block. Visual companion: **`BoothBop Phase 2.dc.html`** (canvas
section01-section05). Grounded in the current repo (`src/screens/*`, `src/ui/*`,
`src/lib/*`). Local-first throughout: **no backend, no accounts, no cloud**.

## Conventions used below

- **Reference sizes:** `390x844` (iPhone compact, the design target), `430x932`
  (iPhone large), `820x1180` (iPad portrait), `1180x820` (iPad kiosk landscape),
  `1440x1100` (desktop preview).
- **Palette/type** come from `src/index.css` `@theme`: cream `#f6e7cf`, paper
  `#faf6ee`, ink `#111`, orange `#e85a1a`, mustard `#d9a441`, teal `#3e7c78`,
  olive `#6e7551`, carbon `#111`; display = Bebas Neue, body = Oswald.
- **Primitives:** `Button`, `Callout`, `IconButton`, `SectionLabel`,
  `SegmentedControl`, `Toggle`, `OverlayScreen`, `Heading` (`src/ui`).
- **Hit targets >= 44px.** State is never color-only (every swatch/segment has a
  text label or `aria-label`).
- **Layout rule for all phone screens:** a fixed top region (status + top bar +
  primary content/preview + primary actions) and, where present, **one**
  internal scroll region. The two primary actions never live inside the scroll
  region.

---

# A. NEAR-TERM SCREENS

## A1. Home / Idle -- `src/screens/IdleScreen.tsx`

- **Purpose:** launch point for the booth; surface the three ways in (camera,
  templates, import) and My Photos.
- **Entry points:** app launch (`phase==="idle"`); "Take Again"/Back from Review;
  exit from Gallery/Settings.
- **Exit points:** Take Photos -> Camera (`openCamera()`); Browse Templates ->
  Template Gallery; My Photos -> Gallery; Import -> file picker; gear -> Settings.
- **Component hierarchy:** `TopBar` (wordmark + gear `IconButton`) > centered
  column: wide logo (`assets/logo-wide.png`) > one-line tagline > **primary**
  `Button` "Take Photos" > **Templates entry card** (new) > `Button` "My Photos"
  > `Button` "Import 4 Photos" > `LegalFooter`.
- **Layout @390x844:** single column, 24px gutters, buttons full-width to a
  300px max. Templates card = 64px tall, teal, shows 3 mini strip spines + label
  - "->". @430x932: same, more vertical breathing room. @820/1180 (iPad): cap
    content column at 520px, center; logo larger. @1440x1100 (desktop): same
    centered column on cream field, max 520px.
- **Primary action:** Take Photos. **Secondary:** Browse Templates, My Photos,
  Import.
- **States:** _Empty/first run_ -- same screen (no gallery badge). _Error_ -- when
  routed home from a camera failure, show a `Callout tone="error"` above the
  buttons with `CAMERA_MSG` (see A2 error). _Demo build only_ (`VITE_DEMO`):
  three "Demo 1/2/3" buttons appear (already in repo).
- **Locked Pro:** none on Home.
- **Copy:** Tagline "Your phone is the photo booth. Four poses, one strip."
  Buttons: "TAKE PHOTOS", "BROWSE TEMPLATES" / "30 looks for every occasion",
  "MY PHOTOS", "IMPORT 4 PHOTOS". Footer "Private - on-device - no account".
- **Repo mapping:** add the Templates card to `IdleScreen.tsx`; new prop
  `onBrowseTemplates`. App-level: add a `showTemplates` boolean (mirrors
  `showGallery`/`showSettings`).
- **Acceptance:** all four routes reachable in one tap; no horizontal scroll at
  any reference size; logo never upscaled past its intrinsic size.

## A2. Camera preview -- `src/screens/CameraScreen.tsx`

- **Purpose:** live framing before a shoot; choose facing, mirror, sound,
  countdown.
- **Entry:** Home -> Take Photos; Template detail -> Start Booth (preset applied
  first); retake-a-shot from Review.
- **Exit:** Take Photos -> Countdown/Capture (`runSequence`); back -> Home
  (`cancelToHome`); permission failure -> Home with message.
- **Hierarchy:** `TopBar` (wordmark, My Photos `IconButton`, facing-flip
  `IconButton`) > square live `<video>` (1:1, `border-2 border-ink`; mirrored
  when `mirrorPreview`) > 4-cell progress row (filled as frames land) > controls:
  Front/Mirror/Sound segmented row > Countdown `SegmentedControl` (1/2/3/5/10s,
  default per `loadCaptureDelay`) > primary `Button` "Take Photos".
- **Layout @390x844:** video fills width under the bar; controls pinned to a
  bottom block via `margin-top:auto`. @430x932: identical, larger video.
  @820x1180 (iPad portrait): video capped ~640px, centered, controls in a
  centered 520px column. @1180x820 (iPad landscape / kiosk): two-column -- video
  left (square, ~620px), controls right; this is the Party-Mode/kiosk-friendly
  arrangement. @1440x1100: centered 1:1 video ~560px with controls beneath.
- **Primary:** Take Photos. **Secondary:** flip facing, toggle mirror/sound,
  change countdown, My Photos.
- **States:** _Loading_ -- black 1:1 frame until `videoReady`; controls disabled.
  _Permission denied / camera lost_ -- `failToHome(CAMERA_MSG)` returns to Home
  with the error Callout (see A1). _No camera device_ -- same path, message from
  `cameraError`. _Environment facing_ -- mirror auto-off.
- **Locked Pro:** none (capture is always free).
- **Copy:** "FRONT" / "MIRROR" / "SOUND"; "COUNTDOWN"; CTA "TAKE PHOTOS".
  `CAMERA_MSG` (existing) e.g. "Camera access is off. Turn it on in Settings to
  take photos."
- **Repo mapping:** `CameraScreen.tsx` unchanged structurally; add the
  active-template chip **only** when launched from a template (read a new
  `activePresetLabel` prop; tap -> back to Template detail). No multi-template
  picker near-term.
- **Acceptance:** countdown selection persists (`saveCaptureDelay`); flip works
  mid-preview (`restartCamera`); controls always reachable without scroll at
  390x844.

## A3. Countdown / capture -- `CameraScreen.tsx` overlay (App `runSequence`)

- **Purpose:** count down and grab four square frames.
- **Entry:** Take Photos. **Exit:** auto -> Review on the 4th frame; cancel/back ->
  Home (`abortRef`).
- **Hierarchy:** live video + big centered countdown numeral (`.countpop`) +
  white `.flash` on capture + "shot N of 4" indicator + the same 4-cell progress
  row filling in.
- **Layout:** numeral ~30vmin, centered; identical across sizes (scales with
  vmin). Progress row stays pinned.
- **States:** _Counting_ (numeral 3->1 with shutter tone), _Flash_ (240ms),
  _Between shots_ (~750ms "pose!" gap), _Retake-single_ variant replaces one
  index. _Aborted_ -- immediate return Home, camera stopped.
- **Copy:** numerals only; optional "POSE!" between shots.
- **Repo mapping:** existing `runSequence`/`runDemoSequence`; no change.
- **Acceptance:** never counts onto a dead stream (`videoReady` guard); haptic +
  tone fire per shot; exactly `SHOTS` (4) frames captured.

## A4. Review -- collapsed -- `src/screens/ReviewScreen.tsx` (restructure)

- **Purpose:** show the finished output and get the user to Save/Share in one
  screen, with all tweaks one tap away.
- **Entry:** end of capture; Import; reopen from Gallery.
- **Exit:** Edit -> opens drawer (same screen); Save/Share; Take Again -> Camera;
  Back -> Home.
- **Hierarchy (collapsed):** `TopBar` (back, wordmark, My Photos) > **strip
  preview hero** (centered `ZoomableImage` of the composed strip) > action row
  `grid-cols-[7rem_minmax(0,1fr)]` = **Edit** (secondary) + **Save / Share**
  (primary) > text button "Take Again" > one-line privacy note.
- **Layout @390x844:** preview height `clamp(300px,52vh,520px)`; action row 56px;
  total fits with **0px vertical overflow** -- this is the headline constraint.
  @430x932: preview `clamp(320px,56vh,580px)`. @820x1180: preview centered, max
  560px wide; actions in a 520px column. @1440x1100: preview max 520px tall,
  actions centered beneath.
- **Primary:** Save/Share (`onShare` when `shareFilesOk`, else `onDownload` ->
  "Save Photo"). **Secondary:** Edit, Take Again.
- **States:** _Generating_ (gif/boomerang/video) -- spinner replaces preview,
  Save disabled (existing `isBusy`). _Error_ -- `Callout tone="error"`. _Note_ --
  transient teal note line (existing). _Strip vs motion_ -- collapsed always
  shows the **strip** by default (format lives in the drawer, A5).
- **Locked Pro:** none visible collapsed (no Pro affordance until the drawer).
- **Copy:** "EDIT", "SAVE / SHARE" (or "SAVE PHOTO"), "TAKE AGAIN", "Photos
  stay on this device. BoothBop never uploads."
- **Repo mapping:** split `ReviewScreen` return into a _collapsed header_
  (preview + action row + take-again + note/error) and the existing
  `<section id="review-editor">`, toggled by `editOpen`. Remove the format tabs
  from the collapsed view (they already live inside the editor section). Move
  "Save All" + "Take Again" into the drawer (A5).
- **Acceptance:** at 390x844 with `editOpen===false`, the screen does not scroll;
  Edit + Save/Share both >=44px and fully visible; preview never clipped.

## A5. Review -- Edit drawer -- `ReviewScreen.tsx` `<section id="review-editor">`

- **Purpose:** hold **all** photo tweaks in one scrollable drawer, in a fixed
  order, while the two primary actions stay docked above it.
- **Entry:** Edit (collapsed). **Exit:** Edit again (collapse), or Save/Share.
- **Order (top->bottom) -- forced:**
  1. **Output / format** -- `SegmentedControl` Strip - GIF - Boom - Video
     (`onSelectFormat`; Video only if `isVideoSupported()`).
  2. **Layout** (strip only) -- Classic(4x1) - Grid(2x2) - 2x6 Pro - 4x6 Pro -
     Story Pro (`changeLayout`; premium gated via `isPremiumLayout`).
  3. **Color** -- 6 theme swatches (`THEMES`) with `aria-label`s.
  4. **Look** -- Original - Mono - Warm - Glam Pro - Vintage Pro (+ the 6 new Pro
     looks once shipped; see ROUND2_RENDERING_SPECS) (`setFilter`;
     `isPremiumFilter`).
  5. **Props** -- None - Spark - Hearts Pro - Party Pro (`setSticker`;
     `isPremiumSticker`).
  6. **Caption (Pro)** -- text field, max 24 chars (`SESSION_TITLE`-style),
     disabled/locked when `!isPro`; wired to `preset.caption`/custom caption ->
     strip footer (`composeStrip` `caption`).
  7. **Session** -- name field (`SESSION_TITLE_MAX`) + favorite star (when
     `canManageSession`).
  8. **Shots** -- 4 thumbs; tap to retake; < > reorder (`onMoveShot`).
  9. **Browse Templates ->** -- routes to Template Gallery (secondary entry).
  10. **Save All** then **Take Again**.
- **Layout @390x844:** preview shrinks to `clamp(220px,34vh,420px)` (existing
  `previewFrameClass`), drawer becomes the scroll region. Controls full-width.
  @430x932: same. @820x1180: drawer can go **two columns** (controls left,
  shrunk preview pinned right). @1440x1100: two columns, preview pinned.
- **States:** _Locked rows_ -- Pro layout/look/props/caption render with a "Pro"
  suffix + disabled style; tapping fires the paywall (A9) with a context string.
  _Format=motion_ -- Layout/Color hidden, replaced by the existing motion
  helper-text. _Quality HD_ lives in Settings, not here.
- **Copy:** section labels "OUTPUT / LAYOUT / COLOR / LOOK / PROPS / CAPTION /
  SESSION / SHOTS"; "BROWSE TEMPLATES ->", "SAVE ALL", "TAKE AGAIN".
- **Repo mapping:** reorder existing blocks in `ReviewScreen`; add the Caption
  field (new) and the Browse-Templates button (new `onBrowseTemplates` prop).
- **Acceptance:** drawer scrolls independently; primary actions remain visible
  while scrolling; every Pro control is reachable and previews its result before
  purchase.

## A6. Format picker (inside Review) -- part of A5

- **Decision:** format is **inside the drawer** (Output, the first control), not
  on the collapsed screen. Strip is the default output.
- **Behavior:** switching to GIF/Boom/Video triggers `onSelectFormat`; encoding
  is pre-warmed (`pregenerate`) so the preview is instant; Layout/Color hide for
  motion formats.
- **Acceptance:** changing format never changes the collapsed layout; returning
  to Strip restores the strip preview.

## A7. Template gallery -- `src/screens/TemplateGalleryScreen.tsx` (NEW)

- **Purpose:** browse the template catalog by category; preview each rendered
  from real frames; pick one.
- **Entry:** Home Templates card; Review drawer "Browse Templates ->".
- **Exit:** back; tap a card -> Template detail (A8/A9).
- **Hierarchy:** `TopBar` (back, "TEMPLATES") > horizontal category tab strip
  (All - Classic - Birthday - Wedding - Night Out - Graduation - Holiday -
  Corporate; from `TemplateCategory`) > scrolling 2-col grid of template cards.
  Each card = a mini strip rendered via `composeStrip(frames, preset.layout,
THEMES[preset.theme], { watermark:false, cell:~120, filter, sticker, caption })`
  using the chosen demo set + label + `Pro` badge when `preset.pro`.
- **Layout @390x844:** 2 columns, 13px gap. @430x932: 2 columns, larger cards.
  @820x1180: 3 columns. @1180x820: 4 columns. @1440x1100: 4-5 columns, category
  tabs as a left rail optional.
- **Primary:** open a template. **Secondary:** switch category.
- **States:** _Loading previews_ -- skeleton cream cards with a subtle stripe
  until each `composeStrip` resolves. _Empty category_ -- never (catalog is
  static); if a future filter yields none, show "No templates here yet." _Locked
  cards_ -- fully rendered (not blurred) with a `Pro` badge.
- **Copy:** category labels uppercase; card labels = `preset.label`; badge "PRO".
- **Repo mapping:** new screen; reads `STYLE_PRESETS` (extended, see
  ROUND2_TEMPLATE_CATALOG); renders with `composeStrip` at a small `cell`. Demo
  frames from `src/demo/` (`loadSampleFrames`) or the current capture.
- **Acceptance:** previews are the real renderer output (parity with Review), not
  static art; scrolling 30 cards stays smooth (cache rendered canvases by preset
  id + demo set).

## A8. Template detail / preview -- reuse `OverlayScreen`

- **Purpose:** show one template large, rendered from a demo set, and let the
  user start a booth with it or apply it to the current strip.
- **Entry:** tap a gallery card (free). **Exit:** Start Booth -> Camera (preset
  applied); Apply to Current -> Review; close -> Gallery.
- **Hierarchy:** close `IconButton` + title (`preset.label`) > large rendered
  strip preview > meta chips (layout - look - props - FREE) > primary "Start
  Booth" > secondary "Apply to Current Strip" (only when a capture exists).
- **Layout:** preview centered, capped ~200px wide on phone / larger on iPad;
  actions docked bottom.
- **States:** _No current capture_ -- hide "Apply to Current". _Demo-set switch_
  (optional) -- small "Try with another set" control cycling set 1/2/3.
- **Locked Pro:** see A9 (separate spec).
- **Copy:** "START BOOTH", "APPLY TO CURRENT STRIP", chips "2x2 GRID / WARM LOOK
  / SPARKLE PROPS / FREE".
- **Repo mapping:** `applyStylePreset(preset)` (exists) then route to Camera or
  Review; reuse `OverlayScreen` shell.
- **Acceptance:** "Start Booth" applies layout+theme+filter+sticker+caption and
  opens the camera; preview matches the eventual strip.

## A9. Pro locked template preview -- A8 variant

- **Purpose:** make Pro templates **desirable and legible before paying** -- show
  the full preview, never a blur.
- **Entry:** tap a Pro card. **Exit:** Unlock with Pro -> Paywall (A10) with
  context = preset label; "See a free template instead" -> Gallery (Classic).
- **Hierarchy:** same as A8, plus a small lock chip on the preview corner and the
  meta chip "PRO" instead of "FREE"; primary becomes "Unlock with Pro --
  $1.99/mo".
- **Layout:** identical to A8.
- **States:** _Already Pro_ -- this screen never shows (renders A8 with Start
  Booth). _Lapsed Pro_ -- shows locked again.
- **Copy:** "Full preview shown -- you see exactly what you get. 2x6 layout - Glam
  look - Hearts props." Primary "UNLOCK WITH PRO -- $1.99/MO". Secondary "SEE A
  FREE TEMPLATE INSTEAD".
- **Repo mapping:** gate on `isStylePresetAvailable(preset, isPro)`; preview
  always renders; CTA opens paywall with `context: preset.label`.
- **Acceptance:** preview is the real render at full clarity; no purchase
  required to see it; CTA names the template.

## A10. Paywall -- `src/screens/ProScreen.tsx` (NEW) + bottom-sheet variant

- **Purpose:** sell **BoothBop Pro at $1.99/month** on recurring value, not just
  watermark removal.
- **Entry (triggers -- all open the same content):** (1) apply/start a locked Pro
  template [primary]; (2) tap a locked Look/Layout/Props/Caption in the drawer;
  (3) switch export Quality to HD; (4) open Party Mode setup; (5) Settings ->
  Start Pro.
- **Exit:** Start Pro -> StoreKit purchase -> on success dismiss + unlock; Maybe
  Later/x -> back to the trigger; Restore -> restore flow.
- **Hierarchy:** x > "BOOTHBOP PRO" lockup > one-line promise > 6 value rows
  (premium templates / Pro looks & props / watermark-free HD GIF+video / custom
  captions / Party Mode / new templates monthly) > primary "START PRO --
  $1.99/month - cancel anytime" > Restore - Terms - Privacy.
- **Two presentations:** full-screen `ProScreen` (from Settings) and a
  **bottom-sheet** over the dimmed trigger context (from in-flow locks), whose
  headline names the trigger ("Unlock Sweet Sixteen + 5 more Pro templates").
- **Layout @390x844:** value rows in a single scroll column; CTA docked. @430x932
  same. @820x1180: center column max 560px. @1180x820: two columns (value left,
  CTA card right). @1440x1100: centered 560px.
- **States:** _Price loading_ -- show "$1.99/month" placeholder until
  `getProProduct()` returns the localized price, then swap. _Purchasing_ -- CTA
  spinner, disabled. _Failed_ -- inline error "The purchase didn't go through. No
  charge was made." + Try Again. _Already Pro_ -- entry points hide; deep link
  shows a "You're Pro active -- manage in Settings" state. _Restore none_ -- "No
  previous purchase found."
- **Copy (<=80 words, 64 used):** "BoothBop Pro unlocks every premium template,
  Glam & Vintage looks, watermark-free HD GIFs and video, custom captions, and
  Party Mode -- plus new templates every month. Make every strip yours.
  $1.99/month, cancel anytime. Your photos always stay on this device -- Pro never
  changes that."
- **Repo mapping:** new `ProScreen`; extend `src/lib/purchases.ts` to a
  subscription product (`com.boothbop.app.pro.monthly`) -- see tickets. `isPro`
  already gates everything; the trigger just sets `showPro` + `proContext`.
- **Acceptance:** localized price renders; every trigger reaches it; Restore +
  Terms + Privacy present (App Store 3.1.1 / 3.1.2); copy <=80 words.

## A11. My Photos gallery -- `src/screens/GalleryScreen.tsx`

- **Purpose:** browse on-device sessions (IndexedDB), reopen, favorite, delete.
- **Entry:** Home / Camera / Review (My Photos). **Exit:** open a session ->
  Review (reopened); back -> Home.
- **Hierarchy:** `TopBar` ("MY PHOTOS", back) > optional "Favorites" filter >
  grid of session covers (each a strip thumbnail) with title + date + star >
  per-item menu (open / favorite / delete).
- **Layout @390x844:** 2 columns. @430x932: 2. @820x1180: 3. @1180x820: 4.
  @1440x1100: 4-5.
- **States:** _Empty_ -- centered "NO STRIPS YET / Your photo strips live here, on
  this device. Take your first one!" + "TAKE PHOTOS". _Storage-pressure_ -- a
  `Callout tone="info"` "Running low on space -- old strips may be removed by your
  device." _Deleting_ -- confirm `Callout`/dialog. _Loading_ -- skeleton covers.
- **Locked Pro:** none (gallery is free).
- **Copy:** "MY PHOTOS", empty-state above, "TAKE PHOTOS".
- **Repo mapping:** `gallery.ts` (IndexedDB sessions; `SESSION_TITLE_MAX`);
  reopen restores `SessionStyle` via `restoreSessionStyle` (downgrades premium
  styles when `!isPro`).
- **Acceptance:** empty state never shows a blank grid; reopening restores layout
  /theme/look/caption; favorite + delete persist.

## A12. Session detail / zoom preview -- `ZoomableImage` in Review/Gallery

- **Purpose:** inspect a strip full-size, pinch/zoom.
- **Entry:** tap a strip preview in Review or a cover in Gallery. **Exit:** back.
- **Hierarchy:** full-bleed `ZoomableImage` (already used in Review) + close + the
  same Save/Share actions.
- **States:** _Zoomed_ (pan within bounds), _Generating_ (for motion formats).
- **Repo mapping:** reuse `components/ZoomableImage.tsx`.
- **Acceptance:** pinch-zoom bounded; never triggers page scroll
  (`scrollIntoView` is not used anywhere).

## A13. Settings -- `src/screens/SettingsScreen.tsx`

- **Purpose:** Pro entry/restore, capture prefs, auto-save-to-Photos, Party Mode
  setup, legal.
- **Entry:** gear from Home/Camera; autosave tip "Open Settings". **Exit:** back.
- **Hierarchy:** `TopBar` > **Pro card** (top: "BOOTHBOP PRO - $1.99/mo", Start
  Pro, Restore -- or "Pro active - Manage" when subscribed) > CAPTURE
  (countdown, shutter sound `Toggle`) > EXPORT QUALITY (photo/gif/video Low/Std/
  HD; HD gated) > AUTO-SAVE (dest + per-format toggles) > **PARTY MODE (Pro)**
  ("Set up Party Mode ->") > ABOUT/legal.
- **Layout:** single scroll column; iPad/desktop cap at 560px centered.
- **States:** _Pro active_ vs _not_; _HD locked_ (tap -> paywall); _autosave
  permission denied_ -- `Callout` with "Open iOS Settings".
- **Copy:** as above; Pro subtitle "Premium templates, Pro looks, watermark-free
  HD exports, captions, Party Mode & monthly drops."
- **Repo mapping:** extend `SettingsScreen`; Pro row swaps the current
  "$0.99 Remove Watermark" for the subscription card; add Party Mode row.
- **Acceptance:** Restore present; HD toggle gated; Party Mode entry visible only
  as Pro (or opens paywall).

## A14. Import photos -- file picker + `importPhotos` (App)

- **Purpose:** build a strip from 4 existing images.
- **Entry:** Home / (camera-denied) "Import". **Exit:** success -> Review;
  cancel -> Home.
- **Hierarchy:** native multi-file picker (accept images); on selection ->
  `loadImportedFrames` -> Review.
- **States:** _Wrong count_ -- error "Need 4 photos / Pick exactly four images.
  You chose N." + Choose Again. _Decode failure_ -- "Couldn't read that image --
  try a different one." _Success_ -- Review with note "Imported 4 photos."
- **Repo mapping:** `lib/importPhotos.ts` (+ test); `App.importPhotos`.
- **Acceptance:** enforces exactly 4; errors are specific; result is a normal
  editable session (auto-saved to gallery).

---

# B. FUTURE / EVENT SCREENS (specified, NOT in the near-term sprint)

> Near-term ships **Party Mode** only (B-min below). Everything else here is
> explicitly future and must not be mixed into the current build order.

## B-min. Party Mode (NEAR-TERM, the only event work this round)

- **Setup (Settings sub-screen):** pick one template for the night, set a 4-digit
  exit passcode, set auto-reset seconds, Guided-Access reminder, "Start Party
  Mode". **Guest loop:** Camera -> Countdown -> a locked Review (Share + Next only)
  -> auto-reset to a fresh booth after N seconds. **Exit passcode** modal gates
  leaving. No printing, QR, multi-template, backend, or accounts.
- **Repo mapping:** `src/lib/partyMode.ts` (flag + config in localStorage
  `bb.party.*`), `src/screens/PartyExitModal.tsx`, a wrapper that hides nav and
  forces the preset. Reuses Camera/Review.
- **Acceptance:** guests cannot reach Home/Settings/Gallery without the passcode;
  auto-reset returns to capture; chosen template is fixed for the session.

## B-future (DO NOT BUILD YET)

Events dashboard (grouped sessions) - Create-event wizard (6 steps) - Event setup
checklist - Kiosk attract/welcome (branded) - Kiosk guest capture (separate
flow) - Kiosk guest review - Event gallery + cover composites - QR guest sharing

- AirPrint/print setup. Each needs a backend, multi-device sync, hardware, or a
  much larger surface. Specs deferred to a future round.
