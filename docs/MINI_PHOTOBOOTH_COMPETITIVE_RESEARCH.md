# BoothBop vs Mini Photobooth Competitive Research

Research date: 2026-06-26

Goal: build an extensive, implementation-oriented feature parity list so
BoothBop can catch up to Mini Photobooth while preserving BoothBop's core
positioning: fast, private, local-first, and simple enough for casual selfie
booth use.

## Sources

- Mini Photobooth App Store listing:
  https://apps.apple.com/us/app/mini-photobooth/id1342093386
- Mini Photobooth website:
  https://miniphotobooth.co/
- Mini Photobooth features page:
  https://miniphotobooth.co/features
- Mini Photobooth tutorials index:
  https://miniphotobooth.co/tutorials
- Create Your First Event tutorial:
  https://www.miniphotobooth.co/tutorials/create-your-first-event
- Create a Video/GIF Template tutorial:
  https://miniphotobooth.co/tutorials/create-video-gif-template
- Printer setup guide:
  https://miniphotobooth.co/printer-setup
- External camera guide:
  https://miniphotobooth.co/external-camera
- BoothBop source inspected locally:
  `src/App.tsx`, `src/screens/*`, `src/lib/*`, `docs/PRODUCT_SCOPE.md`,
  `docs/PLAN.md`, `docs/MONETIZATION.md`.

## Source Takeaways

Mini Photobooth is positioned as a custom event photobooth for iPhone and iPad.
The App Store listing currently shows 4.7 stars from 8.9K ratings and describes
the app as "Custom event photobooths." The product site positions it for DIYers
and professionals, with a quick-start library of 200+ free templates, powerful
design tools, and event workflows.

Mini's public feature set includes:

- Template-first setup for weddings, birthdays, holidays, graduations,
  corporate events, and other occasions.
- A design/editor surface for layouts, text, backgrounds, stickers, branding,
  filters, shapes, photo borders, and uploaded graphics.
- Event Mode with a passcode, Guided Access guidance, guest template selection,
  countdown capture, preview, redo, print, and share.
- Photo templates, video templates, GIF templates, multi-photo GIFs, boomerang,
  slow motion, variable video recording length, photo count, and animation
  settings.
- AirPrint support, default-printer behavior, 4x6 paper support, doubled 2x6
  strip printing, full-bleed output where the printer supports it, and DNP
  printer/WCM guidance.
- External camera support for Canon EOS, Sony DSLR, and USB-C streaming webcams.
- Unlimited events, unlimited templates, unlimited devices, 100+ customizable
  templates, 1000+ graphics, custom graphics upload, filters, effects, green
  screen, and ongoing updates.

The App Store and website are not perfectly consistent on counts:

- App Store listing: 8.9K ratings.
- Product website/pricing page: 8.7K reviews.
- App Store listing says 800+ stickers.
- Feature/pricing pages say 1000+ graphics.
- Home page says 200+ free templates.
- Feature/pricing pages say 100+ templates.

For planning, treat these as marketing ranges: Mini has hundreds of templates
and graphics, far beyond BoothBop's current small preset set.

## Positioning Comparison

| Dimension        | Mini Photobooth                                  | BoothBop today                                     | Strategic read                                          |
| ---------------- | ------------------------------------------------ | -------------------------------------------------- | ------------------------------------------------------- |
| Primary job      | Run a customizable event booth                   | Make a fast private selfie strip/GIF/video         | BoothBop wins simplicity; Mini wins event depth         |
| Primary customer | DIY event host, pro/operator, iPad booth owner   | Casual phone user, App Store selfie booth user     | Decide whether to chase events, casual, or both         |
| Core artifact    | Custom event template output                     | Classic 4-shot strip, GIF, boomerang, video        | BoothBop should make the strip iconic first             |
| Setup model      | Design templates and events before guests use it | Start camera immediately, edit after capture       | BoothBop needs optional setup, not mandatory setup      |
| Hardware model   | iPhone/iPad, printers, DSLR/webcam               | Phone camera, Capacitor native share/save          | Printer/DSLR parity is expensive and operator-focused   |
| Monetization     | Subscription/pro event tool                      | Current Pro/IAP direction for polish and watermark | Monthly pricing requires recurring template/value drops |
| Privacy posture  | Event utility, optional web gallery              | Local-first, no uploads, private gallery           | Preserve this as a differentiator                       |

