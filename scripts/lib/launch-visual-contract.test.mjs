import { describe, expect, it } from "vitest";
import {
  assertNoBlackLaunchFrame,
  isBoothBopHomeFrame,
} from "./launch-visual-contract.mjs";

describe("native launch visual contract", () => {
  it("rejects a black intermediate frame even if launch later succeeds", () => {
    expect(() =>
      assertNoBlackLaunchFrame("iPhone", {
        average: 2,
        brightRatio: 0.001,
      }),
    ).toThrow(/black frame/);
  });

  it("allows a light native launch frame while the web view starts", () => {
    expect(() =>
      assertNoBlackLaunchFrame("iPhone", {
        average: 205,
        brightRatio: 0.98,
      }),
    ).not.toThrow();
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
