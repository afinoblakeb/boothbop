# In-App Purchase: Remove Watermark

A one-time **non-consumable** that removes the BoothBop watermark from GIF and
video exports, forever (it syncs across the buyer's devices via their Apple ID).

- **Product ID:** `com.boothbop.app.removewatermark` (must match exactly —
  `REMOVE_WATERMARK_ID` in `src/lib/purchases.ts`)
- **Price:** $0.99 (Tier 1) — adjustable
- **Implementation:** native StoreKit 2 plugin `BoothBopStore`
  (`ios/App/App/AppDelegate.swift`) → `lib/storePlugin.ts` → `lib/purchases.ts`.
  **No third-party SDK**, so the App Privacy label stays **Data Not Collected**
  (purchases are handled by Apple, not collected by us).
- **Gating:** `isPro` in `App.tsx` flips the existing `watermark` flag on
  `encodeGif`/`encodeVideo` to `false`. The **strip footer logo is unaffected**
  by design (it's the strip's branding, not the removable watermark).

## How it behaves

- Entitlement is re-checked from StoreKit on every launch (`refreshPro`), cached
  in `localStorage` (`bb.pro`) for instant UI, works offline.
- Settings shows **Remove Watermark · $0.99** (real localized price) with a
  **Restore purchase** link (required by Guideline 3.1.1). After purchase it
  shows "✓ Watermark removed."
- On purchase/restore, the cached GIF/video are cleared so they re-encode clean.

## Test it in the Simulator (no App Store Connect needed)

1. Open the project in Xcode → **Product → Scheme → Edit Scheme → Run →
   Options → StoreKit Configuration → select `BoothBop.storekit`.**
2. Run on a simulator, open **Settings → Remove Watermark**, tap Buy — StoreKit's
   test sheet appears (free). Confirm the watermark drops from a GIF/video and
   "✓ Watermark removed" shows. Test **Restore purchase** too.
3. Reset state: Xcode → **Debug → StoreKit → Manage Transactions → delete.**

## Ship it — what you do in App Store Connect (one-time)

1. **Agreements, Tax, and Banking** → accept the **Paid Applications** agreement
   and add banking + tax info. _IAPs don't work until this is active._
2. Your app → **Monetization → In-App Purchases → (+)**:
   - Type **Non-Consumable**
   - Reference Name: `Remove Watermark`
   - Product ID: `com.boothbop.app.removewatermark`
   - Price: **$0.99**
   - Localization (English): Display Name `Remove Watermark`, Description
     `Removes the BoothBop watermark from your GIFs and videos, forever.`
   - Upload a **review screenshot** of the Settings purchase (required).
3. **Sandbox test on a real device:** Users and Access → Sandbox → create a
   tester; on the device the purchase sheet uses it (free).
4. **Submit:** the **first** IAP must be submitted **with an app version** — so
   bump the app to a new version (e.g. 1.0) that includes this build, attach the
   IAP, and submit them together. (`fastlane release` handles the binary +
   metadata; create/submit the IAP in App Store Connect or via the `asc` CLI.)