## BoothBop Current Feature Inventory

Current implemented capabilities:

- Four-shot countdown capture flow.
- Flash and capture sound.
- Front/back camera toggle and mirror preview.
- Demo capture mode with staged App Store screenshot photos.
- Classic 4x1 strip default.
- 2x2 grid, 2x6, 4x6, and story layouts.
- Six strip theme colors.
- PNG strip export.
- Animated GIF export.
- Boomerang GIF export.
- Looping video export through web MediaRecorder or native AVAssetWriter path.
- Export speed presets for GIF/boomerang/video.
- Export quality tiers.
- Filters: original, mono, warm, glam, vintage.
- Sticker/prop overlays: none, sparkles, hearts, party.
- Style presets: classic, spark grid, B&W strip, story glam, wedding 2x6,
  retro 4x6.
- Session title and favorite.
- On-device private gallery backed by IndexedDB.
- Gallery favorites filter.
- Gallery covers rendered with saved style.
- Reopen, delete, clear, favorite, and re-export saved sessions.
- Retake an individual shot.
- Reorder shots.
- Save/share current output.
- Save All exports current strip, GIF, boomerang, video, and individual shots.
- Native iOS share sheet path through Capacitor.
- Native Photos album auto-save settings for strip, grid, GIF, and video.
- Haptics and native splash handling.
- Pro/IAP groundwork for remove-watermark and premium feature gating.
- Local-first privacy posture, no account, no backend.

Major current absences:

- No event/project builder.
- No template library at Mini's scale.
- No layer-based template editor.
- No arbitrary text layers, font picker, drag/resize/rotate, or color picker.
- No custom uploaded backgrounds or graphics.
- No guest-facing event/kiosk mode.
- No passcode or Guided Access onboarding.
- No AirPrint flow or printer configuration.
- No DSLR/webcam direct integration beyond browser camera selection.
- No QR/web gallery, email/text delivery, or cloud sharing.
- No green screen/background removal.
- No shape/photo-border editor.
- No template chooser in camera flow.

## Feature Parity Matrix

Status values:

- Done: BoothBop has a comparable feature.
- Partial: BoothBop has a narrower version.
- Gap: BoothBop lacks it.
- Defer: Do not chase yet unless strategy changes.

Priority values:

- P0: Needed to look competitive in the App Store and retain casual users.
- P1: Needed to catch Mini's core event workflow.
- P2: Strong paid/pro value but not required for the next submission.
- P3: Operator/pro hardware or backend-heavy capability.

### Discovery, Trust, and Positioning

| Mini feature                                        | BoothBop status | Priority | Catch-up action                                                               |
| --------------------------------------------------- | --------------- | -------- | ----------------------------------------------------------------------------- |
| Strong App Store social proof                       | Gap             | P0       | Improve screenshots, app preview, review prompts after successful saves       |
| Clear "custom event photobooth" positioning         | Partial         | P0       | Decide if store copy says "selfie booth" or "event booth"; do not overpromise |
| Wedding/birthday/holiday/graduation use cases       | Partial         | P0       | Add event-oriented template packs and App Store screenshots                   |
| DIY + professional positioning                      | Gap             | P2       | Add only after event mode and print basics exist                              |
| "Try every feature free before purchase" style demo | Partial         | P0       | Keep demo sessions; add locked preview states for Pro templates               |
| Help/tutorial content                               | Gap             | P1       | Add in-app "Event setup checklist" and docs/support pages                     |

### Core Capture Flow

