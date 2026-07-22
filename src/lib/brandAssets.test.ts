import { describe, expect, it } from "vitest";
import sharp from "sharp";

const APP_CANVAS = [244, 245, 245] as const;

describe("generated brand assets", () => {
  it("keeps the native splash wordmark inside a portrait-safe width", async () => {
    const { data, info } = await sharp("assets/splash.png")
      .resize(400, 400, { fit: "fill" })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    let minX = info.width;
    let maxX = -1;
    for (let y = 0; y < info.height; y += 1) {
      for (let x = 0; x < info.width; x += 1) {
        const offset = (y * info.width + x) * info.channels;
        const distance =
          Math.abs(data[offset] - APP_CANVAS[0]) +
          Math.abs(data[offset + 1] - APP_CANVAS[1]) +
          Math.abs(data[offset + 2] - APP_CANVAS[2]);
        if (distance > 20) {
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
        }
      }
    }

    expect(maxX).toBeGreaterThan(minX);
    expect((maxX - minX + 1) / info.width).toBeLessThanOrEqual(0.36);
  });
});
