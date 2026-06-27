import type { FilterKey, StickerKey } from "./render";
import type { Layout } from "./strip";
import { THEMES } from "./strip";

export type TemplateCategory =
  | "classic"
  | "birthday"
  | "wedding"
  | "nightout"
  | "graduation"
  | "holiday"
  | "corporate";

export const TEMPLATE_CATEGORIES: { id: TemplateCategory; label: string }[] = [
  { id: "classic", label: "Classic" },
  { id: "birthday", label: "Birthday" },
  { id: "wedding", label: "Wedding" },
  { id: "nightout", label: "Night Out" },
  { id: "graduation", label: "Graduation" },
  { id: "holiday", label: "Holiday" },
  { id: "corporate", label: "Corporate" },
];

export interface StylePreset {
  id: string;
  label: string;
  pro: boolean;
  layout: Layout;
  theme: keyof typeof THEMES;
  filter: FilterKey;
  sticker: StickerKey;
  category: TemplateCategory;
  caption?: string;
}

// Which demo set a card/preview renders with (src/demo/setN-*.jpg).
// 1 = Birthday, 2 = Night Out, 3 = Friends. Purely a preview hint.
export const PREVIEW_DEMO_SET: Record<string, 1 | 2 | 3> = {
  classic: 3,
  noir: 2,
  foursquare: 3,
  "birthday-spark": 1,
  "just-married": 1,
  "neon-noir": 2,
  "sweet-sixteen": 1,
  vows: 1,
  "party-story": 1,
  midnight: 2,
  "golden-hour": 3,
  keynote: 3,
  goldenrod: 3,
  "sunday-best": 3,
  "confetti-pop": 1,
  "make-a-wish": 1,
  forever: 1,
  reception: 1,
  eternal: 1,
  "after-hours": 2,
  disco: 2,
  vip: 2,
  "class-of-26": 3,
  tassel: 3,
  "cum-laude": 3,
  "we-did-it": 3,
  "cocoa-cozy": 3,
  frostbite: 3,
  boardroom: 3,
  mixer: 3,
};

export const STYLE_PRESETS = [
  {
    id: "classic",
    label: "Classic",
    category: "classic",
    pro: false,
    layout: "4x1",
    theme: "classic",
    filter: "none",
    sticker: "none",
  },
  {
    id: "noir",
    label: "Noir",
    category: "classic",
    pro: false,
    layout: "4x1",
    theme: "carbon",
    filter: "mono",
    sticker: "none",
  },
  {
    id: "foursquare",
    label: "Foursquare",
    category: "classic",
    pro: false,
    layout: "2x2",
    theme: "classic",
    filter: "none",
    sticker: "none",
  },
  {
    id: "birthday-spark",
    label: "Birthday Spark",
    category: "birthday",
    pro: false,
    layout: "4x1",
    theme: "mustard",
    filter: "warm",
    sticker: "sparkles",
    caption: "Birthday Bash",
  },
  {
    id: "just-married",
    label: "Just Married",
    category: "wedding",
    pro: false,
    layout: "2x2",
    theme: "classic",
    filter: "warm",
    sticker: "sparkles",
    caption: "Just Married",
  },
  {
    id: "neon-noir",
    label: "Neon Noir",
    category: "nightout",
    pro: false,
    layout: "4x1",
    theme: "carbon",
    filter: "mono",
    sticker: "sparkles",
    caption: "After Dark",
  },
  {
    id: "sweet-sixteen",
    label: "Sweet Sixteen",
    category: "birthday",
    pro: true,
    layout: "2x6",
    theme: "teal",
    filter: "glam",
    sticker: "hearts",
    caption: "Sweet 16",
  },
  {
    id: "vows",
    label: "Vows",
    category: "wedding",
    pro: true,
    layout: "2x6",
    theme: "classic",
    filter: "vintage",
    sticker: "hearts",
    caption: "Vows",
  },
  {
    id: "party-story",
    label: "Party Story",
    category: "birthday",
    pro: true,
    layout: "story",
    theme: "carbon",
    filter: "glam",
    sticker: "party",
    caption: "Let's Party",
  },
  {
    id: "midnight",
    label: "Midnight",
    category: "nightout",
    pro: true,
    layout: "story",
    theme: "carbon",
    filter: "vintage",
    sticker: "sparkles",
    caption: "Midnight",
  },
  {
    id: "golden-hour",
    label: "Golden Hour",
    category: "holiday",
    pro: true,
    layout: "4x6",
    theme: "mustard",
    filter: "glam",
    sticker: "sparkles",
    caption: "Cheers",
  },
  {
    id: "keynote",
    label: "Keynote",
    category: "corporate",
    pro: true,
    layout: "4x6",
    theme: "classic",
    filter: "mono",
    sticker: "none",
    caption: "{brand}",
  },
] as const satisfies readonly StylePreset[];

