# BoothBop Product Scope

BoothBop should be a complete, private, local-first photo booth in the free
tier, then charge for polish, personalization, premium looks, and high-end
exports. The share loop is the growth loop, so core capture and sharing stay
free.

## Free Tier

- Four-shot booth flow: countdown, flash, retake, front/back camera, mirror.
- Local private gallery: reopen, delete, re-export.
- Export formats: strip, GIF, boomerang GIF, looping video.
- Standard quality exports.
- Core layouts: classic strip and square grid.
- Core looks: original, mono, warm.
- Basic strip colors.
- Native/web share or download.
- Demo shoot mode for simulator/App Store screenshot testing.
- BoothBop branding/watermark on animated/video outputs.

## Pro Scope

Target price: $1.99/month once Pro has recurring creative value. If the scope is
only watermark removal, keep it one-time instead.

- Watermark-free GIF, boomerang, and video.
- Custom strip footer/caption.
- Premium layouts: 2x6, 4x6, story, event cards, magazine covers.
- Premium looks: glam, vintage, high-contrast black-and-white, seasonal packs.
- Custom color palettes and saved style presets.
- High-quality export defaults.
- Save-all/batch export workflow.
- Pro event packs: reusable theme, caption, layout, filter, palette.
- Future: AI cutout/backgrounds only if privacy and app-size tradeoffs are
  solved.

## Next Implementation Ladder

1. Local workflow polish - shipped baseline
   - Session titles and favorites.
   - Save All.
   - Gallery favorite management.
   - Retaken shots persist back to the saved session.

2. Export controls - shipped baseline
   - GIF/boomerang/video speed presets.
   - Refactor export orchestration out of `App.tsx`.
   - Add a save-all task planner and better cache invalidation.

3. Template packs - shipped baseline
   - Introduce `src/lib/templates.ts`.
   - Move layout/color/filter combinations into explicit template definitions.
   - Mark templates as free or Pro without hard-coding product logic into
     screens.

4. Entitlements - shipped baseline
   - Add a feature-based entitlement layer over StoreKit.
   - Keep purchase implementation in `src/lib/purchases.ts`.
   - Gate Pro templates, premium looks, high quality, and watermark removal via
     capabilities instead of raw `isPro` checks.

5. Import and library workflows - shipped baseline
   - Add user-selected photo import.
   - Normalize imported images to square canvases immediately.
   - Keep privacy copy precise: selected images are read locally only.

6. Next Pro value
   - Party/event mode setup.
   - More template packs by event type.
   - Custom palettes and saved brand kits.
   - Better print-ready exports.

## Deferred

- Accounts, cloud galleries, QR event rooms, dashboards, guest analytics.
- Email/SMS delivery.
- Cross-device sync.
- Print fulfillment.
- Android IAP.
- AI background/face features that require upload or large local models.
- Kiosk/fleet/remote device management.

These are good future products, but they do not belong in the first
subscription-quality consumer app unless the backend/native scope changes.
