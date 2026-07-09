# Phases Of Wireframe Request

This file lists every screen we want Claude Design to wireframe, grouped by
priority. The output should be implementation-ready: screen purpose, states,
component hierarchy, responsive behavior, and notes for which existing files
should change or which new files should be added.

## Global Wireframe Rules

- Design mobile portrait first.
- Also provide iPad landscape variants for event/kiosk screens.
- Use BoothBop's current retro palette and typography.
- Keep primary actions obvious and reachable.
- Avoid explanatory walls of text inside the app.
- Prefer dense, operational UI over marketing-style sections.
- The finished strip/media preview is the hero on review/export screens.
- Collapsed screens should fit without scroll on 390 x 844 when practical.
- Expanded drawers and event admin screens may scroll.

## Phase 1: Current Core App Screens

Goal: improve the current shipped flow without adding a new event system.

### 1. Home / Start Screen

Existing file: `src/screens/IdleScreen.tsx`.

Design states:

- Default first-run state.
- Returning user with gallery sessions.
- Demo mode with demo shoot buttons.
- Import photos affordance.
- Camera permission error.
- Native app variant without PWA install messaging.

Need decisions:

- Whether the primary button says "Start Booth", "Take Photos", or similar.
- Where template entry belongs once template gallery exists.
- How to make My Photos and Import clear without crowding.

### 2. Camera Preview Screen

Existing file: `src/screens/CameraScreen.tsx`.

Design states:

- Live camera preview before capture.
- Demo preview before capture.
- Front camera.
- Back camera.
- Mirror enabled/disabled.
- Capture sound enabled/disabled.
- Delay selector.
- Four empty shot indicators.
- Retake-one-shot mode.

Need decisions:

- Where a template name/thumbnail appears if a template is active.
- Whether controls are bottom docked or split top/bottom.
- How to keep the preview dominant on iPhone and iPad.

### 3. Capturing Countdown Screen

Existing file: `src/screens/CameraScreen.tsx`.

Design states:

- Countdown 3/2/1 or current selected delay.
- Flash moment.
- Shot captured.
- Between-shot "pose" moment.
- Final shot transition to review.

Need decisions:

- Countdown visual treatment.
- Whether to show next-shot progress as 1/4, 2/4, etc.
- Whether to include event/template styling during capture.

### 4. Review Collapsed Screen

Existing file: `src/screens/ReviewScreen.tsx`.

Current model:

- Preview.
- Edit toggle.
- Save/Share primary action.
- Note/error callouts.

Design states:

- Strip selected.
- GIF generating.
- Boomerang generating.
- Video generating.
- Share available.
- Download fallback.
- Error after failed media generation.
- Success note after save/share/demo shoot.

Need decisions:

- Ideal preview size per output format.
- Whether "Edit" should be icon-only, text, or icon+text.
- Whether output format should be visible while collapsed or only in drawer.

### 5. Review Edit Drawer

Existing file: `src/screens/ReviewScreen.tsx`.

Current controls:

- Output format.
- Session title/favorite.
- Look/filter.
- Props/stickers.
- Presets.
- Layout.
- Color.
- Shots/reorder/retake.
- Autosave tip.
- Save All.
- Take Again.

Design states:

- Free user with locked Pro options.
- Pro user.
- Strip output selected.
- GIF/video selected.
- Session with title/favorite.
- Unsaved/imported session.

Need decisions:

- Drawer grouping and order.
- Whether controls should use horizontal scrollers, segmented controls, grids,
  or bottom sheets.
- How locked Pro features preview visually.
- How to make shot retake/reorder discoverable.

### 6. Zoom Preview Overlay

Existing file: `src/components/ZoomableImage.tsx`.

Design states:

- Fit mode.
- Zoomed/pannable mode.
- Close control.
- Tall strip.
- Wide/4x6 output.

Need decisions:

- Whether the overlay should include save/share controls.
- Whether zoom instructions remain visible or move to subtle chrome.

### 7. My Photos Gallery

Existing file: `src/screens/GalleryScreen.tsx`.

Design states:

- Empty gallery.
- Populated gallery.
- Favorites filter available.
- Favorites filter empty.
- Demo sessions visible.
- Delete confirmation affordance.
- Session cover loading/fallback.

Need decisions:

- Grid density on iPhone vs iPad.
- Whether session metadata should show title, date, favorite, output layout.
- Whether event grouping appears later.

### 8. Settings

Existing file: `src/screens/SettingsScreen.tsx`.

Current areas:

- Auto-save destination and formats.
- Export quality.
- GIF/video speed.
- Pro/IAP.
- Custom caption.
- Purchase/restore.

Design states:

- Web/PWA.
- Native iOS.
- Free user.
- Pro user.
- Photos permission denied/limited/granted.
- Video unsupported fallback.

Need decisions:

- Whether Pro gets a separate paywall screen.
- How to make native Photos auto-save understandable without heavy copy.

### 9. Import Photos Flow

Existing entry: `IdleScreen` and `src/lib/importPhotos.ts`.

Design states:

- Entry point from Home.
- Four selected photos.
- Too few/too many photos.
- Import failure.
- Imported set review.

Need decisions:

- Whether import deserves its own screen or remains a system picker plus review.
- How to communicate local-only import.

## Phase 2: Template Gallery and Template Selection

Goal: catch Mini Photobooth's template-first value without building a full
layer editor yet.

### 10. Template Gallery

New proposed screen: `src/screens/TemplateGalleryScreen.tsx`.

Design states:

- Category tabs: Classic, Birthday, Wedding, Night Out, Graduation, Holiday,
  Corporate.
- Free templates.
- Pro templates.
- Locked preview.
- Search/filter optional for later.
- Empty category fallback.