| Mini feature                          | BoothBop status | Priority | Catch-up action                                                       |
| ------------------------------------- | --------------- | -------- | --------------------------------------------------------------------- |
| Countdown before capture              | Done            | P0       | Keep; polish copy and pacing                                          |
| Multi-photo capture                   | Done            | P0       | Keep 4 shots as default                                               |
| Live preview before/during capture    | Done            | P0       | Keep improving robustness                                             |
| Guest preview after capture           | Done            | P0       | Review screen covers this                                             |
| Redo/retake if needed                 | Partial         | P0       | Retake individual shot exists; make it more discoverable in drawer    |
| Full redo of session                  | Done            | P0       | "Take Again" exists                                                   |
| Camera restore if flow interrupted    | Partial         | P1       | Add stronger resume/recovery states around permission loss/background |
| Bluetooth remote shutter support      | Gap             | P2       | Add keyboard/volume/MediaSession input where possible                 |
| Front/back camera                     | Done            | P0       | Keep                                                                  |
| Mirror preview                        | Done            | P0       | Keep                                                                  |
| Capture sound                         | Done            | P0       | Keep and add selectable sounds later                                  |
| Haptics                               | Done            | P0       | Keep                                                                  |
| Variable number of photos             | Gap             | P1       | Add 1, 2, 3, 4, 5, 6 shot templates as a template property            |
| Variable countdown per event/template | Partial         | P1       | Delay setting exists; scope it into event/template presets            |

### Output Formats and Animation

| Mini feature                      | BoothBop status | Priority | Catch-up action                                                             |
| --------------------------------- | --------------- | -------- | --------------------------------------------------------------------------- |
| Photo strip output                | Done            | P0       | Keep classic strip as default                                               |
| 4x6 print-style output            | Done            | P0       | Existing 4x6 Pro layout                                                     |
| 2x6 strip output                  | Done            | P0       | Existing 2x6 Pro layout                                                     |
| Double 2x6 strip for 4x6 printing | Gap             | P1       | Add "2x6 double print" layout/export                                        |
| Square grid output                | Done            | P0       | Existing 2x2 grid                                                           |
| Story/social output               | Done            | P0       | Existing story layout                                                       |
| GIF output                        | Done            | P0       | Keep                                                                        |
| Video output                      | Done            | P0       | Keep native path reliable                                                   |
| Boomerang                         | Done            | P0       | Keep                                                                        |
| Slow motion controls              | Gap             | P2       | Add video/GIF animation profiles beyond current speed presets               |
| Animation settings                | Partial         | P1       | Existing speed presets; add per-template frame duration and loop count      |
| Multi-photo GIF templates         | Partial         | P1       | Current GIF uses all four frames; add template-specific frame counts/layout |
| Single video recording mode       | Gap             | P2       | Add "video message" or "short clip" capture mode only if product expands    |
| Variable video recording length   | Gap             | P2       | Depends on single video mode                                                |
| High-quality print exports        | Partial         | P1       | Quality tiers exist; validate 300 DPI-style exports for 4x6/2x6             |
| Full bleed output                 | Gap             | P1       | Add explicit bleed/safe-area layout options                                 |

### Layouts and Templates

| Mini feature                          | BoothBop status | Priority | Catch-up action                                                      |
| ------------------------------------- | --------------- | -------- | -------------------------------------------------------------------- |
| Large template library                | Gap             | P0       | Build 25 high-quality templates first, then 100+ over time           |
| Free quick-start templates            | Partial         | P0       | Existing 6 presets; expand to event packs                            |
| GIF templates                         | Gap             | P1       | Add motion templates with format, layout, timing, sticker, and theme |
| Video templates                       | Gap             | P1       | Same as GIF templates, using video output                            |
| Multiple templates per event          | Gap             | P1       | Add event object containing template IDs                             |
| Guest chooses template in camera flow | Gap             | P1       | Add pre-capture template picker for event mode                       |
| Unlimited templates                   | Gap             | P2       | Requires saved user templates                                        |
| Unlimited events                      | Gap             | P1       | Add local event/project storage first                                |
| Saved style presets                   | Partial         | P0       | Current presets are code-defined; add user-saved styles              |
| Event-specific branding               | Gap             | P1       | Add event name, color palette, caption/logo asset                    |
| Duplicate/edit template               | Gap             | P1       | Add template clone operation in editor                               |
| Template categories                   | Gap             | P0       | Birthday, wedding, night out, graduation, holiday, corporate         |
| Template search/filter                | Gap             | P2       | Add when template count exceeds 30                                   |
| Template preview gallery              | Gap             | P0       | Add a "Templates" drawer/gallery before capture or in edit           |

