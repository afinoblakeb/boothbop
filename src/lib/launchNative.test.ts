import { beforeEach, describe, expect, it, vi } from "vitest";

const hideLaunch = vi.fn(async () => undefined);
const hideSplash = vi.fn(async () => undefined);

vi.mock("@capacitor/core", () => ({
  registerPlugin: () => ({ hide: hideLaunch }),
}));

vi.mock("@capacitor/splash-screen", () => ({
  SplashScreen: { hide: hideSplash },
}));

describe("native launch ownership", () => {
  beforeEach(() => {
    hideLaunch.mockClear();
    hideSplash.mockClear();
  });

  it("keeps the UIKit launch surface until Capacitor's splash is hidden", async () => {
    const { hideNativeLaunchSurface } = await import("./launchNative");

    await hideNativeLaunchSurface();

    expect(hideSplash).toHaveBeenCalledOnce();
    expect(hideLaunch).toHaveBeenCalledOnce();
    expect(hideSplash.mock.invocationCallOrder[0]).toBeLessThan(
      hideLaunch.mock.invocationCallOrder[0],
    );
  });
});
