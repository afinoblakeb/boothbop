import { describe, expect, it } from "vitest";
import {
  canUseProFeature,
  isPremiumFilter,
  isPremiumLayout,
  isPremiumQuality,
  isPremiumSticker,
} from "./entitlements";

describe("entitlements", () => {
  it("gates Pro features on the Pro flag", () => {
    expect(canUseProFeature(false)).toBe(false);
    expect(canUseProFeature(true)).toBe(true);
  });

  it("marks Pro looks as premium filters", () => {
    expect(isPremiumFilter("glam")).toBe(true);
    expect(isPremiumFilter("vintage")).toBe(true);
    expect(isPremiumFilter("glam-booth")).toBe(true);
    expect(isPremiumFilter("vintage-sepia")).toBe(true);
    expect(isPremiumFilter("high-contrast")).toBe(true);
    expect(isPremiumFilter("dreamy-pastel")).toBe(true);
    expect(isPremiumFilter("night-out")).toBe(true);
    expect(isPremiumFilter("magazine")).toBe(true);
    expect(isPremiumFilter("warm")).toBe(false);
    expect(isPremiumFilter("soft-flash")).toBe(false);
    expect(isPremiumFilter("cool-studio")).toBe(false);
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

  it("marks premium sticker packs", () => {
    expect(isPremiumSticker("hearts")).toBe(true);
    expect(isPremiumSticker("party")).toBe(true);
    expect(isPremiumSticker("wedding")).toBe(true);
    expect(isPremiumSticker("graduation")).toBe(true);
    expect(isPremiumSticker("holiday")).toBe(true);
    expect(isPremiumSticker("corporate")).toBe(true);
    expect(isPremiumSticker("birthday")).toBe(false);
    expect(isPremiumSticker("sparkles")).toBe(false);
  });
});
