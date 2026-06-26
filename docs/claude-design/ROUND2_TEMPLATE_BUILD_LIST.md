# ROUND2_TEMPLATE_BUILD_LIST

Narrows the 30-template pack (HANDOFF.md section2) into an **implementation-first**
top-12 plus an 18-item backlog. The 12 are chosen for the strongest _free
experience + App Store story + Pro subscription value_ -- not even category
distribution. Build-ready constants: **`ROUND2_TEMPLATE_CATALOG.ts`**. Rendering
rules: **`ROUND2_RENDERING_SPECS.md`**.

## Free / Pro logic used

Gating is mechanical (`src/lib/entitlements.ts`): a preset is **Pro** if it uses
any premium **layout** (`2x6`/`4x6`/`story`), premium **look** (`glam`/`vintage`

- the new Pro looks), premium **sticker** (`hearts`/`party`), or a baked custom
  caption that overrides the brand footer. Free presets stay on `4x1`/`2x2`,
  `none`/`mono`/`warm` looks, `none`/`sparkles` props. **Free templates may carry a
  baked caption** (it's part of the design); only _user-entered custom captions_
  are Pro (renderer note T-CAP in RENDERING_SPECS).

---

## Top 12 -- build first

### Free (6) -- the everyday + one hero per top occasion

| #   | id               | Label          | Category | Layout | Theme           | Look | Props    | Caption         | Preview demo set  |
| --- | ---------------- | -------------- | -------- | ------ | --------------- | ---- | -------- | --------------- | ----------------- |
| 1   | `classic`        | Classic        | classic  | 4x1    | classic (cream) | none | none     | --              | Set 3 (Friends)   |
| 2   | `noir`           | Noir           | classic  | 4x1    | carbon          | mono | none     | --              | Set 2 (Night Out) |
| 3   | `foursquare`     | Foursquare     | classic  | 2x2    | classic         | none | none     | --              | Set 3             |
| 4   | `birthday-spark` | Birthday Spark | birthday | 4x1    | mustard         | warm | sparkles | "Birthday Bash" | Set 1 (Birthday)  |
| 5   | `just-married`   | Just Married   | wedding  | 2x2    | classic         | warm | sparkles | "Just Married"  | Set 1             |
| 6   | `neon-noir`      | Neon Noir      | nightout | 4x1    | carbon          | mono | sparkles | "After Dark"    | Set 2             |

### Pro (6) -- the premium-layout + glam/vintage value story

| #   | id              | Label         | Category  | Layout | Theme   | Look    | Props    | Caption       | Preview demo set |
| --- | --------------- | ------------- | --------- | ------ | ------- | ------- | -------- | ------------- | ---------------- |
| 7   | `sweet-sixteen` | Sweet Sixteen | birthday  | 2x6    | teal    | glam    | hearts   | "Sweet 16"    | Set 1            |
| 8   | `vows`          | Vows          | wedding   | 2x6    | classic | vintage | hearts   | "Vows"        | Set 1            |
| 9   | `party-story`   | Party Story   | birthday  | story  | carbon  | glam    | party    | "Let's Party" | Set 1            |
| 10  | `midnight`      | Midnight      | nightout  | story  | carbon  | vintage | sparkles | "Midnight"    | Set 2            |
| 11  | `golden-hour`   | Golden Hour   | holiday   | 4x6    | mustard | glam    | sparkles | "Cheers"      | Set 3            |
| 12  | `keynote`       | Keynote       | corporate | 4x6    | classic | mono    | none     | "{brand}"     | Set 3            |

### Why each made the top 12

1. **Classic** -- the default; the control every other preview is judged against;
   the App Store hero strip.
2. **Noir** -- proves the mono look + carbon theme instantly; high-contrast,
   screenshots beautifully; zero Pro friction.
3. **Foursquare** -- the only free 2x2; teaches the grid layout that Pro 4x6/story
   build on.
4. **Birthday Spark** -- birthday is the #1 booth occasion; carries a baked
   caption to demo the caption surface (and tease Pro custom captions).
5. **Just Married** -- wedding is the #2 occasion + highest willingness-to-pay;
   the free version seeds desire for the Pro `vows`.
6. **Neon Noir** -- covers "night out / party" with only free looks; the most
   shareable free strip -> viral loop.
7. **Sweet Sixteen** -- the flagship Pro upsell from Birthday Spark: premium 2x6 +
   glam + hearts; the paywall's named example.
8. **Vows** -- premium wedding; vintage look shows a _different_ Pro look than
   glam, widening the perceived Pro value.
9. **Party Story** -- the only Pro `story` (9:16) -- the format people post to IG
   Stories; pure recurring-value bait.
10. **Midnight** -- second `story`, vintage+carbon, proves the look pack isn't a
    one-trick pony; strongest "night out" Pro screenshot.
11. **Golden Hour** -- `4x6` holiday; seasonal templates are the natural home for
    "new templates every month"; justifies the subscription cadence.
12. **Keynote** -- `4x6` corporate with `{brand}` custom caption; opens the
    events/corporate wedge and demos the Pro custom-caption feature directly.

This set ships **3 premium layouts (2x6, 4x6, story)**, **2 Pro looks (glam,
vintage)**, **2 Pro props (hearts, party)**, and the **custom-caption** surface --
i.e. every lever the $1.99/mo paywall promises, each with a concrete template.

### Per-template build detail

For all 12:

- **Layout** -> `stripGeometry(layout)` (existing).
- **Theme** -> `THEMES[theme]` (existing 6).
- **Filter/Look** -> `FILTERS[look]` CSS (RENDERING_SPECS); Pro looks gated.
- **Sticker pack** -> `STICKERS[props]` canvas glyphs; face-safe placement
  (RENDERING_SPECS T-STK).
- **Caption behavior** -> baked `preset.caption` renders in the footer for all
  tiers (renderer task T-CAP); `{brand}` token (Keynote) is replaced by the
  Settings brand/event name; an active **custom** caption (Pro) overrides it.
- **Preview demo-set choice** -> as tabled; cards render via `composeStrip(...,
{ watermark:false, cell:120 })`, cached by `presetId + demoSet`.
- **Export behavior** -> free presets export with watermark on GIF/video + brand
  footer on the strip; Pro presets (when `isPro`) export watermark-free + caption
  footer; HD only when the user's quality is HD (Pro).
- **Acceptance (per template):** the gallery card, the detail preview, and the
  final export are pixel-consistent (same renderer path); Pro presets show a full
  unblurred preview before purchase; applying a preset sets layout+theme+look+
  props+caption in one action (`applyStylePreset`).

---

## Remaining 18 -- backlog (ship after the top 12)

Keep as constants in `ROUND2_TEMPLATE_CATALOG.ts` (`TEMPLATE_BACKLOG`), behind
the same gallery, added category-by-category.

| id             | Label        | Category   | Layout | Look    | Props    | Tier |
| -------------- | ------------ | ---------- | ------ | ------- | -------- | ---- |
| `goldenrod`    | Goldenrod    | classic    | 4x1    | warm    | none     | Free |
| `sunday-best`  | Sunday Best  | classic    | 2x6    | vintage | none     | Pro  |
| `confetti-pop` | Confetti Pop | birthday   | 2x2    | warm    | party    | Pro  |
| `make-a-wish`  | Make a Wish  | birthday   | 4x1    | glam    | sparkles | Pro  |
| `forever`      | Forever      | wedding    | 2x2    | warm    | sparkles | Free |
| `reception`    | Reception    | wedding    | 4x6    | warm    | hearts   | Pro  |
| `eternal`      | Eternal      | wedding    | story  | glam    | hearts   | Pro  |
| `after-hours`  | After Hours  | nightout   | 2x2    | mono    | none     | Free |
| `disco`        | Disco        | nightout   | 4x1    | glam    | party    | Pro  |
| `vip`          | VIP          | nightout   | 2x6    | glam    | sparkles | Pro  |
| `class-of-26`  | Class Of '26 | graduation | 4x1    | warm    | none     | Free |
| `tassel`       | Tassel       | graduation | 2x2    | vintage | sparkles | Pro  |
| `cum-laude`    | Cum Laude    | graduation | 2x6    | mono    | none     | Pro  |
| `we-did-it`    | We Did It    | graduation | story  | glam    | sparkles | Pro  |
| `cocoa-cozy`   | Cocoa & Cozy | holiday    | 4x1    | warm    | none     | Free |
| `frostbite`    | Frostbite    | holiday    | 2x2    | mono    | sparkles | Free |
| `boardroom`    | Boardroom    | corporate  | 4x1    | mono    | none     | Free |
| `mixer`        | Mixer        | corporate  | 2x2    | none    | none     | Free |

Backlog cadence supports the "new templates every month" Pro promise: release in
themed drops (e.g. **Wedding Season**, **Grad '26**, **Holiday**), 3-5 at a time.

## Free/Pro split summary

- **Top 12:** 6 free / 6 pro.
- **Full 30:** 13 free / 17 pro (free always covers >=1 template in every category
  except -- by design -- none is locked behind a category; corporate & holiday lean
  free to drive adoption, weddings/birthdays lean Pro where willingness-to-pay is
  highest).