### Design and Editing Tools

| Mini feature                    | BoothBop status | Priority | Catch-up action                                                     |
| ------------------------------- | --------------- | -------- | ------------------------------------------------------------------- |
| Custom text                     | Partial         | P0       | Pro caption exists in settings; add visible text tool in drawer     |
| Unlimited text layers           | Gap             | P1       | Add layer model with text objects                                   |
| 120+ fonts                      | Gap             | P2       | Start with 6 bundled fonts; avoid huge app size                     |
| Full color palette              | Partial         | P0       | Strip swatches exist; add color picker/custom hex for Pro           |
| Custom photo backgrounds        | Gap             | P1       | Add local background upload/crop for strip canvas                   |
| Custom graphics upload          | Gap             | P1       | Add image layer upload, local-only                                  |
| Stickers/graphics library       | Partial         | P0       | Current 3 sticker packs; build 50+ lightweight SVG/PNG stickers     |
| 800+ stickers / 1000+ graphics  | Gap             | P3       | Scale later via curated asset packs                                 |
| Shapes                          | Gap             | P1       | Add rectangles, circles, lines, badges as canvas layers             |
| Photo borders                   | Partial         | P1       | Current strip border/theme; add per-photo border width/color/radius |
| Filters                         | Partial         | P0       | Add more looks: soft glam, high contrast, warm film, cool flash     |
| Effects overlays                | Partial         | P1       | Current stickers/filters; add confetti, film grain, light leaks     |
| Green screen/background removal | Gap             | P3       | Defer unless using native Vision/ML or privacy-safe local model     |
| Layer-based editing             | Gap             | P1       | Introduce template schema with ordered layers                       |
| Drag/resize/rotate objects      | Gap             | P1       | Add canvas/template editor after schema exists                      |
| Safe area / bleed guides        | Gap             | P1       | Needed for print quality                                            |
| Undo/redo in editor             | Gap             | P2       | Needed once editor is nontrivial                                    |
| Snap/alignment tools            | Gap             | P2       | Add after basic editor                                              |
| User-saved brand kit            | Gap             | P2       | Pro feature: logo, colors, preferred font                           |

### Event Mode and Kiosk Operation

| Mini feature                            | BoothBop status | Priority | Catch-up action                                          |
| --------------------------------------- | --------------- | -------- | -------------------------------------------------------- |
| Event tab/project model                 | Gap             | P1       | Add local `events` store in IndexedDB                    |
| Create Event flow                       | Gap             | P1       | Minimal wizard: name, templates, sharing/saving defaults |
| Start Event                             | Gap             | P1       | Launch guest flow from event                             |
| Event Mode                              | Gap             | P1       | Guest-safe capture loop with limited controls            |
| Passcode to exit event mode             | Gap             | P1       | Add local PIN before exposing settings/gallery           |
| Guided Access guidance                  | Gap             | P1       | Add setup checklist and pre-event screen                 |
| Welcome screen customization            | Gap             | P2       | Add event welcome title/background                       |
| Attract screen / idle loop              | Gap             | P2       | Useful for booths on stands                              |
| Auto-return to camera after share/print | Gap             | P1       | Critical for unattended booth                            |
| Auto camera flow restoration            | Gap             | P2       | Resume event flow after app foreground                   |
| Guest template selection                | Gap             | P1       | Add if event has multiple templates                      |
| Operator/admin mode                     | Gap             | P2       | Separate owner settings from guest UI                    |
| Event session gallery                   | Partial         | P1       | Gallery exists; group by event                           |
| Per-event counts                        | Gap             | P2       | Add capture/export counts locally                        |
| Offline event readiness                 | Partial         | P1       | PWA works offline; add "assets ready" preflight          |

