# In-App Purchase: BoothBop Pro

BoothBop Pro is the native iOS entitlement for premium templates, premium
looks/props, custom captions, HD exports, print sheets, and watermark-free saved
outputs. Apple handles billing and entitlement sync; BoothBop does not collect
purchase data.

- **Primary product ID:** `com.boothbop.app.pro.monthly`
- **Type:** auto-renewable subscription
- **Target price:** `$1.99/month`
- **Legacy entitlement:** `com.boothbop.app.removewatermark`
  remains recognized so early non-consumable test purchases still restore.
- **Implementation:** StoreKit 2 plugin `BoothBopStore`
  (`ios/App/App/AppDelegate.swift`) -> `src/lib/storePlugin.ts` ->
  `src/lib/purchases.ts`.
- **Gating:** `isPro` in `App.tsx` controls all Pro UI and passes
  `watermark: false` to strip, print-sheet, GIF, boomerang, and video renderers
  for newly generated outputs.

## How It Behaves

- `refreshPro()` checks StoreKit current entitlements on launch and caches the
  result in `localStorage` (`bb.pro`) for instant/offline UI.
- `getProProduct()` loads the localized monthly product price for the paywall.
- `subscribeToPro()` purchases the monthly product.
- `restorePurchases()` restores either the monthly Pro entitlement or the legacy
  remove-watermark entitlement.
- Purchase/restore success clears cached GIF/video output so animated exports
  re-render without the watermark.

## Simulator Testing

1. Open Xcode -> Product -> Scheme -> Edit Scheme -> Run -> Options.
2. Set StoreKit Configuration to `BoothBop.storekit`.
3. Run the app, tap any locked Pro template/look/layout/prop/caption/HD export,
   then tap **Start Pro**.
4. Confirm the StoreKit test sheet shows `BoothBop Pro Monthly` at `$1.99`.
5. After purchase, confirm Pro templates unlock and BoothBop branding drops from
   newly exported strips, GIFs, boomerangs, and videos.
6. Test restore from Settings and the Pro screen.
7. Reset state with Xcode -> Debug -> StoreKit -> Manage Transactions -> delete.

## App Store Connect Setup

1. Agreements, Tax, and Banking: activate the Paid Applications agreement.
2. Create a subscription group named `BoothBop Pro`.
3. Add an auto-renewable subscription:
   - Reference Name: `BoothBop Pro Monthly`
   - Product ID: `com.boothbop.app.pro.monthly`
   - Duration: 1 month
   - Price: `$1.99`
   - Display Name: `BoothBop Pro Monthly`
   - Description: `Premium templates, Pro looks and props, custom captions, print sheets, HD exports, and watermark-free saved outputs.`
4. Add the app privacy/product screenshots required for IAP review.
5. Submit the first subscription with an app version that includes this build.

## Legacy Product

The old local StoreKit product remains in `ios/App/BoothBop.storekit`:

- Product ID: `com.boothbop.app.removewatermark`
- Type: non-consumable
- Price: `$0.99`

Do not sell this as the primary product going forward. Keep it only while early
testers/builds may have the old entitlement.
