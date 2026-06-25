import { describe, expect, it } from "vitest";
import { FILTERS } from "./render";
import { THEMES } from "./strip";
import {
  STYLE_PRESETS,
  findStylePreset,
  isStylePresetAvailable,
} from "./templates";

const LAYOUTS = ["4x1", "2x2", "2x6", "4x6", "story"];

describe("style presets", () => {
  it("contains free and Pro presets", () => {
    expect(STYLE_PRESETS.some((preset) => !preset.pro)).toBe(true);
    expect(STYLE_PRESETS.some((preset) => preset.pro)).toBe(true);
  });

  it("points every preset at valid renderer options", () => {
    for (const preset of STYLE_PRESETS) {
      expect(LAYOUTS).toContain(preset.layout);
      expect(Object.keys(THEMES)).toContain(preset.theme);
      expect(Object.keys(FILTERS)).toContain(preset.filter);
    }
  });

  it("finds presets by id", () => {
    expect(findStylePreset("classic")?.label).toBe("Classic");
    expect(findStylePreset("missing")).toBeNull();
  });

  it("only gates Pro presets", () => {
    const free = STYLE_PRESETS.find((preset) => !preset.pro)!;
    const pro = STYLE_PRESETS.find((preset) => preset.pro)!;
    expect(isStylePresetAvailable(free, false)).toBe(true);
    expect(isStylePresetAvailable(pro, false)).toBe(false);
    expect(isStylePresetAvailable(pro, true)).toBe(true);
  });
});
