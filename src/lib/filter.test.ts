import { describe, expect, it } from "vitest";
import { FILTERS, applyFilterToRgba } from "./filter";

const pixel = (r: number, g: number, b: number, a = 255) =>
  new Uint8ClampedArray([r, g, b, a]);

describe("photo filters", () => {
  it("offers five distinct looks plus the untouched original", () => {
    expect(FILTERS.map((filter) => filter.id)).toEqual([
      "original",
      "warm",
      "cool",
      "bw",
      "sepia",
      "inverse",
    ]);
  });

  it("leaves original pixels unchanged without mutating the input", () => {
    const input = pixel(40, 100, 180, 77);
    const output = applyFilterToRgba(input, "original");
    expect([...output]).toEqual([40, 100, 180, 77]);
    expect(output).not.toBe(input);
  });

  it("makes warm and cool meaningfully different", () => {
    const input = pixel(100, 120, 140);
    const warm = applyFilterToRgba(input, "warm");
    const cool = applyFilterToRgba(input, "cool");
    expect(warm[0]).toBeGreaterThan(input[0]);
    expect(warm[2]).toBeLessThan(input[2]);
    expect(cool[0]).toBeLessThan(input[0]);
    expect(cool[2]).toBeGreaterThan(input[2]);
  });

  it("produces neutral black and white", () => {
    const output = applyFilterToRgba(pixel(30, 120, 220), "bw");
    expect(output[0]).toBe(output[1]);
    expect(output[1]).toBe(output[2]);
  });

  it("uses a sepia matrix and preserves alpha", () => {
    const output = applyFilterToRgba(pixel(100, 150, 200, 41), "sepia");
    expect([...output]).toEqual([192, 171, 134, 41]);
  });

  it("inverts color channels while preserving alpha", () => {
    expect([...applyFilterToRgba(pixel(10, 20, 30, 40), "inverse")]).toEqual([
      245, 235, 225, 40,
    ]);
  });
});
