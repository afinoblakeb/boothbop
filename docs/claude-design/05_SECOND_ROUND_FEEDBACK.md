# Claude Design Round 2 Feedback

## Source Reviewed

- Returned packet: `/Users/afinoblake/Downloads/Markdown instructions attached.zip`
- Main returned artifacts:
  - `BoothBop Phase 1.dc.html`
  - `HANDOFF.md`
  - demo photo and logo assets
  - uploaded copies of the original BoothBop design brief files

## Overall Read

The first pass is useful and directionally strong. It understood the BoothBop
brand, used real demo photos, created a broad canvas for the current flow,
proposed a 30-template metadata pack, sketched event mode, and showed App Store
frame concepts that feel close to the product.

The next pass needs to be much harder-edged. We need fewer inspirational
concepts and more implementation-grade decisions: exact screen specs, exact
states, exact build order, exact template render rules, and pricing that matches
the product strategy. The output should let an engineer implement without
guessing.

## What To Keep

1. Keep the retro booth identity: cream paper, black ink, orange accent, chunky
   type, physical-photo energy, and real demo-photo previews.
2. Keep the current app flow as the first-class product: shoot, review, edit,
   save/share, My Photos.
3. Keep templates as the biggest near-term growth surface.
4. Keep the idea of a category-driven template gallery with rendered live
   previews.
5. Keep event mode as a Pro value path, but separate near-term from future.
6. Keep App Store frames grounded in real shipped or clearly labeled near-term
   features.
7. Keep the local-first privacy position. Do not introduce accounts, backend
   sync, uploads, or cloud galleries.

## What Must Improve

1. The output is too broad. It includes core flow, templates, event mode, kiosk,
   paywall, App Store frames, looks, and stickers, but it does not rank them
   aggressively enough for the next implementation sprint.
2. Screen specs are not precise enough. We need dimensions, hierarchy,
   interaction states, component mapping, collapsed/expanded states, and exact
   copy.
3. The template pack is helpful but still too metadata-only. We need a buildable
   top-12 set with exact frame behavior, captions, filters, stickers, free/pro
   gating, and acceptance criteria.
4. The pricing assumption is wrong for the current strategy. Do not default to a
   `$0.99` non-consumable. The current goal is to make Pro worth `$1.99/month`.
   If a one-time fallback is proposed, label it as a fallback and explain the
   tradeoff.
5. The paywall needs to sell recurring value, not just "remove watermark."
   Recurring value should come from premium templates, pro looks, event mode,
   high-quality exports, custom captions, watermark removal, and future content
   drops.
6. Event mode is promising but too large. Define a minimal event mode that can
   ship first without printing, QR codes, backend, or account features.
7. The design needs more unhappy paths: permissions denied, empty gallery,
   failed import, GIF/video generating, share fallback, purchase failed, restore
   success, locked Pro previews, and event exit/passcode failure.
8. The current Review direction is right, but needs a tighter one-screen rule:
   strip preview, one Edit button, Save/Share button, and a drawer that holds all
   photo tweaks without requiring scrolling when collapsed.
9. The output needs to respect the existing repo implementation more tightly:
   React + TypeScript, existing `src/ui` primitives, existing screen separation,
   pure logic in `src/lib`, base-path-relative assets, and canvas-rendered
   templates.
10. The design should explicitly say what not to build now. That is as important
    as the feature list.

## Non-Negotiables For Round 2

- Mobile-first app UI. The primary target is iPhone portrait.
- Support these reference sizes:
  - iPhone compact: `390x844`
  - iPhone large: `430x932`
  - iPad portrait: `820x1180`
  - iPad kiosk landscape: `1180x820`
  - Desktop preview: `1440x1100`
- Current default output is a classic `1x4` photostrip.
- Collapsed Review screen must fit without vertical scrolling on normal iPhone
  viewports.
- The Edit drawer can scroll, but the main actions must remain easy to reach.
- No backend, no accounts, no remote storage, no cloud gallery.
- All template previews must be generated from current local demo frames or
  current captured frames.
- Do not rely on uploaded template images unless they are explicitly listed as
  future work.
- App UI should stay restrained and buildable. App Store frames can be more
  expressive, but the product screens should not become marketing posters.
- Avoid glassmorphism, heavy gradients, decorative blobs, and ambiguous visual
  effects.
- Use existing BoothBop palette and typography unless a specific exception is
  justified.
- Locked Pro items must still preview clearly. The user should understand what
  they get before paying.
- Every screen must have accessibility notes: hit targets, contrast risks,
  readable labels, and non-color-only state.

## Round 2 Product Push