### Saving, Sharing, and Gallery

| Mini feature                     | BoothBop status | Priority | Catch-up action                                                    |
| -------------------------------- | --------------- | -------- | ------------------------------------------------------------------ |
| Print/share screen after capture | Partial         | P0       | Review screen covers save/share; add explicit print when available |
| Share to Messages/social         | Done            | P0       | Native share sheet path                                            |
| Email sharing                    | Partial         | P2       | Share sheet may include mail; no built-in email composer           |
| Text/SMS sharing                 | Partial         | P2       | Share sheet may include Messages; no SMS delivery service          |
| QR code sharing                  | Gap             | P3       | Requires local network/server or backend/gallery                   |
| Web gallery                      | Gap             | P3       | Backend-heavy; defer unless event strategy requires it             |
| Save originals to camera roll    | Partial         | P1       | Save All includes shots; auto-save can save formats to Photos      |
| Auto-save to Photos              | Done            | P0       | Native album settings exist                                        |
| Local private gallery            | Done            | P0       | Strong BoothBop differentiator                                     |
| Gallery favorites                | Done            | P0       | Keep                                                               |
| Reopen previous session          | Done            | P0       | Keep                                                               |
| Delete / clear gallery           | Done            | P0       | Keep                                                               |
| Event-level gallery grouping     | Gap             | P1       | Add once event model exists                                        |
| Batch export event               | Gap             | P2       | Add "export all event sessions" zip/share later                    |
| Save All                         | Done            | P0       | Keep                                                               |

### Printing

| Mini feature                     | BoothBop status | Priority | Catch-up action                                         |
| -------------------------------- | --------------- | -------- | ------------------------------------------------------- |
| AirPrint support                 | Gap             | P1       | Add native/browser print path for image outputs         |
| Print button on review           | Gap             | P1       | Add when print support is reliable                      |
| Printer setup guide              | Gap             | P1       | Add support docs and in-app checklist                   |
| Same-Wi-Fi printer guidance      | Gap             | P1       | Add copy/docs                                           |
| Default printer behavior         | Gap             | P3       | iOS limitations; investigate native print controller    |
| 4x6 paper support                | Partial         | P1       | 4x6 layout exists; validate print dimensions            |
| 2x6 doubled on 4x6               | Gap             | P1       | Add layout/export specifically for DNP/Cut strips       |
| Full bleed support               | Gap             | P1       | Add bleed margins and crop safety                       |
| DNP/WCM setup docs               | Gap             | P3       | Docs only after print path exists                       |
| Print queue troubleshooting docs | Gap             | P3       | Later support content                                   |
| Recommended printer docs         | Gap             | P2       | Add once tested with real Canon Selphy/AirPrint printer |

### Hardware and Device Support

| Mini feature                         | BoothBop status | Priority | Catch-up action                                                       |
| ------------------------------------ | --------------- | -------- | --------------------------------------------------------------------- |
| iPhone support                       | Done            | P0       | Native shell exists                                                   |
| iPad support                         | Partial         | P1       | Responsive UI works, but no iPad event layout pass yet                |
| Mac designed-for-iPad support        | Unknown         | P3       | Validate later                                                        |
| Unlimited devices                    | Gap             | P3       | Depends on subscription/account model; local app can install anywhere |
| Canon EOS DSLR support               | Gap             | P3       | Native SDK or USB capture; high cost                                  |
| Sony DSLR support                    | Gap             | P3       | Native SDK or USB capture; high cost                                  |
| USB-C webcam support                 | Partial         | P2       | Browser camera may expose devices; add explicit camera picker         |
| External camera setup guide          | Gap             | P2       | Add after camera picker/external test                                 |
| Continuous power / wired setup guide | Gap             | P3       | Event operator docs later                                             |
| Ring light/tripod setup guidance     | Gap             | P0       | Add low-cost setup tips in onboarding/support                         |

### Monetization and Packaging

