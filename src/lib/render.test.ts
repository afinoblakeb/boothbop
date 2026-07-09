import { beforeEach, describe, expect, it } from "vitest";
import {
  FILTERS,
  STICKERS,
  applyFilterToRgba,
  loadFilter,
  loadSticker,
  motionSequence,
  saveFilter,
  saveSticker,
  type FilterKey,
} from "./render";

beforeEach(() => localStorage.clear());

describe("filter settings", () => {
  it("defaults to original when storage is empty", () => {
    expect(loadFilter()).toBe("none");
  });

  it("round-trips a selected look", () => {
    saveFilter("cool-studio");
    expect(loadFilter()).toBe("cool-studio");
  });

  it("treats unknown stored looks as original", () => {
    localStorage.setItem("bb.filter", "bad-look");
    expect(loadFilter()).toBe("none");
  });

  it("exposes user-facing filter labels", () => {
    expect(Object.keys(FILTERS)).toEqual([
      "none",
      "mono",
      "warm",
      "glam",
      "vintage",
      "soft-flash",
      "warm-film",
      "clean-bw",
      "cool-studio",
      "glam-booth",
      "vintage-sepia",
      "high-contrast",
      "dreamy-pastel",
      "night-out",
      "magazine",
    ]);
    for (const f of Object.values(FILTERS)) {
      expect(f.label.length).toBeGreaterThan(0);
    }
  });

  it("applies look filters without depending on canvas filter support", () => {
    const original = [120, 80, 40, 255] as const;

    const mono = applyFilterToRgba(original, "mono");
    expect(mono[0]).toBe(mono[1]);
    expect(mono[1]).toBe(mono[2]);
    expect(mono).not.toEqual(original);

    const warm = applyFilterToRgba(original, "warm");
    expect(warm).not.toEqual(original);
    expect(warm[0]).toBeGreaterThan(warm[2]);
  });

  it("keeps each non-original look profile visually distinct", () => {
    const samples = [
      [58, 38, 24, 255],
      [120, 80, 40, 255],
      [210, 176, 138, 255],
    ] as const;
    const signatures = Object.keys(FILTERS)
      .filter((key) => key !== "none")
      .map((key) =>
        samples
          .flatMap((sample) => applyFilterToRgba(sample, key as FilterKey))
          .join(","),
      );

    expect(new Set(signatures).size).toBe(signatures.length);
  });
});

describe("sticker settings", () => {
  it("defaults to no sticker when storage is empty", () => {
    expect(loadSticker()).toBe("none");
  });

  it("round-trips a selected sticker", () => {
    saveSticker("holiday");
    expect(loadSticker()).toBe("holiday");
  });

  it("treats unknown stored stickers as none", () => {
    localStorage.setItem("bb.sticker", "laser");
    expect(loadSticker()).toBe("none");
  });

  it("exposes user-facing sticker labels", () => {
    expect(Object.keys(STICKERS)).toEqual([
      "none",
      "birthday",
      "sparkles",
      "shades",
      "stache",
      "monster",
      "hearts",
      "party",
      "wedding",
      "graduation",
      "holiday",
      "friends",
      "crown",
      "neon",
    ]);
    for (const sticker of Object.values(STICKERS)) {
      expect(sticker.label.length).toBeGreaterThan(0);
    }
  });
});

describe("motionSequence", () => {
  it("leaves a standard loop in capture order", () => {
    expect(motionSequence([1, 2, 3, 4], "loop")).toEqual([1, 2, 3, 4]);
  });

  it("builds a forward/back boomerang without duplicate endpoints", () => {
    expect(motionSequence([1, 2, 3, 4], "boomerang")).toEqual([
      1, 2, 3, 4, 3, 2,
    ]);
  });
});
