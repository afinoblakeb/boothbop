// ROUND2_TEMPLATE_CATALOG.ts
//
// Build-ready catalog reference for the Round 2 template gallery. Port this data
// into `src/lib/templates.ts` during implementation; do not import from docs.
// Extends the existing `StylePreset` with two ADDITIVE optional fields
// (`category`, `caption`) so every current preset keeps working. No field here
// requires a renderer we do not have, EXCEPT the baked-caption footer for free
// strips -- see RENDERING note T-CAP at the bottom; until that lands, `caption`
// still renders in the watermark-free gallery previews and in Pro exports (both
// already pass `watermark:false`).
//
// Types referenced (unchanged): Layout (src/lib/strip.ts),
// FilterKey/StickerKey (src/lib/render.ts), THEMES keys (src/lib/strip.ts).

import type { FilterKey, StickerKey } from "./render";
import type { Layout } from "./strip";
import { THEMES } from "./strip";

// NEW -- gallery grouping. Matches the category tabs in TemplateGalleryScreen.
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
  category?: TemplateCategory; // NEW -- groups the gallery tabs
  caption?: string; // NEW -- baked footer caption; `{brand}` = Settings brand/event name
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
};

// ------------------------- TOP 12 -- build first -------------------------
// 6 free + 6 pro. Order here is the gallery's "All" order.

export const STYLE_PRESETS = [
  // -- Free --------------------------------------------------------------
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

  // -- Pro ---------------------------------------------------------------
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

// ------------------------- BACKLOG -- ship after the 12 ------------------
// Real constants so they can be flipped into the gallery one drop at a time.
// Same renderer; no new fields. Add ids to PREVIEW_DEMO_SET as they ship.

export const TEMPLATE_BACKLOG = [
  // Classic
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
  // Birthday
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
  // Wedding
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
  // Night Out
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
  // Graduation
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
  // Holiday
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
  // Corporate
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

// ------------------------- Helpers (unchanged signatures) ---------------

export type StylePresetId = (typeof STYLE_PRESETS)[number]["id"];

export function findStylePreset(id: string): StylePreset | null {
  return (
    STYLE_PRESETS.find((p) => p.id === id) ??
    TEMPLATE_BACKLOG.find((p) => p.id === id) ??
    null
  );
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
    ? STYLE_PRESETS
    : STYLE_PRESETS.filter((p) => p.category === category);
}

// ------------------------- Renderer dependency --------------------------
// T-CAP: To show a baked `caption` on FREE (watermarked) strips, composeStrip()
// must draw a caption line in the footer alongside the brand logo (today the
// watermark branch ignores `caption`). Until T-CAP ships, baked captions render
// only where watermark:false (gallery previews + Pro exports). No other field in
// this file needs renderer work. See ROUND2_RENDERING_SPECS.md.
