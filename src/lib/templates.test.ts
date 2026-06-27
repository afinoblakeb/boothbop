import { describe, expect, it } from "vitest";
import { FILTERS, STICKERS } from "./render";
import { THEMES } from "./strip";
import {
  isPremiumFilter,
  isPremiumLayout,
  isPremiumSticker,
} from "./entitlements";
import {
  PREVIEW_DEMO_SET,
  STYLE_PRESETS,
  TEMPLATE_CATALOG,
  TEMPLATE_BACKLOG,
  TEMPLATE_CATEGORIES,
  TEMPLATE_PACKS,
  availableStylePresets,
  findStylePreset,
  isStylePresetAvailable,
  pickRandomStylePreset,
  presetsByCategory,
  stylePresetMetaLabel,
  stylePresetPackLabel,
  templateCategoryLabel,
  templatePackForPreset,
  type StylePreset,
} from "./templates";

const LAYOUTS = ["4x1", "2x2", "2x6", "4x6", "story"];

describe("style presets", () => {
  const allPresets: readonly StylePreset[] = TEMPLATE_CATALOG;

  it("keeps the implementation-first top 12 and exposes the full catalog", () => {
    expect(STYLE_PRESETS).toHaveLength(12);
    expect(TEMPLATE_BACKLOG).toHaveLength(18);
    expect(TEMPLATE_CATALOG).toHaveLength(30);
    expect(STYLE_PRESETS[0]).toMatchObject({
      id: "classic",
      layout: "4x1",
      theme: "classic",
      filter: "none",
      sticker: "none",
      pro: false,
    });
  });

  it("contains free and Pro presets", () => {
    expect(STYLE_PRESETS.filter((preset) => !preset.pro)).toHaveLength(6);
    expect(STYLE_PRESETS.filter((preset) => preset.pro)).toHaveLength(6);
    expect(TEMPLATE_CATALOG.filter((preset) => !preset.pro)).toHaveLength(14);
    expect(TEMPLATE_CATALOG.filter((preset) => preset.pro)).toHaveLength(16);
  });

  it("points every preset at valid renderer options", () => {
    for (const preset of allPresets) {
      expect(LAYOUTS).toContain(preset.layout);
      expect(Object.keys(THEMES)).toContain(preset.theme);
      expect(Object.keys(FILTERS)).toContain(preset.filter);
      expect(Object.keys(STICKERS)).toContain(preset.sticker);
      expect(TEMPLATE_CATEGORIES.map((category) => category.id)).toContain(
        preset.category,
      );
    }
  });

  it("uses unique ids across shipped and backlog presets", () => {
    const ids = allPresets.map((preset) => preset.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("finds shipped presets by id", () => {
    expect(findStylePreset("classic")?.label).toBe("Classic");
    expect(findStylePreset("goldenrod")?.label).toBe("Goldenrod");
    expect(findStylePreset("missing")).toBeNull();
  });

  it("groups the full catalog by category", () => {
    expect(presetsByCategory("all")).toEqual(TEMPLATE_CATALOG);
    expect(presetsByCategory("birthday").map((preset) => preset.id)).toEqual([
      "birthday-spark",
      "sweet-sixteen",
      "party-story",
      "confetti-pop",
      "make-a-wish",
    ]);
    expect(presetsByCategory("graduation").map((preset) => preset.id)).toEqual([
      "class-of-26",
      "tassel",
      "cum-laude",
      "we-did-it",
    ]);
    expect(presetsByCategory("friends").map((preset) => preset.id)).toEqual([
      "besties",
      "photo-dump",
      "weekend",
    ]);
  });

  it("keeps launch templates consumer-facing", () => {
    expect(TEMPLATE_CATEGORIES.map((category) => category.id)).not.toContain(
      "corporate",
    );
    for (const preset of allPresets) {
      expect(preset.caption ?? "").not.toContain("{brand}");
    }
  });

  it("has demo preview hints for every catalog preset", () => {
    for (const preset of TEMPLATE_CATALOG) {
      expect(PREVIEW_DEMO_SET[preset.id]).toBeGreaterThanOrEqual(1);
      expect(PREVIEW_DEMO_SET[preset.id]).toBeLessThanOrEqual(3);
    }
  });

  it("assigns every template to honest free or Pro pack metadata", () => {
    expect(TEMPLATE_PACKS.filter((pack) => !pack.pro)).toHaveLength(2);
    expect(TEMPLATE_PACKS.filter((pack) => pack.pro)).toHaveLength(7);

    for (const preset of TEMPLATE_CATALOG) {
      const pack = templatePackForPreset(preset);
      expect(pack).toBeDefined();
      expect(pack.pro).toBe(preset.pro);
      expect(stylePresetPackLabel(preset)).toContain(pack.label);
      expect(stylePresetPackLabel(preset)).toContain(pack.badge);
    }
  });

  it("formats consumer-facing template metadata labels", () => {
    expect(templateCategoryLabel("nightout")).toBe("Night Out");
    expect(templateCategoryLabel("friends")).toBe("Friends");
    expect(stylePresetMetaLabel(findStylePreset("party-story")!)).toBe(
      "Birthday / Story",
    );
    expect(stylePresetMetaLabel(findStylePreset("classic")!)).toBe(
      "Classic / Classic strip",
    );
  });

  it("marks premium presets consistently with entitlement rules", () => {
    for (const preset of allPresets) {
      const premium =
        isPremiumLayout(preset.layout) ||
        isPremiumFilter(preset.filter) ||
        isPremiumSticker(preset.sticker);
      expect(preset.pro).toBe(premium);
    }
  });

  it("only gates Pro presets", () => {
    const free = STYLE_PRESETS.find((preset) => !preset.pro)!;
    const pro = STYLE_PRESETS.find((preset) => preset.pro)!;
    expect(isStylePresetAvailable(free, false)).toBe(true);
    expect(isStylePresetAvailable(pro, false)).toBe(false);
    expect(isStylePresetAvailable(pro, true)).toBe(true);
  });

  it("picks random templates from the user's available tier", () => {
    const freePresets = availableStylePresets(false);
    const proPresets = availableStylePresets(true);
    expect(freePresets).toHaveLength(14);
    expect(freePresets.every((preset) => !preset.pro)).toBe(true);
    expect(proPresets).toHaveLength(TEMPLATE_CATALOG.length);
    expect(pickRandomStylePreset(false, () => 0).id).toBe(freePresets[0].id);
    expect(pickRandomStylePreset(false, () => 0.999).id).toBe(
      freePresets[freePresets.length - 1].id,
    );
    expect(pickRandomStylePreset(true, () => 0.999).id).toBe(
      TEMPLATE_CATALOG[TEMPLATE_CATALOG.length - 1].id,
    );
  });
});