export const TEMPLATE_BACKLOG = [
  {
    id: "goldenrod",
    label: "Goldenrod",
    category: "classic",
    pro: false,
    layout: "4x1",
    theme: "mustard",
    filter: "warm",
    sticker: "none",
  },
  {
    id: "sunday-best",
    label: "Sunday Best",
    category: "classic",
    pro: true,
    layout: "2x6",
    theme: "olive",
    filter: "vintage",
    sticker: "none",
  },
  {
    id: "confetti-pop",
    label: "Confetti Pop",
    category: "birthday",
    pro: true,
    layout: "2x2",
    theme: "rust",
    filter: "warm",
    sticker: "party",
    caption: "Let's Party",
  },
  {
    id: "make-a-wish",
    label: "Make a Wish",
    category: "birthday",
    pro: true,
    layout: "4x1",
    theme: "teal",
    filter: "glam",
    sticker: "sparkles",
    caption: "Make a Wish",
  },
  {
    id: "forever",
    label: "Forever",
    category: "wedding",
    pro: false,
    layout: "2x2",
    theme: "mustard",
    filter: "warm",
    sticker: "sparkles",
    caption: "Forever",
  },
  {
    id: "reception",
    label: "Reception",
    category: "wedding",
    pro: true,
    layout: "4x6",
    theme: "olive",
    filter: "warm",
    sticker: "hearts",
    caption: "Cheers",
  },
  {
    id: "eternal",
    label: "Eternal",
    category: "wedding",
    pro: true,
    layout: "story",
    theme: "rust",
    filter: "glam",
    sticker: "hearts",
    caption: "Always",
  },
  {
    id: "after-hours",
    label: "After Hours",
    category: "nightout",
    pro: false,
    layout: "2x2",
    theme: "rust",
    filter: "mono",
    sticker: "none",
    caption: "After Hours",
  },
  {
    id: "disco",
    label: "Disco",
    category: "nightout",
    pro: true,
    layout: "4x1",
    theme: "teal",
    filter: "glam",
    sticker: "party",
    caption: "Disco",
  },
  {
    id: "vip",
    label: "VIP",
    category: "nightout",
    pro: true,
    layout: "2x6",
    theme: "carbon",
    filter: "glam",
    sticker: "sparkles",
    caption: "VIP",
  },
  {
    id: "class-of-26",
    label: "Class Of '26",
    category: "graduation",
    pro: false,
    layout: "4x1",
    theme: "mustard",
    filter: "warm",
    sticker: "none",
    caption: "Class of '26",
  },
  {
    id: "tassel",
    label: "Tassel",
    category: "graduation",
    pro: true,
    layout: "2x2",
    theme: "olive",
    filter: "vintage",
    sticker: "sparkles",
    caption: "Grad",
  },
  {
    id: "cum-laude",
    label: "Cum Laude",
    category: "graduation",
    pro: true,
    layout: "2x6",
    theme: "carbon",
    filter: "mono",
    sticker: "none",
    caption: "Congrats",
  },
  {
    id: "we-did-it",
    label: "We Did It",
    category: "graduation",
    pro: true,
    layout: "story",
    theme: "teal",
    filter: "glam",
    sticker: "sparkles",
    caption: "We Did It",
  },
  {
    id: "cocoa-cozy",
    label: "Cocoa & Cozy",
    category: "holiday",
    pro: false,
    layout: "4x1",
    theme: "rust",
    filter: "warm",
    sticker: "none",
    caption: "Happy Holidays",
  },
  {
    id: "frostbite",
    label: "Frostbite",
    category: "holiday",
    pro: false,
    layout: "2x2",
    theme: "teal",
    filter: "mono",
    sticker: "sparkles",
    caption: "Let It Snow",
  },
  {
    id: "boardroom",
    label: "Boardroom",
    category: "corporate",
    pro: false,
    layout: "4x1",
    theme: "carbon",
    filter: "mono",
    sticker: "none",
    caption: "{brand}",
  },
  {
    id: "mixer",
    label: "Mixer",
    category: "corporate",
    pro: false,
    layout: "2x2",
    theme: "olive",
    filter: "none",
    sticker: "none",
    caption: "{brand}",
  },
] as const satisfies readonly StylePreset[];

export const TEMPLATE_CATALOG = [
  ...STYLE_PRESETS,
  ...TEMPLATE_BACKLOG,
] as const satisfies readonly StylePreset[];

export type StylePresetId = (typeof TEMPLATE_CATALOG)[number]["id"];

export function findStylePreset(id: string): StylePreset | null {
  return TEMPLATE_CATALOG.find((preset) => preset.id === id) ?? null;
}

export function isStylePresetAvailable(
  preset: Pick<StylePreset, "pro">,
  isPro: boolean,
): boolean {
  return !preset.pro || isPro;
}

export function presetsByCategory(
  category: TemplateCategory | "all",
): readonly StylePreset[] {
  return category === "all"
    ? TEMPLATE_CATALOG
    : TEMPLATE_CATALOG.filter((preset) => preset.category === category);
}
