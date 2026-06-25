import { describe, expect, it } from "vitest";
import {
  cleanStyleCaption,
  normalizeFilterKey,
  normalizeLayout,
  normalizeSessionStyle,
  normalizeThemeKey,
} from "./style";

describe("style normalization", () => {
  it("normalizes individual style fields", () => {
    expect(normalizeLayout("2x2")).toBe("2x2");
    expect(normalizeLayout("poster")).toBe("4x1");
    expect(normalizeThemeKey("teal")).toBe("teal");
    expect(normalizeThemeKey("hotpink")).toBe("classic");
    expect(normalizeFilterKey("warm")).toBe("warm");
    expect(normalizeFilterKey("laser")).toBe("none");
  });

  it("cleans captions for storage", () => {
    expect(cleanStyleCaption("  launch    party  ")).toBe("launch party");
    expect(cleanStyleCaption("x".repeat(80))).toHaveLength(28);
  });

  it("normalizes saved session styles", () => {
    expect(
      normalizeSessionStyle({
        layout: "story",
        themeKey: "rust",
        filter: "vintage",
        caption: "  After   Party  ",
      }),
    ).toEqual({
      layout: "story",
      themeKey: "rust",
      filter: "vintage",
      caption: "After Party",
    });
  });

  it("ignores non-style values", () => {
    expect(normalizeSessionStyle(null)).toBeUndefined();
    expect(normalizeSessionStyle({ title: "Birthday" })).toBeUndefined();
  });
});
