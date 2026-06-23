import { afterEach, describe, expect, it, vi } from "vitest";
import { canShareFiles, isIOS, probeShareFiles } from "./platform";

/** Replace navigator for one test; restored automatically in afterEach. */
function stubNavigator(nav: Partial<Navigator>) {
  vi.stubGlobal("navigator", nav as Navigator);
}

afterEach(() => vi.unstubAllGlobals());

describe("isIOS", () => {
  it("is true for an iPhone user agent", () => {
    stubNavigator({ userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)" });
    expect(isIOS()).toBe(true);
  });

  it("is true for iPadOS masquerading as macOS (touch + MacIntel)", () => {
    stubNavigator({
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X)",
      platform: "MacIntel",
      maxTouchPoints: 5,
    });
    expect(isIOS()).toBe(true);
  });

  it("is false on a real desktop Mac (no touch)", () => {
    stubNavigator({
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X)",
      platform: "MacIntel",
      maxTouchPoints: 0,
    });
    expect(isIOS()).toBe(false);
  });
});

describe("canShareFiles", () => {
  const file = new File([new Uint8Array([0])], "x.png", { type: "image/png" });

  it("is true when the browser supports share + canShare(files)", () => {
    stubNavigator({ share: vi.fn(), canShare: () => true });
    expect(canShareFiles(file)).toBe(true);
  });

  it("is false when share exists but canShare rejects files", () => {
    stubNavigator({ share: vi.fn(), canShare: () => false });
    expect(canShareFiles(file)).toBe(false);
  });

  it("is false when navigator.share is missing (most desktops)", () => {
    stubNavigator({});
    expect(canShareFiles(file)).toBe(false);
  });
});

describe("probeShareFiles", () => {
  it("mirrors canShareFiles using a throwaway probe file", () => {
    stubNavigator({ share: vi.fn(), canShare: () => true });
    expect(probeShareFiles()).toBe(true);
    stubNavigator({});
    expect(probeShareFiles()).toBe(false);
  });
});
