# ROUND2_RENDERING_SPECS

Exact rendering behavior for looks, stickers, captions, and previews, so every
export path (strip / GIF / boomerang / video / gallery cover) stays pixel-
consistent. All drawing routes through `drawFrame`/`composeStrip`
(`src/lib/render.ts`, `src/lib/strip.ts`) -- the single source of truth.

Current renderer facts (do not drift from these):

- `STRIP = { cell: 640, gap: 28, footer: 132 }`; everything scales by
  `cell / 640`.
- `drawFrame(ctx, frame, dest, { filter, sticker })` = `ctx.filter = css` ->
  `drawImage` -> `drawOverlay` -> `drawSticker`.
- `FILTERS[k] = { label, css, overlay? }`; `overlay` in `"warm" | "vignette"`.
- `STICKERS` glyphs are **canvas paths** (no PNGs): sparkles, hearts, confetti.
- Footer: `watermark:true` -> brand logo + date (caption ignored today);
  `watermark:false` -> caption (or date only).

---

## T-LOOK. Looks / filters

### Existing (keep exactly)

| key       | label    | tier | css `filter`                                                 | overlay  |
| --------- | -------- | ---- | ------------------------------------------------------------ | -------- |
| `none`    | Original | free | `none`                                                       | --       |
| `mono`    | Mono     | free | `grayscale(1) contrast(1.14)`                                | --       |
| `warm`    | Warm     | free | `sepia(0.28) saturate(1.22) contrast(1.06) brightness(1.03)` | warm     |
| `glam`    | Glam     | pro  | `grayscale(1) contrast(1.28) brightness(1.08)`               | --       |
| `vintage` | Vintage  | pro  | `sepia(0.42) saturate(0.86) contrast(1.12)`                  | vignette |

### New looks (HANDOFF section3) -- add to `FILTERS`, gate Pro ones in `entitlements.ts`

