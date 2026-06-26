import { beforeEach, describe, expect, it } from "vitest";
import {
  LEGACY_REMOVE_WATERMARK_ID,
  PRO_ENTITLEMENT_IDS,
  PRO_MONTHLY_ID,
  getProProduct,
  isProCached,
  refreshPro,
  restorePurchases,
  subscribeToPro,
} from "./purchases";

beforeEach(() => localStorage.clear());

describe("purchases", () => {
  it("isProCached reflects the bb.pro flag", () => {
    expect(isProCached()).toBe(false);
    localStorage.setItem("bb.pro", "1");
    expect(isProCached()).toBe(true);
  });

  it("targets monthly Pro while honoring the legacy watermark unlock", () => {
    expect(PRO_MONTHLY_ID).toBe("com.boothbop.app.pro.monthly");
    expect(LEGACY_REMOVE_WATERMARK_ID).toBe("com.boothbop.app.removewatermark");
    expect(PRO_ENTITLEMENT_IDS).toEqual([
      PRO_MONTHLY_ID,
      LEGACY_REMOVE_WATERMARK_ID,
    ]);
  });

  it("every IAP action no-ops on web (not a native shell)", async () => {
    expect(await refreshPro()).toBe(false);
    expect(await getProProduct()).toBeNull();
    expect(await subscribeToPro()).toBe(false);
    expect(await restorePurchases()).toBe(false);
  });
});
