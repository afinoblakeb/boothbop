import { describe, expect, it } from "vitest";
import { APP_STORE_SCREENSHOT_DEVICES } from "./app-store-screenshot-contract.mjs";
import {
  officialDevicePlacement,
  simulatorSourceFileName,
} from "./app-store-screenshot-composition.mjs";

describe("App Store screenshot Simulator composition", () => {
  it("maps App Store scene names to official Simulator window captures", () => {
    expect(simulatorSourceFileName("1-camera.png")).toBe("1-camera-window.png");
  });

  it.each(APP_STORE_SCREENSHOT_DEVICES)(
    "places the untouched $label Simulator device below the campaign header",
    (device) => {
      const placement = officialDevicePlacement(
        device.pixels,
        device.simulatorWindow.crop,
      );

      expect(placement.width).toBeLessThan(device.pixels.width);
      expect(placement.height).toBeLessThan(device.pixels.height);
      expect(placement.left).toBeGreaterThan(0);
      expect(placement.top).toBeGreaterThan(placement.headerBottom);
      expect(placement.left + placement.width).toBeLessThanOrEqual(
        device.pixels.width,
      );
      expect(placement.top + placement.height).toBeLessThanOrEqual(
        device.pixels.height,
      );
    },
  );
});
