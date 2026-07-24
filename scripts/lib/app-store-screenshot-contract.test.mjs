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
        simulatorWindow: {
          width: 494,
          height: 1054,
          crop: { left: 6, top: 52, width: 482, height: 1002 },
        },
      },
      {
        displayType: "APP_IPHONE_61",
        label: "iphone-63",
        viewport: { width: 393, height: 852 },
        scale: 3,
        pixels: { width: 1179, height: 2556 },
        simulatorWindow: {
          width: 666,
          height: 1390,
          crop: { left: 15, top: 52, width: 636, height: 1338 },
        },
      },
      {
        displayType: "APP_IPHONE_55",
        label: "iphone-55",
        viewport: { width: 414, height: 736 },
        scale: 3,
        pixels: { width: 1242, height: 2208 },
        simulatorWindow: {
          width: 452,
          height: 950,
          crop: { left: 6, top: 52, width: 440, height: 898 },
        },
      },
    ]);
  });

  it("captures the complete consumer story for each device", () => {
    expect(APP_STORE_SCREENSHOT_SCENES).toEqual([
      {
        id: "camera",
        fileName: "1-camera.png",
        title: "Your pocket photo booth.",
        subtitle: "Four poses. One tap.",
      },
      {
        id: "classic-strip",
        fileName: "2-classic-strip.png",
        title: "Four poses. One classic strip.",
        subtitle: "Print-ready 2x6 keepsakes.",
      },
      {
        id: "looks",
        fileName: "3-looks.png",
        title: "Make every pose yours.",
        subtitle: "Five distinct looks. No clutter.",
      },
      {
        id: "gif-boom",
        fileName: "4-gif-boom.png",
        title: "Made to move.",
        subtitle: "GIF, Boom, and social-ready video.",
      },
      {
        id: "my-photos",
        fileName: "5-my-photos.png",
        title: "Private by design.",
        subtitle: "Your photos stay on your device.",
      },
    ]);
    expect(expectedScreenshotCount()).toBe(15);
  });
});
