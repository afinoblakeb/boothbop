import type { FilterKey, StickerKey } from "./render";
import type { Layout } from "./strip";
import type { Quality } from "./settings";

export type ProFeature =
  | "customCaption"
  | "highQuality"
  | "premiumFilter"
  | "premiumLayout"
  | "premiumSticker"
  | "premiumPreset"
  | "removeWatermark";

export const PREMIUM_FILTERS: readonly FilterKey[] = [
  "glam",
  "vintage",
  "glam-booth",
  "vintage-sepia",
  "high-contrast",
  "dreamy-pastel",
  "night-out",
  "magazine",
];
export const PREMIUM_LAYOUTS: readonly Layout[] = ["2x6", "4x6", "story"];
export const PREMIUM_STICKERS: readonly StickerKey[] = [
  "hearts",
  "party",
  "wedding",
  "graduation",
  "holiday",
  "corporate",
];

export function canUseProFeature(isPro: boolean): boolean {
  return isPro;
}

export function isPremiumFilter(filter: FilterKey): boolean {
  return PREMIUM_FILTERS.includes(filter);
}

export function isPremiumLayout(layout: Layout): boolean {
  return PREMIUM_LAYOUTS.includes(layout);
}

export function isPremiumSticker(sticker: StickerKey): boolean {
  return PREMIUM_STICKERS.includes(sticker);
}

export function isPremiumQuality(quality: Quality): boolean {
  return quality === "high";
}
