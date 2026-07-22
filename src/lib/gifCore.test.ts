import { describe, expect, it } from "vitest";
import { blendRgba, encodeGifPixels } from "./gifCore";

describe("GIF worker core", () => {
  it("alpha-composites watermark pixels and ignores transparent pixels", () => {
    const background = new Uint8ClampedArray([
      20, 40, 60, 255, 10, 20, 30, 255,
    ]);
    const overlay = new Uint8ClampedArray([220, 140, 60, 128, 255, 0, 0, 0]);
    blendRgba(background, overlay);
    expect([...background]).toEqual([120, 90, 60, 255, 10, 20, 30, 255]);
  });

  it("encodes a valid GIF from reusable source frames", () => {
    const red = new Uint8ClampedArray([255, 0, 0, 255]);
    const blue = new Uint8ClampedArray([0, 0, 255, 255]);
    const bytes = encodeGifPixels({
      frames: [red, blue],
      frameIndexes: [0, 1, 0],
      size: 1,
      delay: 100,
      filter: "original",
      watermark: null,
    });
    expect(new TextDecoder().decode(bytes.slice(0, 6))).toBe("GIF89a");
    expect(bytes.length).toBeGreaterThan(20);
  });
});