| Mini feature                            | BoothBop status | Priority | Catch-up action                                         |
| --------------------------------------- | --------------- | -------- | ------------------------------------------------------- |
| Subscription/pro value                  | Partial         | P0       | Pro wiring exists; value still thin                     |
| Lots of paid creative value             | Gap             | P0       | Ship template/sticker/look packs before monthly pricing |
| Try before purchase                     | Partial         | P0       | Let locked assets preview with watermark/lock           |
| Unlimited events/templates on paid plan | Gap             | P2       | Only after events/user templates exist                  |
| Pro operator features                   | Gap             | P3       | Print, external camera, event mode, QR gallery          |
| One-time remove watermark               | Done/Partial    | P0       | IAP groundwork exists; confirm App Store product state  |
| Feature entitlement layer               | Partial         | P0       | `entitlements.ts` exists; keep expanding                |

### Reliability, Support, and Operations

| Mini feature               | BoothBop status | Priority | Catch-up action                                                   |
| -------------------------- | --------------- | -------- | ----------------------------------------------------------------- |
| Knowledge base             | Gap             | P1       | Add docs/support pages for capture, save, print, event setup      |
| Setup in 60s tutorial      | Gap             | P0       | Add quick in-app first-run and support doc                        |
| Event setup checklist      | Gap             | P1       | Add to event wizard                                               |
| Camera permission recovery | Partial         | P0       | Already handles denied/lost camera; polish copy                   |
| Photos permission recovery | Partial         | P0       | Settings path exists; keep improving                              |
| Printer troubleshooting    | Gap             | P2       | Add when print ships                                              |
| App Store review readiness | Partial         | P0       | Docs exist; keep console warnings clean                           |
| Offline use                | Done            | P0       | Strong advantage; add UI that says event assets are offline-ready |

## Catch-Up Roadmap

### Phase 1: Make BoothBop feel competitively complete for casual users

Target: 1 to 2 weeks.

This phase should not require a backend or hardware integrations.

1. Add a Template Gallery
   - Create 20 to 30 polished templates.
   - Categories: Classic, Birthday, Wedding, Night Out, Graduation, Holiday,
     Corporate.
   - Reuse existing layout/theme/filter/sticker system.
   - Add visual thumbnails.
   - Keep free/pro split obvious.

2. Add a visible Text/Caption tool in the Review drawer
   - Current caption is tucked into Pro settings.
   - Move it to the edit workflow.
   - Allow footer text for free with BoothBop watermark elsewhere, or gate
     custom fonts/colors in Pro.

3. Add more free and Pro looks
   - Free: Soft Flash, Clean B&W, Warm Film.
   - Pro: Glam, Vintage, High Contrast, Sepia, Cool Flash, Dreamy.
   - Keep this in `src/lib/render.ts`.

4. Add more sticker packs
   - Birthday, wedding, hearts, sparkle, party, graduation, holiday.
   - Prefer SVG/canvas-drawn assets or optimized PNGs.
   - Add a sticker picker with thumbnails, not text-only options.

5. Add 2x6 double-print export
   - This is a direct Mini feature and useful for real photo strips.
   - Implement in `stripGeometry` as a new layout or print export mode.

6. Add a print/share affordance
   - Start with browser/native print for PNG outputs where available.
   - If native iOS print is needed, investigate a Capacitor print plugin or a
     small custom native bridge.

7. Improve App Store screenshots around the finished artifact
   - Show classic strip, template picker, GIF/boomerang, gallery, and save/share.

### Phase 2: Add a lightweight event mode

Target: 2 to 4 weeks.

This is the core parity leap toward Mini.

1. Add local event storage
   - New IndexedDB store: `events`.
   - Event model: id, name, templates, defaultTemplateId, createdAt, updatedAt,
     settings.

2. Add event creation wizard
   - Name event.
   - Pick templates.
   - Pick capture delay.
   - Pick autosave formats.
   - Optional passcode.

3. Add guest-safe Event Mode
   - Limited UI.
   - Big "Start" and template picker.
   - No gallery/settings unless passcode entered.
   - Auto-return to event start after save/share timeout.

