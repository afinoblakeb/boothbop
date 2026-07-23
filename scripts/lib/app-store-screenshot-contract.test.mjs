import { describe, expect, it } from "vitest";
import {
  APP_STORE_SCREENSHOT_DEVICES,
  APP_STORE_SCREENSHOT_SCENES,
  expectedScreenshotCount,
} from "./app-store-screenshot-contract.mjs";

describe("App Store screenshot contract", () => {
  it("covers current large, standard, and legacy compact iPhones", () => {
    expect(APP_STORE_SCREENSHOT_DEVICES).toEqual([
      {
        displayType: "APP_IPHONE_67",
        label: "iphone-69",
        viewport: { width: 440, height: 956 },
        scale: 3,
        pixels: { width: 1320, height: 2868 },
      },
      {
        displayType: "APP_IPHONE_61",
        label: "iphone-61",
        viewport: { width: 390, height: 844 },
        scale: 3,
        pixels: { width: 1170, height: 2532 },
      },
      {
        displayType: "APP_IPHONE_55",
        label: "iphone-55",
        viewport: { width: 414, height: 736 },
        scale: 3,
        pixels: { width: 1242, height: 2208 },
      },
    ]);
  });

  it("captures the complete consumer story for each device", () => {
    expect(APP_STORE_SCREENSHOT_SCENES.map((scene) => scene.fileName)).toEqual([
      "1-camera.png",
      "2-classic-strip.png",
      "3-looks.png",
      "4-gif-boom.png",
      "5-my-photos.png",
    ]);
    expect(expectedScreenshotCount()).toBe(15);
  });
});
