import { beforeEach, describe, expect, it } from "vitest";
import {
  REMOVE_WATERMARK_ID,
  buyRemoveWatermark,
  getRemoveWatermarkProduct,
  isProCached,
  refreshPro,
  restorePurchases,
} from "./purchases";

beforeEach(() => localStorage.clear());

describe("purchases", () => {
  it("isProCached reflects the bb.pro flag", () => {
    expect(isProCached()).toBe(false);
    localStorage.setItem("bb.pro", "1");
    expect(isProCached()).toBe(true);
  });

  it("targets the remove-watermark non-consumable", () => {
    expect(REMOVE_WATERMARK_ID).toBe("com.boothbop.app.removewatermark");
  });

  it("every IAP action no-ops on web (not a native shell)", async () => {
    expect(await refreshPro()).toBe(false);
    expect(await getRemoveWatermarkProduct()).toBeNull();
    expect(await buyRemoveWatermark()).toBe(false);
    expect(await restorePurchases()).toBe(false);
  });
});
