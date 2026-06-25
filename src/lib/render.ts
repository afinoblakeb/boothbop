// Shared canvas rendering helpers for every export path. Keep visual treatment
// here so strips, GIFs, web video, native video, autosave, and gallery reopens
// do not drift.

export type FilterKey = "none" | "mono" | "warm" | "glam" | "vintage";
export type MotionMode = "loop" | "boomerang";

export interface FilterDef {
  label: string;
  css: string;
  overlay?: "warm" | "vignette";
}

export const FILTERS: Record<FilterKey, FilterDef> = {
  none: { label: "Original", css: "none" },
  mono: { label: "Mono", css: "grayscale(1) contrast(1.14)" },
  warm: {
    label: "Warm",
    css: "sepia(0.28) saturate(1.22) contrast(1.06) brightness(1.03)",
    overlay: "warm",
  },
  glam: {
    label: "Glam",
    css: "grayscale(1) contrast(1.28) brightness(1.08)",
  },
  vintage: {
    label: "Vintage",
    css: "sepia(0.42) saturate(0.86) contrast(1.12)",
    overlay: "vignette",
  },
};

const FILTER_KEY = "bb.filter";

export function loadFilter(): FilterKey {
  const v = localStorage.getItem(FILTER_KEY);
  return isFilterKey(v) ? v : "none";
}

export function saveFilter(filter: FilterKey): void {
  localStorage.setItem(FILTER_KEY, filter);
}

function isFilterKey(v: string | null): v is FilterKey {
  return (
    v === "none" ||
    v === "mono" ||
    v === "warm" ||
    v === "glam" ||
    v === "vintage"
  );
}

export interface DrawFrameOptions {
  filter?: FilterKey;
}

export interface DrawRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function drawFrame(
  ctx: CanvasRenderingContext2D,
  frame: HTMLCanvasElement,
  dest: DrawRect,
  { filter = "none" }: DrawFrameOptions = {},
): void {
  const def = FILTERS[filter];
  ctx.save();
  try {
    ctx.filter = def.css;
  } catch {
    /* older canvas contexts: no filter support */
  }
  ctx.drawImage(
    frame,
    0,
    0,
    frame.width,
    frame.height,
    dest.x,
    dest.y,
    dest.width,
    dest.height,
  );
  ctx.restore();
  drawOverlay(ctx, dest, def.overlay);
}

function drawOverlay(
  ctx: CanvasRenderingContext2D,
  { x, y, width, height }: DrawRect,
  overlay: FilterDef["overlay"],
) {
  if (!overlay) return;
  ctx.save();
  if (overlay === "warm") {
    ctx.globalAlpha = 0.1;
    ctx.fillStyle = "#e85a1a";
    ctx.fillRect(x, y, width, height);
  } else {
    const gradient = ctx.createRadialGradient(
      x + width / 2,
      y + height / 2,
      Math.min(width, height) * 0.22,
      x + width / 2,
      y + height / 2,
      Math.max(width, height) * 0.72,
    );
    gradient.addColorStop(0, "rgba(255,255,255,0)");
    gradient.addColorStop(1, "rgba(0,0,0,0.38)");
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, width, height);
  }
  ctx.restore();
}

export function renderFrame(
  frame: HTMLCanvasElement,
  size: number,
  options: DrawFrameOptions = {},
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  drawFrame(ctx, frame, { x: 0, y: 0, width: size, height: size }, options);
  return canvas;
}

export function motionSequence<T>(frames: T[], mode: MotionMode): T[] {
  if (mode === "loop" || frames.length <= 2) return [...frames];
  return [...frames, ...frames.slice(1, -1).reverse()];
}
