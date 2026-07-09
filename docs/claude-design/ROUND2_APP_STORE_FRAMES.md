# ROUND2_APP_STORE_FRAMES

The first **honest** App Store screenshot set. Six 6.9" iPhone frames
(`1290x2796`), built from `src/demo/` via the `DEMO`/`VITE_DEMO=1` sample loader
(`loadSampleFrames`) -- no staged photography, no implied features. Export to
`fastlane/screenshots/`. Status is labeled per frame: **Shipped** (in the current
build), **Near-term** (this Round 2 sprint), **Future concept** (must be visually
labeled as a concept on the frame).

Rule: nothing in a frame may imply a feature is available unless it is Shipped or
Near-term, and event/kiosk content is **always** labeled a concept.

---

## Frame 1 -- "Your phone is the photo booth." - Shipped

- **Feature shown:** core booth -> the hero photostrip (Classic, 4x1, cream).
- **Status:** Shipped.
- **Source demo set:** Set 3 (Friends).
- **Device frame:** iPhone 6.9" portrait, `1290x2796`.
- **Required app state:** Review collapsed, strip format, classic theme, logo
  footer + date.
- **Assets:** `set3-1..4.jpg`, `logo-wide.png`. Caption band top, Bebas Neue on
  cream.

## Frame 2 -- "Four poses. One strip. No account, ever." - Shipped

- **Feature shown:** the capture loop + local-first privacy promise.
- **Status:** Shipped.
- **Source demo set:** Set 1 (Birthday) mid-countdown ("3").
- **Device frame:** 6.9" portrait.
- **Required app state:** Camera/countdown with the 4-cell progress row, one cell
  filled.
- **Assets:** `set1-*`, countdown numeral overlay. Sub-caption "Private -
  on-device".

## Frame 3 -- "A look for every occasion." - Near-term

- **Feature shown:** the Template Gallery (category tabs + rendered cards).
- **Status:** Near-term (N3).
- **Source demo set:** mixed -- cards rendered from Sets 1-3.
- **Device frame:** 6.9" portrait.
- **Required app state:** Gallery, "All" tab, showing Classic / Noir / Birthday
  Spark / Sweet Sixteen (PRO badge visible on the Pro card -- honest).
- **Assets:** rendered `composeStrip` card canvases; caption band.

## Frame 4 -- "Make it move." - Shipped

- **Feature shown:** GIF / Boomerang export.
- **Status:** Shipped.
- **Source demo set:** Set 2 (Night Out).
- **Device frame:** 6.9" portrait.
- **Required app state:** Review, GIF format selected, preview mid-loop (show 2-up
  motion blur or a "GIF" chip -- do not fake a video player).
- **Assets:** `set2-*`; a static representative frame + "GIF" chip.

## Frame 5 -- "Keep them all. On your phone." - Shipped

- **Feature shown:** My Photos on-device gallery.
- **Status:** Shipped.
- **Source demo set:** covers from Sets 1-3.
- **Device frame:** 6.9" portrait.
- **Required app state:** Gallery grid with 4-6 session covers + titles/dates +
  one favorited.
- **Assets:** rendered strip covers; star glyph.

## Frame 6 -- "Go Pro: premium templates, HD, no watermark." - Near-term

- **Feature shown:** BoothBop Pro value (premium templates + watermark-free HD).
- **Status:** Near-term (P1-P4).
- **Source demo set:** Set 1 (a Pro template, e.g. Sweet Sixteen 2x6, glam).
- **Device frame:** 6.9" portrait.
- **Required app state:** Pro template detail or paywall value list; price shown
  as "$1.99/month".
- **Assets:** Pro strip render; lock/\* glyphs. **Must** read "$1.99/month - cancel
  anytime" to match the live paywall.

---

## Optional 7th frame (only if the set has room) -- Party Mode - Future concept

- **Feature shown:** "Hand the phone around" Party Mode.
- **Status:** **Future concept -- must be labeled** "Coming soon" on the frame.
- **Source demo set:** Set 2.
- **Required app state:** Party Mode guest review (Share + Next, auto-reset).
- **Note:** never include in the first submission unless E1 actually ships; if E1
  ships it becomes Near-term and the label is dropped.

---

## Production notes

- **Order on the listing:** 1 (hook) -> 3 (templates) -> 6 (Pro) -> 4 (motion) ->
  5 (gallery) -> 2 (privacy). Leads with the strongest occasion + monetization
  story while keeping privacy visible.
- **Type:** Bebas Neue caption bands, Oswald sub-captions, cream `#f6e7cf` / ink
  `#111`; orange `#e85a1a` only for one accent per frame. No gradients/glass.
- **Honesty gates:** Frames 3 & 6 ship only once N3 / P-series are in the build;
  until then submit 1, 2, 4, 5 (all Shipped) and add 3 & 6 with the feature
  release. Event content never appears un-labeled.
- **Localization:** captions live in `fastlane/metadata/<locale>/`; the price
  string uses the localized StoreKit price at runtime in-app (the screenshot can
  hardcode "$1.99/month" for the US listing).
