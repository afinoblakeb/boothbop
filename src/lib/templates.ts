import type { FilterKey } from "./render";
import type { Layout } from "./strip";
import { THEMES } from "./strip";

export interface StylePreset {
  id: string;
  label: string;
  pro: boolean;
  layout: Layout;
  theme: keyof typeof THEMES;
  filter: FilterKey;
}

export const STYLE_PRESETS = [
  {
    id: "classic",
    label: "Classic",
    pro: false,
    layout: "4x1",
    theme: "classic",
    filter: "none",
  },
  {
    id: "party-grid",
    label: "Party Grid",
    pro: false,
    layout: "2x2",
    theme: "teal",
    filter: "warm",
  },
  {
    id: "bw-strip",
    label: "B&W Strip",
    pro: false,
    layout: "4x1",
    theme: "carbon",
    filter: "mono",
  },
  {
    id: "story-glam",
    label: "Story Glam",
    pro: true,
    layout: "story",
    theme: "rust",
    filter: "glam",
  },
  {
    id: "wedding-2x6",
    label: "Wedding 2x6",
    pro: true,
    layout: "2x6",
    theme: "mustard",
    filter: "warm",
  },
  {
    id: "retro-4x6",
    label: "Retro 4x6",
    pro: true,
    layout: "4x6",
    theme: "olive",
    filter: "vintage",
  },
] as const satisfies readonly StylePreset[];

export type StylePresetId = (typeof STYLE_PRESETS)[number]["id"];

export function findStylePreset(id: string): StylePreset | null {
  return STYLE_PRESETS.find((preset) => preset.id === id) ?? null;
}

export function isStylePresetAvailable(
  preset: Pick<StylePreset, "pro">,
  isPro: boolean,
): boolean {
  return !preset.pro || isPro;
}
