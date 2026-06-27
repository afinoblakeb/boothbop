import { describe, expect, it } from "vitest";
import {
  cleanStyleCaption,
  normalizeFilterKey,
  normalizeLayout,
  normalizeSessionStyle,
  normalizeStickerKey,
  normalizeThemeKey,
  resolveStripCaption,
  resolveTemplateCaption,
} from "./style";

describe("style normalization", () => {
  it("normalizes individual style fields", () => {
    expect(normalizeLayout("2x2")).toBe("2x2");
    expect(normalizeLayout("poster")).toBe("4x1");
    expect(normalizeThemeKey("teal")).toBe("teal");
    expect(normalizeThemeKey("hotpink")).toBe("classic");
    expect(normalizeFilterKey("warm")).toBe("warm");
    expect(normalizeFilterKey("laser")).toBe("none");
    expect(normalizeStickerKey("party")).toBe("party");
    expect(normalizeStickerKey("laser")).toBe("none");
  });

  it("cleans captions for storage", () => {
    expect(cleanStyleCaption("  launch    party  ")).toBe("launch party");
    expect(cleanStyleCaption("x".repeat(80))).toHaveLength(28);
  });

  it("resolves template captions for free users", () => {
    expect(
      resolveStripCaption({
        isPro: false,
        customCaption: "Host Text",
        templateCaption: "Birthday Bash",
      }),
    ).toBe("Birthday Bash");
  });

  it("replaces brand tokens with the event name", () => {
    expect(resolveTemplateCaption("{brand}", "Acme Gala")).toBe("Acme Gala");
    expect(resolveTemplateCaption("{brand}", "")).toBe("");
    expect(
      resolveStripCaption({
        isPro: false,
        customCaption: "Host Text",
        templateCaption: "{brand}",
        eventName: "Launch Night",
      }),
    ).toBe("Launch Night");
  });

  it("lets Pro custom captions override template captions", () => {
    expect(
      resolveStripCaption({
        isPro: true,
        customCaption: "Host Text",
        templateCaption: "Birthday Bash",
        eventName: "Launch Night",
      }),
    ).toBe("Host Text");
    expect(
      resolveStripCaption({
        isPro: true,
        customCaption: " ",
        templateCaption: "Birthday Bash",
      }),
    ).toBe("Birthday Bash");
  });

  it("normalizes saved session styles", () => {
    expect(
      normalizeSessionStyle({
        layout: "story",
        themeKey: "rust",
        filter: "vintage",
        sticker: "party",
        caption: "  After   Party  ",
      }),
    ).toEqual({
      layout: "story",
      themeKey: "rust",
      filter: "vintage",
      sticker: "party",
      caption: "After Party",
    });
  });

  it("ignores non-style values", () => {
    expect(normalizeSessionStyle(null)).toBeUndefined();
    expect(normalizeSessionStyle({ title: "Birthday" })).toBeUndefined();
  });
});