Need decisions:

- Entry from Home vs Review drawer vs both.
- Template card dimensions.
- Template preview thumbnail style.
- How to show output type: strip, grid, GIF, video, story.

### 11. Template Detail / Preview

New proposed screen or overlay.

Design states:

- Template preview.
- Template metadata: event type, output format, shot count, Pro/free.
- Apply to current session.
- Start booth with template.
- Unlock Pro path.

Need decisions:

- Whether the preview is a static thumbnail or live-rendered with demo photos.
- Whether users can favorite templates.

### 12. Template Picker In Camera

Future modification: `CameraScreen`.

Design states:

- One active template.
- Multiple templates available in event mode.
- Template picker closed/open.
- Guest-friendly selection.

Need decisions:

- How much selection UI can exist without slowing down capture.

## Phase 3: Event Mode Wireframes

Goal: make BoothBop credible as a DIY event booth on a stand.

### 13. Events List / Event Dashboard

New proposed screen: `src/screens/EventsScreen.tsx`.

Design states:

- No events.
- Events list.
- Event cards with name, template count, session count, last used.
- Create event.
- Duplicate/delete event.

Need decisions:

- Whether this lives in Home or Gallery.
- Whether "Events" is visible before v1 event mode is ready.

### 14. Create Event Wizard

New proposed flow.

Steps:

1. Event name.
2. Pick templates.
3. Capture settings.
4. Save/share/auto-save settings.
5. Guest mode/passcode.
6. Setup checklist.

Design states:

- Minimal path for casual users.
- Advanced settings collapsed.
- Pro upsell for multiple templates or branding.

### 15. Event Setup Checklist

New proposed screen or modal.

Checklist items:

- Camera permission.
- Photos permission if auto-save enabled.
- Offline assets ready.
- Guided Access instructions.
- Tripod/ring light placement.
- Optional printer setup.
- Start Event Mode.

### 16. Event Attract / Welcome Screen

New proposed guest-facing screen.

Design states:

- Event title.
- Template preview carousel.
- "Tap to Start".
- Inactivity loop.
- Admin exit affordance hidden behind long press or passcode.

Need iPad landscape design.

### 17. Event Guest Capture Flow

Future modification: `CameraScreen`.

Design states:

- Guest selects template, if more than one.
- Countdown.
- Capture progress.
- Retake path.
- Auto-advance to review/share/print.

Need iPad landscape design.

### 18. Event Review / Share / Print Screen

New variant of `ReviewScreen`.

Design states:

- Guest-safe review.
- Retake.
- Save/share.
- Print.
- Done.
- Auto-return countdown.

Need decisions:

- Which edit controls are hidden from guests.
- Whether guests can choose output format.

### 19. Event Exit Passcode

New proposed modal.

Design states:

- Enter passcode.
- Wrong passcode.
- Forgot passcode fallback.
- Exit to admin/dashboard.

### 20. Event Gallery

Future modification: `GalleryScreen`.

Design states:

- Sessions grouped by event.
- Event filter.
- Favorites.
- Batch export/share.
- Delete event sessions.

## Phase 4: Design Editor Wireframes

Goal: map Mini Photobooth's design depth without committing to all of it at
once.

### 21. Basic Text Tool

Near-term addition to Review drawer.

Design states:

- Add/edit caption.
- Font style.
- Text color.
- Footer placement.
- Pro locked states.

### 22. Template Editor Home

Future screen.

Design states:

- Canvas preview.
- Layer list.
- Add text/image/shape/sticker.
- Save template.
- Duplicate template.

### 23. Layer Editor

Future screen or panel.

Layer types:

- Text.
- Image/graphic upload.
- Shape.
- Sticker.
- Photo slot.
- Background.

Design states:

- Select layer.
- Reorder layer.
- Delete layer.
- Lock/unlock layer.
- Pro locked controls.

### 24. Color and Font Picker

Future component.

Design states:

- Brand palette.
- Recent colors.
- Custom color.
- Font list.
- Pro fonts.

### 25. Upload Background / Graphic Flow

Future flow.

Design states:

- Local file picker entry.
- Crop/fit/fill.
- Privacy note.
- Error state.

## Phase 5: Print and Hardware Support Wireframes

Goal: support Mini-style real event output once print/hardware work begins.

### 26. Print Setup

New proposed screen.

Design states:

- AirPrint explanation.
- Test print.
- Paper size: 4x6, 2x6 double, square.
- Full bleed/safe area guidance.
- Troubleshooting link.

### 27. Print Preview

New proposed modal.

Design states:

- Current output preview.
- Paper size.
- Copies.
- Print.
- Save/share fallback.

### 28. External Camera Picker

Future screen/section.

Design states:

- Built-in camera.
- USB-C webcam if exposed.
- Unavailable DSLR support explanation.
- Test preview.

## Phase 6: Paywall and Store Presentation

Goal: make the Pro value clear once template packs and event features exist.

### 29. Pro Paywall

May live in `SettingsScreen` initially, then become its own screen.

Design states:

- Free user.
- Pro user.
- Locked template clicked.
- Restore purchases.
- Purchase error.
- Offline purchase unavailable.

Value bullets should focus on:

- Watermark-free exports.
- Pro template packs.
- Premium looks/props.
- High-quality exports.
- Event mode features, when ready.

### 30. App Store Screenshot Frames

Design request, not in-app code.

Needed shots:

1. Finished classic strip.
2. Four-shot countdown/camera.
3. Template gallery.
4. Review edit drawer.
5. GIF/boomerang/video.
6. My Photos gallery.
7. Event mode, once built.

Use real demo photos from `src/demo/`.