4. Add event sessions
   - Tag saved sessions with eventId.
   - Filter gallery by event.
   - Add event capture count.

5. Add setup checklist
   - Guided Access instructions.
   - Tripod/ring light tips.
   - Photos permission check.
   - Offline asset readiness.
   - Optional printer check once printing exists.

### Phase 3: Real design editor

Target: 4 to 8 weeks.

This is the biggest Mini parity area.

1. Define a real template schema
   - Template: id, name, category, output type, layout, theme, capture settings,
     layer list.
   - Layers: text, image, shape, sticker, photo-slot, background.

2. Add layer rendering
   - Move output rendering from hard-coded layout/theme toward template render.
   - Preserve existing simple path for performance and safety.

3. Add editor primitives
   - Add text layer.
   - Add shape layer.
   - Add uploaded image layer.
   - Reorder layers.
   - Delete layers.
   - Basic drag/resize first.

4. Add font/color controls
   - Start with a small font set.
   - Add color picker/custom palette.
   - Add alignment controls.

5. Add user-saved templates
   - Save locally.
   - Duplicate/rename.
   - Mark favorite.

### Phase 4: Printing and event operator polish

Target: depends on access to printer hardware.

1. Test with a Canon Selphy AirPrint printer.
2. Add print button and validate iOS/native behavior.
3. Validate 4x6, 2x6, and double 2x6 print dimensions.
4. Add print setup docs.
5. Add print troubleshooting docs.
6. Add event auto-return after print/share.
7. Add operator lock/passcode polish.

### Phase 5: Pro hardware and backend-heavy features

Defer until the app proves event demand.

1. External camera picker.
2. USB-C webcam testing.
3. DSLR support research.
4. QR/web galleries.
5. Email/SMS delivery service.
6. Green screen/background removal.
7. Cross-device event sync.

## Recommended Feature Scope for $1.99/month

BoothBop should not ask for a subscription on watermark removal alone. To be
worth $1.99/month, Pro needs recurring creative/event value:

- Watermark-free animated/video exports.
- Pro template packs, refreshed monthly.
- Pro sticker/graphic packs.
- Premium filters.
- Custom text styles and fonts.
- Custom colors.
- High-quality export defaults.
- 2x6, 4x6, story, and double-print layouts.
- Event mode with multiple templates.
- Saved user templates.
- Print-ready export controls.

Free should remain generous:

- Four-shot capture.
- Classic 4x1 strip.
- 2x2 grid.
- Basic GIF/video/boomerang export with watermark on animated/video.
- Local gallery.
- Save/share.
- A small template starter set.

## High-Impact Implementation Order

If the goal is maximum visible catch-up with minimal architecture risk:

1. Template gallery using existing render engine.
2. 20 to 30 templates with category filters.
3. Caption/text tool in Review drawer.
4. Sticker picker with visual thumbnails.
5. More filters/effects.
6. Double 2x6 print layout.
7. Print button for image outputs.
8. Event model and event wizard.
9. Guest Event Mode with passcode.
10. Event session grouping in gallery.
11. Template chooser in camera.
12. User-saved templates.
13. Layer schema.
14. Basic layer editor.
15. Uploaded background/graphics.
16. Print setup docs and in-app checklist.
17. External camera picker.
18. Web/QR gallery spike.
19. Green screen spike.
20. DSLR support spike.

## Strategic Recommendation

Do not try to clone Mini Photobooth all at once. Mini is an event-operator app
with years of template, hardware, printing, and support depth. BoothBop should
catch up in the order users can actually feel:

1. Make the finished output look much richer.
2. Add templates so users do not have to design from scratch.
3. Add event mode so the app can sit on a tripod at a party.
4. Add print-ready layouts and a print button.
5. Only then chase DSLR, QR galleries, green screen, and pro operator hardware.

The near-term wedge is not "Mini but smaller." It is "the fastest private photo
strip app that can grow into event mode." That lets BoothBop keep its simple
core while borrowing Mini's strongest retention and monetization loops.