The goal is to make BoothBop feel worth `$1.99/month` as soon as possible. The
design should answer:

1. What is the smallest paid tier that feels obviously worth subscribing to?
2. Which paid features create recurring value instead of a one-time unlock?
3. Which features should stay free so the app remains useful and shareable?
4. What should the first paywall say, and from which moments should it appear?
5. What needs to ship before we can honestly market Pro?
6. What is the exact build sequence for maximum visible impact?

Treat `$1.99/month` Pro as the primary target. A one-time purchase can be
included only as an alternate pricing model with explicit pros, cons, and scope
changes.

## Round 2 Deliverables Required

### 1. `ROUND2_SCREEN_SPECS.md`

Create implementation-ready specs for every near-term screen. For each screen,
include:

- Purpose
- Entry points
- Exit points
- Component hierarchy
- Layout at `390x844`, `430x932`, `820x1180`, and `1440x1100`
- Primary action
- Secondary actions
- Empty/loading/error states
- Locked Pro states
- Exact user-facing copy
- File mapping to the current repo
- Acceptance criteria

Near-term screens to specify:

- Home / Idle
- Camera preview
- Countdown / capture
- Review collapsed
- Review edit drawer
- Format picker inside Review
- Template gallery
- Template detail / preview
- Pro locked template preview
- Paywall
- My Photos gallery
- Session detail / zoom preview
- Settings
- Import photos

Future/event screens to specify separately:

- Events dashboard
- Create event wizard
- Event setup checklist
- Kiosk attract / welcome
- Kiosk guest capture
- Kiosk guest review
- Exit passcode
- Event gallery
- Print setup

Do not mix near-term screens and future screens in one priority bucket.

### 2. `ROUND2_TEMPLATE_BUILD_LIST.md`

Narrow the 30-template catalog into an implementation-first list.

Required sections:

- Top 12 templates to build first
- Why each one made the top 12
- Free/pro split
- Category
- Layout
- Theme
- Filter
- Sticker pack
- Caption behavior
- Preview demo-set choice
- Export behavior
- Acceptance criteria
- Remaining 18-template backlog

The top 12 should cover the strongest App Store and subscription value story,
not just every category evenly.

### 3. `ROUND2_TEMPLATE_CATALOG.ts`

Provide build-ready TypeScript, not pseudocode.

Requirements:

- Match existing repo style.
- Extend the current `StylePreset` model only where necessary.
- Include `TemplateCategory`.
- Include the top 12 templates as real constants.
- Include the remaining templates as backlog constants or commented table data.
- Mark Pro gates explicitly.
- Do not include fields that require a renderer we do not have.
- If a field requires new renderer work, name the exact renderer change.

### 4. `ROUND2_RENDERING_SPECS.md`

Define exact rendering behavior for looks, stickers, captions, and previews.

Include:

- `FilterDef` additions, if any
- Exact CSS filter values
- Canvas overlay behavior
- Sticker glyph list
- Sticker placement rules
- Face-safe rules using simple geometry, not face detection
- Caption max length, truncation, and font behavior
- Thumbnail preview rules
- Export preview parity rules across strip, GIF, video, and gallery covers

### 5. `ROUND2_IMPLEMENTATION_TICKETS.md`

Turn the design into a build plan.

For each ticket, include:

- Goal
- Files touched
- User-visible behavior
- Test plan
- Risk
- Dependencies
- Estimated size: S, M, L, XL

Group tickets into:

- Must ship now
- Pro value
- App Store polish
- Event mode later
- Do not build yet

### 6. `ROUND2_APP_STORE_FRAMES.md`

Refine the App Store screenshot plan.

For each screenshot:

- Caption
- Feature shown
- Whether it is shipped, near-term, or future concept
- Source demo photo set
- Device frame target
- Required app state
- Assets needed

Do not imply future/event features are shipped unless they actually are.

## Specific Decisions To Force In Round 2

Answer these directly. Do not leave them as options.

1. Should the Templates entry point live on Home, Review, both, or somewhere
   else?
2. What exactly appears on the Review screen before the Edit drawer opens?
3. Which controls move into the Edit drawer, and in what order?
4. Should format selection be visible when collapsed, or inside the drawer?
5. What are the first 12 templates to implement?
6. Which of those 12 are free?
7. Which Pro features justify `$1.99/month` on day one?
8. What is the first paywall trigger?
9. What does the paywall say in 80 words or fewer?
10. What is the minimum event-mode feature set that is worth designing now?
11. Which event-mode features are explicitly future only?
12. What is the first App Store screenshot set we can ship honestly?

## Copy/Paste Prompt For Claude Design

Use this as the next instruction packet:

