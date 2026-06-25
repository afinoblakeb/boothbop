import type { FilterKey } from "./render";
import type { Layout } from "./strip";
import type { Quality } from "./settings";

export type ProFeature =
  | "customCaption"
  | "highQuality"
  | "premiumFilter"
  | "premiumLayout"
  | "premiumPreset"
  | "removeWatermark";

export const PREMIUM_FILTERS: readonly FilterKey[] = ["glam", "vintage"];
export const PREMIUM_LAYOUTS: readonly Layout[] = ["2x6", "4x6", "story"];

export function canUseProFeature(isPro: boolean): boolean {
  return isPro;
}

export function isPremiumFilter(filter: FilterKey): boolean {
  return PREMIUM_FILTERS.includes(filter);
}

export function isPremiumLayout(layout: Layout): boolean {
  return PREMIUM_LAYOUTS.includes(layout);
}

export function isPremiumQuality(quality: Quality): boolean {
  return quality === "high";
}
