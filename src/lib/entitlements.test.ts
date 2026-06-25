import { describe, expect, it } from "vitest";
import {
  canUseProFeature,
  isPremiumFilter,
  isPremiumLayout,
  isPremiumQuality,
} from "./entitlements";

describe("entitlements", () => {
  it("gates Pro features on the Pro flag", () => {
    expect(canUseProFeature(false)).toBe(false);
    expect(canUseProFeature(true)).toBe(true);
  });

  it("marks glam and vintage as premium filters", () => {
    expect(isPremiumFilter("glam")).toBe(true);
    expect(isPremiumFilter("vintage")).toBe(true);
    expect(isPremiumFilter("warm")).toBe(false);
  });

  it("marks large/specialty layouts as premium", () => {
    expect(isPremiumLayout("2x6")).toBe(true);
    expect(isPremiumLayout("4x6")).toBe(true);
    expect(isPremiumLayout("story")).toBe(true);
    expect(isPremiumLayout("2x2")).toBe(false);
  });

  it("treats high quality as premium", () => {
    expect(isPremiumQuality("high")).toBe(true);
    expect(isPremiumQuality("standard")).toBe(false);
  });
});