```text
You are continuing the BoothBop design handoff after the first returned packet:

- BoothBop Phase 1.dc.html
- HANDOFF.md
- demo photo assets
- the original BoothBop repo context files

The first pass was directionally strong. Keep the retro booth visual system, real
demo photos, template-gallery direction, event-mode direction, and App Store
frame direction.

Now push much harder. The next output must be implementation-grade, not a broad
concept board. The goal is to make BoothBop worth $1.99/month for Pro while
keeping the free app useful and shareable.

Primary product constraints:

- React + TypeScript + Vite app.
- Use existing BoothBop screen/component structure.
- UI screens live in src/screens.
- Shared UI primitives live in src/ui.
- Pure logic lives in src/lib.
- Current app is local-first: no backend, no accounts, no cloud uploads.
- Current default output is a classic 1x4 photostrip.
- Templates must render from captured frames or local demo frames.
- Review collapsed must fit on normal iPhone portrait without scrolling.
- Put photo tweaks inside an Edit drawer.
- Main Review actions should stay visible: Edit and Save/Share.
- Locked Pro items must preview clearly before purchase.
- Treat $1.99/month Pro as the target pricing model. Do not assume $0.99
  non-consumable unless you explicitly label it as a fallback model.

Reference sizes:

- 390x844 iPhone compact
- 430x932 iPhone large
- 820x1180 iPad portrait
- 1180x820 iPad kiosk landscape
- 1440x1100 desktop preview

Deliver these files:

1. ROUND2_SCREEN_SPECS.md
2. ROUND2_TEMPLATE_BUILD_LIST.md
3. ROUND2_TEMPLATE_CATALOG.ts
4. ROUND2_RENDERING_SPECS.md
5. ROUND2_IMPLEMENTATION_TICKETS.md
6. ROUND2_APP_STORE_FRAMES.md

For screen specs, include purpose, entry points, exit points, component
hierarchy, exact layout notes per reference size, primary/secondary actions,
empty/loading/error states, locked Pro states, exact copy, repo file mapping,
and acceptance criteria.

Near-term screens:

- Home / Idle
- Camera preview
- Countdown / capture
- Review collapsed
- Review edit drawer
- Format picker inside Review
- Template gallery
- Template detail / preview
- Pro locked template preview
- Paywall
- My Photos gallery
- Session detail / zoom preview
- Settings
- Import photos

Future/event screens:

- Events dashboard
- Create event wizard
- Event setup checklist
- Kiosk attract / welcome
- Kiosk guest capture
- Kiosk guest review
- Exit passcode
- Event gallery
- Print setup

For templates, choose the top 12 to build first from the 30-template pack. Do
not just distribute evenly by category. Pick the 12 that create the strongest
free experience, App Store screenshots, and Pro subscription value. For each
template, specify free/pro, category, layout, theme, filter, sticker pack,
caption behavior, preview demo set, export behavior, and acceptance criteria.
Then list the remaining 18 as backlog.

For rendering, define exact filter values, overlays, sticker glyphs, sticker
placement, face-safe geometry rules without face detection, caption max length,
truncation, fonts, thumbnail preview rules, and parity across strip/GIF/video/
gallery cover.

For implementation tickets, map every design decision to files in the current
repo and group tickets into: Must ship now, Pro value, App Store polish, Event
mode later, and Do not build yet. Include goal, files touched, visible behavior,
test plan, risk, dependencies, and S/M/L/XL size.

Force these decisions. Do not leave them as options:

1. Should the Templates entry point live on Home, Review, both, or somewhere
   else?
2. What exactly appears on the Review screen before the Edit drawer opens?
3. Which controls move into the Edit drawer, and in what order?
4. Should format selection be visible when collapsed, or inside the drawer?
5. What are the first 12 templates to implement?
6. Which of those 12 are free?
7. Which Pro features justify $1.99/month on day one?
8. What is the first paywall trigger?
9. What does the paywall say in 80 words or fewer?
10. What is the minimum event-mode feature set that is worth designing now?
11. Which event-mode features are explicitly future only?
12. What is the first App Store screenshot set we can ship honestly?

Be decisive. Produce specs an engineer can implement without interpretation.
```

## Acceptance Criteria For The Round 2 Output

The next Claude Design output is successful only if:

- It makes a clear build order.
- It resolves the Review collapsed/drawer structure.
- It picks the first 12 templates.
- It supports the `$1.99/month` Pro story.
- It distinguishes shipped, near-term, and future features.
- It includes edge states and locked states.
- It maps designs to repo files.
- It avoids speculative backend/account/cloud features.
- It gives enough detail for implementation tickets.
- It explicitly says what not to build yet.
