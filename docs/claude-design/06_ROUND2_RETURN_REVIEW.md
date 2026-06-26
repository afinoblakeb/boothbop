# Round 2 Return Review

## Packet Reviewed

- Source zip: `/Users/afinoblake/Downloads/Markdown instructions attached (1).zip`
- Extracted for review: `/tmp/boothbop-claude-design-round2`
- Imported into this repo:
  - `ROUND2_APP_STORE_FRAMES.md`
  - `ROUND2_IMPLEMENTATION_TICKETS.md`
  - `ROUND2_RENDERING_SPECS.md`
  - `ROUND2_SCREEN_SPECS.md`
  - `ROUND2_TEMPLATE_BUILD_LIST.md`
  - `ROUND2_TEMPLATE_CATALOG.ts`

The generated HTML canvases and duplicate image assets were not imported. Keep
them in the downloaded zip unless we decide to archive design source artifacts.

## Verdict

This second pass is strong enough to use as the implementation source of truth.
It answered the forced decisions instead of keeping them open, and it provides a
usable sprint order.

Do not use the returned top-level `HANDOFF.md` as the strategy source. It still
looks like the older Phase 1 handoff and still mentions the stale `$0.99`
non-consumable path. Use the `ROUND2_*` files instead.

## Best Decisions

1. Templates live on Home as a primary card and in the Review edit drawer as a
   secondary link. They do not clutter collapsed Review.
2. Collapsed Review is now a clear one-screen target: strip preview, Edit,
   Save/Share, and Take Again.
3. Format selection moves into the edit drawer. Strip stays the default first
   impression.
4. The drawer order is concrete: Output, Layout, Color, Look, Props, Caption,
   Session, Shots, Browse Templates, Save All, Take Again.
5. The first paywall trigger is applying or starting from a locked Pro template.
   Other locked Pro controls reuse the same sheet with context.
6. The Pro target is correctly reframed as `$1.99/month`, with a one-time
   purchase only documented as a fallback.
7. Event scope is cut down to single-device Party Mode. Events dashboard, QR,
   print, branded kiosk flows, and cloud-style features are explicitly future.
8. App Store frames distinguish shipped, near-term, and future concept work.

## Implementation Caveats

1. `ROUND2_TEMPLATE_CATALOG.ts` is a design artifact under `docs/`, not compiled
   app code. When implementing, port its data into `src/lib/templates.ts` with
   tests rather than importing from docs.
2. The catalog introduces new preset ids and a top-12 subset. Existing persisted
   preset ids need a graceful fallback through `findStylePreset`.
3. The rendering specs introduce more look/sticker behavior than the app has
   today. Update `FilterKey`, `StickerKey`, `FILTERS`, `STICKERS`,
   `PREMIUM_FILTERS`, `PREMIUM_STICKERS`, and tests together.
4. Current `composeStrip` supports a `caption` option, but in the branded/free
   footer branch the logo path wins. The T-CAP renderer change is real work, not
   just data wiring.
5. The subscription work must also fix StoreKit transaction observation. The
   simulator already warned that purchases need a `Transaction.updates` listener
   at launch.
6. The paywall promises "new templates every month." Only use that phrase in
   production if we are committing to ongoing drops.
7. Party Mode can gate in-app navigation, but the web shell cannot truly lock
   the device. Product copy should keep pointing to iOS Guided Access for real
   handoff safety.

## Recommended Build Order

1. `N2` template catalog data and gating.
2. `N1` Review collapsed/edit drawer restructure.
3. `N3` Template Gallery.
4. `N4` Template detail and Apply/Start paths.
5. `P2` Pro looks/sticker packs and render parity.
6. `P4` caption renderer and custom caption gate.
7. `P1` subscription plumbing.
8. `P3` paywall and triggers.
9. `N5` edge, empty, and error states.
10. `A1/A2` App Store screenshot generation and metadata copy.
11. `E1` Party Mode.

This gives the biggest visible product jump before switching on the recurring
subscription pitch.
