// Shared canvas rendering helpers for every export path. Keep visual treatment
// here so strips, GIFs, web video, native video, autosave, and gallery reopens
// do not drift.

export type FilterKey =
  | "none"
  | "mono"
  | "warm"
  | "glam"
  | "vintage"
  | "soft-flash"
  | "warm-film"
  | "clean-bw"
  | "cool-studio"
  | "glam-booth"
  | "vintage-sepia"
  | "high-contrast"
  | "dreamy-pastel"
  | "night-out"
  | "magazine";
export type StickerKey =
  | "none"
  | "birthday"
  | "sparkles"
  | "hearts"
  | "party"
  | "wedding"
  | "graduation"
  | "holiday"
  | "friends";
export type MotionMode = "loop" | "boomerang";

export interface FilterDef {
  label: string;
  css: string;
  overlay?: "warm" | "vignette" | { color: string; opacity: number };
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
  "soft-flash": {
    label: "Soft Flash",
    css: "brightness(1.12) contrast(0.96) saturate(0.95)",
    overlay: { color: "#ffffff", opacity: 0.08 },
  },
  "warm-film": {
    label: "Warm Film",
    css: "sepia(0.32) saturate(1.25) contrast(1.05) brightness(1.02)",
    overlay: { color: "#e8a04a", opacity: 0.1 },
  },
  "clean-bw": {
    label: "Clean B&W",
    css: "grayscale(1) contrast(1.08) brightness(1.03)",
  },
  "cool-studio": {
    label: "Cool Studio",
    css: "saturate(1.05) contrast(1.1) brightness(1.02) hue-rotate(-8deg)",
    overlay: { color: "#3e7c78", opacity: 0.08 },
  },
  "glam-booth": {
    label: "Glam Booth",
    css: "grayscale(1) contrast(1.3) brightness(1.12)",
    overlay: { color: "#ffffff", opacity: 0.06 },
  },
  "vintage-sepia": {
    label: "Vintage Sepia",
    css: "sepia(0.5) saturate(0.8) contrast(1.14) brightness(0.98)",
    overlay: "vignette",
  },
  "high-contrast": {
    label: "High Contrast",
    css: "contrast(1.32) saturate(1.18) brightness(1)",
  },
  "dreamy-pastel": {
    label: "Dreamy Pastel",
    css: "saturate(0.82) contrast(0.9) brightness(1.1)",
    overlay: { color: "#f3c9d6", opacity: 0.12 },
  },
  "night-out": {
    label: "Night Out",
    css: "contrast(1.2) saturate(1.1) brightness(0.92)",
    overlay: { color: "#8f3b1e", opacity: 0.14 },
  },
  magazine: {
    label: "Magazine",
    css: "grayscale(0.3) contrast(1.22) saturate(0.9) brightness(1.04)",
  },
};

export interface StickerDef {
  label: string;
}

export const STICKERS: Record<StickerKey, StickerDef> = {
  none: { label: "None" },
  birthday: { label: "Birthday" },
  sparkles: { label: "Spark" },
  hearts: { label: "Hearts" },
  party: { label: "Party" },
  wedding: { label: "Wedding" },
  graduation: { label: "Grad" },
  holiday: { label: "Holiday" },
  friends: { label: "Friends" },
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
  return typeof v === "string" && v in FILTERS;
}

function isStickerKey(v: string | null): v is StickerKey {
  return typeof v === "string" && v in STICKERS;
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
  } else if (overlay === "vignette") {
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
  } else {
    ctx.globalAlpha = overlay.opacity;
    ctx.fillStyle = overlay.color;
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
  } else if (sticker === "birthday") {
    drawBalloon(ctx, rect, 0.17, 0.23, 38 * scale, "#e85a1a");
    drawSparkle(ctx, rect, 0.78, 0.18, 20 * scale, "#f7d154");
    drawConfetti(ctx, rect, scale, "top");
  } else if (sticker === "hearts") {
    drawHeart(ctx, rect, 0.78, 0.18, 38 * scale, "#e85a1a");
    drawHeart(ctx, rect, 0.2, 0.78, 30 * scale, "#f7d154");
  } else if (sticker === "party") {
    drawConfetti(ctx, rect, scale, "bands");
    drawBalloon(ctx, rect, 0.86, 0.22, 30 * scale, "#3e7c78");
    drawHashtag(ctx, rect, 0.18, 0.78, 26 * scale, "#111111");
  } else if (sticker === "wedding") {
    drawHeart(ctx, rect, 0.17, 0.18, 28 * scale, "#8f3b1e");
    drawRing(ctx, rect, 0.82, 0.2, 26 * scale, "#d9a441");
    drawSparkle(ctx, rect, 0.18, 0.8, 16 * scale, "#f7d154");
  } else if (sticker === "graduation") {
    drawGradCap(ctx, rect, 0.2, 0.82, 34 * scale, "#111111");
    drawRosette(ctx, rect, 0.82, 0.78, 26 * scale, "#e85a1a");
    drawSparkle(ctx, rect, 0.8, 0.18, 18 * scale, "#f7d154");
  } else if (sticker === "holiday") {
    drawSnowflake(ctx, rect, 0.18, 0.18, 30 * scale, "#3e7c78");
    drawSnowflake(ctx, rect, 0.82, 0.22, 22 * scale, "#f6e7cf");
    drawGift(ctx, rect, 0.82, 0.8, 28 * scale, "#8f3b1e");
  } else {
    drawRosette(ctx, rect, 0.16, 0.8, 26 * scale, "#111111");
    drawHashtag(ctx, rect, 0.82, 0.78, 26 * scale, "#e85a1a");
    drawSparkle(ctx, rect, 0.82, 0.18, 18 * scale, "#d9a441");
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
  mode: "all" | "top" | "bands" = "all",
) {
  let pieces: [number, number, string, number][] = [
    [0.13, 0.16, "#f7d154", -0.3],
    [0.31, 0.1, "#3e7c78", 0.35],
    [0.74, 0.14, "#e85a1a", -0.2],
    [0.86, 0.33, "#f6e7cf", 0.25],
    [0.17, 0.72, "#e85a1a", 0.2],
    [0.7, 0.82, "#f7d154", -0.35],
    [0.9, 0.76, "#3e7c78", 0.3],
  ];
  if (mode === "top") pieces = pieces.filter(([, ry]) => ry < 0.4);
  if (mode === "bands")
    pieces = pieces.filter(([, ry]) => ry < 0.36 || ry > 0.68);
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

function drawBalloon(
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
  ctx.ellipse(x, y, size * 0.52, size * 0.64, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - size * 0.12, y + size * 0.58);
  ctx.lineTo(x + size * 0.12, y + size * 0.58);
  ctx.lineTo(x, y + size * 0.82);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, y + size * 0.82);
  ctx.quadraticCurveTo(x - size * 0.22, y + size, x, y + size * 1.18);
  ctx.stroke();
}

