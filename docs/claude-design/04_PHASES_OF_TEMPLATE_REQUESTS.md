# Phases Of Template Requests

This file describes media/template design work for Claude Design. Templates
should be designed so engineers can convert them into BoothBop's rendering
system without rewriting the app.

## Current Template System

Existing code:

- `src/lib/templates.ts`
- `src/lib/strip.ts`
- `src/lib/render.ts`

Current style preset fields:

```ts
interface StylePreset {
  id: string;
  label: string;
  pro: boolean;
  layout: Layout;
  theme: keyof typeof THEMES;
  filter: FilterKey;
  sticker: StickerKey;
}
```

Current layouts:

- `4x1`: classic vertical strip.
- `2x2`: square grid.
- `2x6`: print-style vertical strip.
- `4x6`: print/social card.
- `story`: 9:16 story output.

Current themes:

- `classic`
- `rust`
- `teal`
- `mustard`
- `olive`
- `carbon`

Current filters:

- `none`
- `mono`
- `warm`
- `glam`
- `vintage`

Current stickers:

- `none`
- `sparkles`
- `hearts`
- `party`

Claude Design should start by using these fields. If a design needs a future
schema, propose it separately and keep it implementable.

## Template Deliverable Format

For each template, provide:

```text
Name:
Category:
Free or Pro:
Primary use case:
Output format:
Layout:
Theme/color palette:
Photo treatment/filter:
Sticker/graphic direction:
Footer/caption direction:
Optional text:
Thumbnail description:
Implementation notes:
```

If proposing TypeScript-like metadata, use this shape:

```ts
{
  id: "birthday-spark-strip",
  label: "Birthday Spark",
  category: "birthday",
  pro: false,
  layout: "4x1",
  theme: "mustard",
  filter: "warm",
  sticker: "sparkles",
  caption: "Birthday Bash",
}
```

Do not rely on gradients, blur/glow, glass effects, or large photographic
background assets unless explicitly called out as a future uploaded-background
feature.

## Phase 1: Current-Engine Template Pack

Goal: create a template gallery using the current render engine only.

Constraints:

- Use existing layouts/themes/filters/stickers.
- No uploaded backgrounds.
- No arbitrary layers.
- No custom fonts yet.
- Captions can be specified but may need implementation before they appear in
  the Review drawer.

Request:

Design 30 templates:

- 5 Classic/Everyday.
- 5 Birthday.
- 5 Wedding.
- 5 Night Out.
- 4 Graduation.
- 3 Holiday.
- 3 Corporate/Brand.

For each category:

- At least 2 free templates.
- At least 2 Pro templates if the category has 5 templates.
- Include a mix of 4x1, 2x2, 2x6, 4x6, and story.
- Keep the 4x1 classic strip as the most important default.

Design quality bar:

- Template names should be short and App-Store-friendly.
- Free templates should look good enough to share.
- Pro templates should feel visibly more styled, not just locked arbitrarily.
- Avoid novelty clutter that covers faces.

## Phase 2: Expanded Looks and Sticker Packs

Goal: make BoothBop feel closer to Mini Photobooth's graphic depth while still
staying lightweight.

Request 1: New filter/look specs

Design 10 looks:

- 4 free.
- 6 Pro.

For each look:

- Name.
- Visual intent.
- Suggested CSS canvas filter values.
- Optional overlay color/opacity.
- Whether it should affect strip, GIF, video, and gallery covers.

Possible directions:

- Soft Flash.
- Warm Film.
- Clean B&W.
- Cool Studio.
- Glam Booth.
- Vintage Sepia.
- High Contrast.
- Dreamy Pastel.
- Night Out.
- Magazine.

Request 2: New sticker/graphic packs

Design 8 sticker packs:

- Birthday.
- Wedding.
- Sparkle.
- Hearts.
- Party.
- Graduation.
- Holiday.
- Corporate badges.

For each pack:

- Pack name.
- Free or Pro.
- 6 to 12 sticker ideas.
- Approximate placement rules.
- Face-safe constraints.
- Whether the stickers should be canvas-drawn, SVG, or PNG.

Prefer simple vector/canvas shapes for bundle size.

## Phase 3: Print-Ready Template Pack

Goal: catch Mini's print/event output expectations.

Request:

Design print-ready templates for:

- 2x6 strip.
- Double 2x6 on 4x6 paper.
- 4x6 card.
- Full bleed 4x6 card.
- Classic 4x1 phone strip.

For each print template:

- Paper target.
- Output pixel ratio.
- Safe area.
- Bleed expectation.
- Cut-line needs.
- Footer/date placement.
- Logo/caption placement.
- Example event category.

Implementation notes:

- Existing code has `2x6` and `4x6`.
- Double 2x6 needs a new layout/export mode.
- Full bleed needs explicit safe-area handling.

## Phase 4: Event Template Sets

Goal: support event mode with multiple template choices.

Request:

Design 6 event packs:

1. Birthday party.
2. Wedding reception.
3. Graduation.
4. Holiday party.
5. Corporate mixer.
6. Night out.

Each event pack should include:

- Event welcome screen concept.
- 3 selectable guest templates.
- Suggested default capture delay.
- Suggested autosave settings.
- Suggested share/print end screen.
- Optional Pro upsell angle.

Keep event packs usable without a backend.

## Phase 5: Future Layer-Based Template Schema

Goal: prepare for Mini-style template editing without overbuilding now.

Claude Design should propose a future template schema with these layer types:

- Background.
- Photo slot.
- Text.
- Shape.
- Sticker/graphic.
- Uploaded image.
- Footer/date/logo.

For each layer type, define:

- Editable properties.
- Default controls.
- Mobile editor UI.
- iPad editor UI.
- Pro/free boundaries.

Suggested future schema sketch:

```ts
interface MediaTemplate {
  id: string;
  label: string;
  category: string;
  pro: boolean;
  output: "strip" | "grid" | "gif" | "boomerang" | "video" | "story" | "print";
  layout: Layout;
  capture: {
    shots: number;
    delay: number;
  };
  layers: TemplateLayer[];
}
```

This is not implemented today. It is a design target for future engineering.

## Phase 6: App Store Screenshot Media Templates

Goal: use the staged demo photos to produce screenshot-ready output concepts.

Demo photos:

- `src/demo/set1-1.jpg` to `src/demo/set1-4.jpg`
- `src/demo/set2-1.jpg` to `src/demo/set2-4.jpg`
- `src/demo/set3-1.jpg` to `src/demo/set3-4.jpg`

Request:

Design screenshot media concepts for:

1. Classic strip hero.
2. Birthday template strip.
3. Wedding 2x6.
4. Night Out GIF/boomerang.
5. Story format.
6. My Photos gallery.
7. Event mode preview.

For each screenshot concept:

- Which demo set to use.
- Which output format.
- Which template.
- What App Store caption should say.
- Whether the screenshot is phone portrait, phone landscape, or iPad landscape.

Avoid claims for features that are not built yet unless clearly labeled as a
future concept.

## Acceptance Criteria For Template Designs

Each template request should return enough detail that an engineer can:

1. Add or modify data in `src/lib/templates.ts`.
2. Add any needed colors/themes/look definitions.
3. Add new sticker definitions or asset requests.
4. Render a preview with the existing demo photos.
5. Decide whether the template is free or Pro.
6. Know which feature gaps must be implemented before the design can ship.
