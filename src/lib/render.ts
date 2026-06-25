// Shared canvas rendering helpers for every export path. Keep visual treatment
// here so strips, GIFs, web video, native video, autosave, and gallery reopens
// do not drift.

export type FilterKey = "none" | "mono" | "warm" | "glam" | "vintage";
export type StickerKey = "none" | "sparkles" | "hearts" | "party";
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

export interface StickerDef {
  label: string;
}

export const STICKERS: Record<StickerKey, StickerDef> = {
  none: { label: "None" },
  sparkles: { label: "Spark" },
  hearts: { label: "Hearts" },
  party: { label: "Party" },
};

const FILTER_KEY = "bb.filter";
const STICKER_KEY = "bb.sticker";

export function loadFilter(): FilterKey {
  const v = localStorage.getItem(FILTER_KEY);
  return isFilterKey(v) ? v : "none";
}

export function saveFilter(filter: FilterKey): void {
  localStorage.setItem(FILTER_KEY, filter);
}

export function loadSticker(): StickerKey {
  const v = localStorage.getItem(STICKER_KEY);
  return isStickerKey(v) ? v : "none";
}

export function saveSticker(sticker: StickerKey): void {
  localStorage.setItem(STICKER_KEY, sticker);
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

function isStickerKey(v: string | null): v is StickerKey {
  return v === "none" || v === "sparkles" || v === "hearts" || v === "party";
}

export interface DrawFrameOptions {
  filter?: FilterKey;
  sticker?: StickerKey;
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
  { filter = "none", sticker = "none" }: DrawFrameOptions = {},
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
  drawSticker(ctx, dest, sticker);
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

function drawSticker(
  ctx: CanvasRenderingContext2D,
  rect: DrawRect,
  sticker: StickerKey,
) {
  if (sticker === "none") return;
  const scale = Math.min(rect.width, rect.height) / 640;
  ctx.save();
  if (sticker === "sparkles") {
    drawSparkle(ctx, rect, 0.18, 0.18, 28 * scale, "#f7d154");
    drawSparkle(ctx, rect, 0.78, 0.27, 20 * scale, "#f6e7cf");
    drawSparkle(ctx, rect, 0.28, 0.78, 18 * scale, "#e85a1a");
  } else if (sticker === "hearts") {
    drawHeart(ctx, rect, 0.78, 0.18, 38 * scale, "#e85a1a");
    drawHeart(ctx, rect, 0.2, 0.78, 30 * scale, "#f7d154");
  } else {
    drawConfetti(ctx, rect, scale);
  }
  ctx.restore();
}

function drawSparkle(
  ctx: CanvasRenderingContext2D,
  rect: DrawRect,
  rx: number,
  ry: number,
  radius: number,
  color: string,
) {
  const x = rect.x + rect.width * rx;
  const y = rect.y + rect.height * ry;
  ctx.fillStyle = color;
  ctx.strokeStyle = "#111111";
  ctx.lineWidth = Math.max(2, radius * 0.12);
  ctx.beginPath();
  ctx.moveTo(x, y - radius);
  ctx.lineTo(x + radius * 0.28, y - radius * 0.28);
  ctx.lineTo(x + radius, y);
  ctx.lineTo(x + radius * 0.28, y + radius * 0.28);
  ctx.lineTo(x, y + radius);
  ctx.lineTo(x - radius * 0.28, y + radius * 0.28);
  ctx.lineTo(x - radius, y);
  ctx.lineTo(x - radius * 0.28, y - radius * 0.28);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function drawHeart(
  ctx: CanvasRenderingContext2D,
  rect: DrawRect,
  rx: number,
  ry: number,
  size: number,
  color: string,
) {
  const x = rect.x + rect.width * rx;
  const y = rect.y + rect.height * ry;
  ctx.fillStyle = color;
  ctx.strokeStyle = "#111111";
  ctx.lineWidth = Math.max(2, size * 0.08);
  ctx.beginPath();
  ctx.moveTo(x, y + size * 0.34);
  ctx.bezierCurveTo(
    x - size,
    y - size * 0.2,
    x - size * 0.45,
    y - size,
    x,
    y - size * 0.45,
  );
  ctx.bezierCurveTo(
    x + size * 0.45,
    y - size,
    x + size,
    y - size * 0.2,
    x,
    y + size * 0.34,
  );
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function drawConfetti(
  ctx: CanvasRenderingContext2D,
  rect: DrawRect,
  scale: number,
) {
  const pieces = [
    [0.13, 0.16, "#f7d154", -0.3],
    [0.31, 0.1, "#3e7c78", 0.35],
    [0.74, 0.14, "#e85a1a", -0.2],
    [0.86, 0.33, "#f6e7cf", 0.25],
    [0.17, 0.72, "#e85a1a", 0.2],
    [0.7, 0.82, "#f7d154", -0.35],
    [0.9, 0.76, "#3e7c78", 0.3],
  ] as const;
  for (const [rx, ry, color, rotation] of pieces) {
    const x = rect.x + rect.width * rx;
    const y = rect.y + rect.height * ry;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.fillStyle = color;
    ctx.strokeStyle = "#111111";
    ctx.lineWidth = Math.max(1.5, 2 * scale);
    ctx.fillRect(-12 * scale, -5 * scale, 24 * scale, 10 * scale);
    ctx.strokeRect(-12 * scale, -5 * scale, 24 * scale, 10 * scale);
    ctx.restore();
  }
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
