import { describe, expect, it } from "vitest";
import {
  assertNoSustainedBlackLaunch,
  isBlackLaunchFrame,
  isBoothBopHomeFrame,
} from "./launch-visual-contract.mjs";

describe("native launch visual contract", () => {
  it("identifies black frames from screenshot luminance", () => {
    expect(
      isBlackLaunchFrame({
        average: 2,
        brightRatio: 0.001,
      }),
    ).toBe(true);
    expect(
      isBlackLaunchFrame({
        average: 205,
        brightRatio: 0.98,
      }),
    ).toBe(false);
  });

  it("rejects sustained black launch frames but allows one OS transition sample", () => {
    expect(() => assertNoSustainedBlackLaunch("iPhone", 1)).not.toThrow();
    expect(() => assertNoSustainedBlackLaunch("iPhone", 2)).toThrow(
      /2 consecutive black frames/,
    );
  });

  it("recognizes the loaded BoothBop home screen, not just the splash", () => {
    expect(
      isBoothBopHomeFrame({
        average: 210,
        standardDeviation: 52,
        brandOrangeRatio: 0.07,
        lightSurfaceRatio: 0.74,
        maxOrangeRowRatio: 0.62,
      }),
    ).toBe(true);
    expect(
      isBoothBopHomeFrame({
        average: 205,
        standardDeviation: 44,
        brandOrangeRatio: 0.02,
        lightSurfaceRatio: 0.82,
        maxOrangeRowRatio: 0.18,
      }),
    ).toBe(false);
  });
});