function drawRing(
  ctx: CanvasRenderingContext2D,
  rect: DrawRect,
  rx: number,
  ry: number,
  size: number,
  color: string,
) {
  const x = rect.x + rect.width * rx;
  const y = rect.y + rect.height * ry;
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(3, size * 0.16);
  ctx.beginPath();
  ctx.arc(x, y + size * 0.15, size * 0.45, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.strokeStyle = "#111111";
  ctx.lineWidth = Math.max(1.5, size * 0.07);
  ctx.beginPath();
  ctx.moveTo(x, y - size * 0.64);
  ctx.lineTo(x + size * 0.32, y - size * 0.24);
  ctx.lineTo(x - size * 0.32, y - size * 0.24);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function drawGradCap(
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
  ctx.moveTo(x - size * 0.75, y - size * 0.18);
  ctx.lineTo(x, y - size * 0.5);
  ctx.lineTo(x + size * 0.75, y - size * 0.18);
  ctx.lineTo(x, y + size * 0.14);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeRect(x - size * 0.42, y + size * 0.02, size * 0.84, size * 0.36);
  ctx.beginPath();
  ctx.moveTo(x + size * 0.75, y - size * 0.18);
  ctx.lineTo(x + size * 0.75, y + size * 0.42);
  ctx.stroke();
}

function drawSnowflake(
  ctx: CanvasRenderingContext2D,
  rect: DrawRect,
  rx: number,
  ry: number,
  size: number,
  color: string,
) {
  const x = rect.x + rect.width * rx;
  const y = rect.y + rect.height * ry;
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(2, size * 0.08);
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i;
    ctx.beginPath();
    ctx.moveTo(
      x - Math.cos(angle) * size * 0.55,
      y - Math.sin(angle) * size * 0.55,
    );
    ctx.lineTo(
      x + Math.cos(angle) * size * 0.55,
      y + Math.sin(angle) * size * 0.55,
    );
    ctx.stroke();
  }
}

function drawGift(
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
  ctx.fillRect(x - size * 0.45, y - size * 0.3, size * 0.9, size * 0.72);
  ctx.strokeRect(x - size * 0.45, y - size * 0.3, size * 0.9, size * 0.72);
  ctx.beginPath();
  ctx.moveTo(x, y - size * 0.3);
  ctx.lineTo(x, y + size * 0.42);
  ctx.moveTo(x - size * 0.45, y - size * 0.08);
  ctx.lineTo(x + size * 0.45, y - size * 0.08);
  ctx.stroke();
}

function drawRosette(
  ctx: CanvasRenderingContext2D,
  rect: DrawRect,
  rx: number,
  ry: number,
  size: number,
  color: string,
) {
  const x = rect.x + rect.width * rx;
  const y = rect.y + rect.height * ry;
  drawSparkle(ctx, rect, rx, ry, size * 0.62, color);
  ctx.fillStyle = color;
  ctx.strokeStyle = "#111111";
  ctx.lineWidth = Math.max(2, size * 0.08);
  ctx.beginPath();
  ctx.arc(x, y, size * 0.34, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

function drawHashtag(
  ctx: CanvasRenderingContext2D,
  rect: DrawRect,
  rx: number,
  ry: number,
  size: number,
  color: string,
) {
  const x = rect.x + rect.width * rx;
  const y = rect.y + rect.height * ry;
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(2, size * 0.12);
  ctx.beginPath();
  ctx.moveTo(x - size * 0.25, y - size * 0.48);
  ctx.lineTo(x - size * 0.4, y + size * 0.48);
  ctx.moveTo(x + size * 0.3, y - size * 0.48);
  ctx.lineTo(x + size * 0.15, y + size * 0.48);
  ctx.moveTo(x - size * 0.52, y - size * 0.18);
  ctx.lineTo(x + size * 0.52, y - size * 0.18);
  ctx.moveTo(x - size * 0.58, y + size * 0.22);
  ctx.lineTo(x + size * 0.46, y + size * 0.22);
  ctx.stroke();
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
