// In-app purchase logic for BoothBop Pro. Wraps the native StoreKit plugin
// (BoothBopStore) and exposes a simple isPro state. The source of truth is
// StoreKit's `currentEntitlements` (re-checked on launch, works offline, syncs
// across the user's devices); we mirror it into localStorage for instant UI.
// No-ops on web (IAP is native-only).
import { isNativeShell } from "./platform";

export const PRO_MONTHLY_ID = "com.boothbop.app.pro.monthly";
export const LEGACY_REMOVE_WATERMARK_ID = "com.boothbop.app.removewatermark";

export const PRO_ENTITLEMENT_IDS = [
  PRO_MONTHLY_ID,
  LEGACY_REMOVE_WATERMARK_ID,
] as const;

const PRO_KEY = "bb.pro";

export interface ProProduct {
  id: string;
  displayName: string;
  price: string; // localized, e.g. "$0.99"
}

/** Cached Pro flag — instant, offline. Refreshed from StoreKit on launch. */
export function isProCached(): boolean {
  return localStorage.getItem(PRO_KEY) === "1";
}

function setProCached(on: boolean): void {
  localStorage.setItem(PRO_KEY, on ? "1" : "0");
}

/** Re-read the entitlement from StoreKit (native). Returns false on web. */
export async function refreshPro(): Promise<boolean> {
  if (!isNativeShell()) return false;
  try {
    const { BoothBopStore } = await import("./storePlugin");
    const owned = await Promise.all(
      PRO_ENTITLEMENT_IDS.map(async (productId) => {
        const { purchased } = await BoothBopStore.isPurchased({ productId });
        return purchased;
      }),
    );
    const purchased = owned.some(Boolean);
    setProCached(purchased);
    return purchased;
  } catch {
    return isProCached();
  }
}

/** Fetch the localized product (for showing the real price). Null on web. */
export async function getProProduct(): Promise<ProProduct | null> {
  if (!isNativeShell()) return null;
  try {
    const { BoothBopStore } = await import("./storePlugin");
    const { products } = await BoothBopStore.getProducts({
      productIds: [PRO_MONTHLY_ID],
    });
    return products[0] ?? null;
  } catch {
    return null;
  }
}

/** Run the purchase flow. Returns true if the user now owns it. */
export async function subscribeToPro(): Promise<boolean> {
  if (!isNativeShell()) return false;
  const { BoothBopStore } = await import("./storePlugin");
  const { purchased } = await BoothBopStore.purchase({
    productId: PRO_MONTHLY_ID,
  });
  if (purchased) setProCached(true);
  return purchased;
}

/** Restore a prior purchase (App Store Guideline 3.1.1 requirement). */
export async function restorePurchases(): Promise<boolean> {
  if (!isNativeShell()) return false;
  const { BoothBopStore } = await import("./storePlugin");
  const { restored } = await BoothBopStore.restore();
  setProCached(restored);
  return restored;
}
