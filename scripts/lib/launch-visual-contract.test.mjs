import { describe, expect, it } from "vitest";
import {
  assertNoSustainedBlackLaunch,
  isBlackLaunchFrame,
  isBoothBopReadyFrame,
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
      isBoothBopReadyFrame({
        average: 210,
        standardDeviation: 52,
        brandOrangeRatio: 0.07,
        lightSurfaceRatio: 0.74,
        maxOrangeRowRatio: 0.62,
      }),
    ).toBe(true);
    expect(
      isBoothBopReadyFrame({
        average: 205,
        standardDeviation: 44,
        brandOrangeRatio: 0.02,
        lightSurfaceRatio: 0.82,
        maxOrangeRowRatio: 0.18,
      }),
    ).toBe(false);
  });

  it("recognizes the native direct-to-camera surface as launch-ready", () => {
    expect(
      isBoothBopReadyFrame({
        average: 82,
        standardDeviation: 104,
        brandOrangeRatio: 0.008,
        lightSurfaceRatio: 0.31,
        darkSurfaceRatio: 0.55,
        maxOrangeRowRatio: 0.13,
      }),
    ).toBe(true);
  });
});