Requires one additive change: extend `FilterDef.overlay` to also accept a flat
tint `{ color: string; opacity: number }` (today it's only `"warm" | "vignette"`).

```ts
export interface FilterDef {
  label: string;
  css: string;
  overlay?: "warm" | "vignette" | { color: string; opacity: number }; // NEW tint
}
```

| key             | label         | tier | css `filter`                                                      | overlay          |
| --------------- | ------------- | ---- | ----------------------------------------------------------------- | ---------------- |
| `soft-flash`    | Soft Flash    | free | `brightness(1.12) contrast(.96) saturate(.95)`                    | `#ffffff` @ 0.08 |
| `warm-film`     | Warm Film     | free | `sepia(.32) saturate(1.25) contrast(1.05) brightness(1.02)`       | `#e8a04a` @ 0.10 |
| `clean-bw`      | Clean B&W     | free | `grayscale(1) contrast(1.08) brightness(1.03)`                    | --               |
| `cool-studio`   | Cool Studio   | free | `saturate(1.05) contrast(1.1) brightness(1.02) hue-rotate(-8deg)` | `#3e7c78` @ 0.08 |
| `glam-booth`    | Glam Booth    | pro  | `grayscale(1) contrast(1.3) brightness(1.12)`                     | `#ffffff` @ 0.06 |
| `vintage-sepia` | Vintage Sepia | pro  | `sepia(.5) saturate(.8) contrast(1.14) brightness(.98)`           | vignette         |
| `high-contrast` | High Contrast | pro  | `contrast(1.32) saturate(1.18) brightness(1.0)`                   | --               |
| `dreamy-pastel` | Dreamy Pastel | pro  | `saturate(.82) contrast(.9) brightness(1.1)`                      | `#f3c9d6` @ 0.12 |
| `night-out`     | Night Out     | pro  | `contrast(1.2) saturate(1.1) brightness(.92)`                     | `#8f3b1e` @ 0.14 |
| `magazine`      | Magazine      | pro  | `grayscale(.3) contrast(1.22) saturate(.9) brightness(1.04)`      | --               |

**Tint overlay draw rule (new branch in `drawOverlay`):**

```ts
} else if (typeof overlay === "object") {
  ctx.save();
  ctx.globalAlpha = overlay.opacity;
  ctx.fillStyle = overlay.color;
  ctx.fillRect(x, y, width, height);   // fill the cell rect AFTER drawImage
  ctx.restore();
}
```

Order is fixed: `drawImage` (with `ctx.filter`) -> overlay tint/vignette ->
sticker. Same for every cell, every export path. `isPremiumFilter` must include
all Pro keys above.

**Canvas-filter fallback:** `ctx.filter` is wrapped in try/catch already; on
contexts without filter support the look degrades to the overlay only -- keep that
behavior; never block export.

---

## T-STK. Sticker packs

Group `StickerKey`s into packs (HANDOFF section4). Keep every glyph a **canvas path**
(extend the existing `drawSparkle`/`drawHeart`/`drawConfetti` family). New glyphs
to author: balloon, star, dot, flute, bell, ring, cap, rosette, hashtag,
snowflake, gift.

| pack                      | tier | glyphs                                       | placement              |
| ------------------------- | ---- | -------------------------------------------- | ---------------------- |
| `sparkles` (Sparkle)      | free | star x3 sizes, dot, confetti                 | scatter, upper third   |
| `birthday` (Birthday)     | free | balloon, confetti, star, dot, flute, bell    | top corners + top edge |
| `hearts` (Hearts)         | pro  | heart x3 sizes, dot                          | corners, mirrored      |
| `party` (Party)           | pro  | confetti, flute, star, hashtag, balloon, dot | top + bottom bands     |
| `wedding` (Wedding)       | pro  | heart, ring, dot, flute, star, bell          | subtle corners         |
| `graduation` (Graduation) | pro  | cap, star, rosette, hashtag, dot, confetti   | bottom corners         |
| `holiday` (Holiday)       | pro  | snowflake, gift, bell, star, dot             | top edge + corners     |
| `corporate` (Corporate)   | pro  | rosette, hashtag, star, dot, ring            | footer band only       |

- Glyph fills use the brand palette only: ink `#111`, orange `#e85a1a`, mustard
  `#d9a441`, teal `#3e7c78`, rust `#8f3b1e`, cream `#f6e7cf`. Every glyph gets a
  thin ink stroke (`lineWidth = max(1.5, size*0.1)`) so it reads on any photo.
- Scale: `scale = min(rect.width, rect.height) / 640` (existing); glyph base
  sizes 18-40px x scale.

### T-STK-FACE. Face-safe placement (geometry only, NO face detection)

Stickers must never cover the subject. Rule, applied per cell:

- Define a **protected center box** = the central **60%** of the cell:
  `x in [0.20w, 0.80w]`, `y in [0.20h, 0.80h]`. No glyph centroid or bounding box
  may enter it.
- Anchor zones are the four **corners** and the top/bottom **edge bands** (outer
  20% on each axis). Each pack declares which zones it uses (table above).
- For grid layouts (`2x2`/`4x6`/`story` 2-col) the protected box is per-cell, so
  a glyph in one cell's corner never lands on a neighbor's face.
- For `2x6` (tall single column) the bands are the top/bottom 12% of each cell.
- Deterministic placement (seeded by cell index) so re-renders match exactly --
  no `Math.random()` in the export path.

Acceptance: across all 12 demo frames (3 sets x 4) and all packs, no glyph
overlaps the central 60% box; verify with a unit test that checks glyph anchors
against the box.

---

## T-CAP. Captions

### Behavior

- **Baked preset caption** (`preset.caption`): part of the template; renders for
  **all tiers**. `{brand}` is replaced by the Settings brand/event name (empty ->
  drop the token and fall back to the theme caption "BoothBop").
- **Custom caption** (user-typed, **Pro**): overrides the preset caption when
  `isPro` and non-empty (`bb.pro.caption`, already wired through
  `buildSessionStyle`).

### Renderer change (names the exact work the catalog depends on)

Today `composeStrip`'s `watermark:true` branch draws **logo + date** and ignores
`caption`. To show baked captions on free strips:

- In the `watermark && logo` branch, after drawing the logo, if
  `caption?.trim()`, draw a caption line **below the logo** at
  `ly + logoH + 16*scale` using `drawCaption(...)`, and push the date to
  `ly + logoH + 52*scale`. If footer height is tight for a layout, scale the
  caption font to fit (see limits below). This is the only renderer change the
  template catalog requires.
- The `watermark:false` branch already draws caption + date -- unchanged.

### Limits / typography

- **Max length:** 24 characters (enforce in the Pro caption input and truncate
  preset captions defensively). Over-length -> ellipsis at 24.
- **Font:** `drawCaption` uses `400 {72*scale}px 'Bebas Neue', 'Oswald', 'Arial
Narrow'` uppercase, letter-spacing `3*scale`. For captions > 14 chars, step the
  size down to `{56*scale}px` so it fits the footer width minus 2xgap; never wrap
  to two lines.
- **Color:** `theme.text` (already contrast-correct per theme).
- **Truncation rule:** measure with `ctx.measureText`; if width > `stripWidth -
2*gap`, reduce font in 4px steps to a floor of `40*scale`, then ellipsize.

---

## T-PREV. Thumbnail / preview rules

- Gallery cards and detail previews render via the **same** `composeStrip`, with
  `{ watermark:false, cell: 120 (card) / 200 (detail), filter, sticker, caption }`
  -- i.e. exactly the Pro export path, so "what you see is what you get".
- **Cache** rendered canvases by `presetId + demoSetId + cell` to keep a 30-card
  grid smooth; invalidate on `isPro` change only if the card's footer differs
  (it doesn't for previews, since previews are always `watermark:false`).
- Demo frames come from `loadSampleFrames(setNum, cell)` (`src/lib/demo.ts`) or
  the current capture; never from uploaded images (none exist) -- uploaded
  template art is future work and must not be referenced.
- Locked Pro previews render **identically** (full clarity, no blur); the lock is
  a UI chip, not a render effect.

---

## T-PARITY. Export parity across strip / GIF / video / cover

All four already share `drawFrame`, so the look + sticker treatment matches.
Keep it that way:

| Export          | Path                                                | Footer                                        | Watermark                       | Size source                              |
| --------------- | --------------------------------------------------- | --------------------------------------------- | ------------------------------- | ---------------------------------------- |
| Strip (PNG)     | `composeStrip`                                      | logo+caption+date (free) / caption+date (Pro) | brand logo always on strip      | `PHOTO_CAPTURE[quality.photo]` -> `cell` |
| GIF / Boomerang | `encodeGif` -> `drawFrame` per frame                | n/a (per-frame)                               | corner watermark unless `isPro` | `GIF_SIZE[quality.gif]`                  |
| Video           | `encodeVideo`/`encodeVideoNative` -> `drawFrame`    | n/a                                           | corner watermark unless `isPro` | `VIDEO_PROFILE[quality.video].size`      |
| Gallery cover   | `composeStrip(..., { watermark:false, cell:~160 })` | caption+date                                  | none (preview)                  | fixed 160                                |

Rules:

- The **strip footer brand logo is permanent** (it's the strip's identity, not
  the removable watermark) -- Pro removes only the **GIF/video corner watermark**,
  per IAP.md. Do not strip the footer logo for Pro.
- `filter` + `sticker` are passed to **every** path from the same
  `SessionStyle`; never compute a look in one path only.
- Boomerang uses `motionSequence(frames, "boomerang")` -- same `drawFrame`, just a
  rebuilt frame order.
- Quality only changes pixel size/bitrate (`settings.ts` tables), never the
  visual treatment -- so HD and Standard look identical apart from sharpness.

Acceptance: a single `SessionStyle` (layout/theme/look/props/caption) produces a
strip, GIF, boomerang, video, and gallery cover whose look + stickers + caption
match; a visual diff of the same frame across paths differs only by watermark
presence and resolution.
