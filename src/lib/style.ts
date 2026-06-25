import { FILTERS, type FilterKey } from "./render";
import { LAYOUTS, THEMES, type Layout } from "./strip";

export type ThemeKey = keyof typeof THEMES;

export interface SessionStyle {
  layout: Layout;
  themeKey: ThemeKey;
  filter: FilterKey;
  caption?: string;
}

export const STYLE_CAPTION_MAX = 28;

export function cleanStyleCaption(caption: string): string {
  return caption.replace(/\s+/g, " ").trim().slice(0, STYLE_CAPTION_MAX);
}

export function normalizeLayout(value: unknown): Layout {
  return LAYOUTS.includes(value as Layout) ? (value as Layout) : "4x1";
}

export function normalizeThemeKey(value: unknown): ThemeKey {
  return typeof value === "string" && value in THEMES ? value : "classic";
}

export function normalizeFilterKey(value: unknown): FilterKey {
  return typeof value === "string" && value in FILTERS
    ? (value as FilterKey)
    : "none";
}

export function normalizeSessionStyle(
  value: unknown,
): SessionStyle | undefined {
  if (!isRecord(value)) return undefined;
  if (
    !("layout" in value) &&
    !("themeKey" in value) &&
    !("filter" in value) &&
    !("caption" in value)
  ) {
    return undefined;
  }

  const caption =
    typeof value.caption === "string"
      ? cleanStyleCaption(value.caption)
      : undefined;
  return {
    layout: normalizeLayout(value.layout),
    themeKey: normalizeThemeKey(value.themeKey),
    filter: normalizeFilterKey(value.filter),
    ...(caption ? { caption } : {}),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
