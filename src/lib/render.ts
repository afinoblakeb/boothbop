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

interface LevelSettings {
  black?: number;
  white?: number;
  gamma?: number;
}

interface FilterRecipe {
  levels?: LevelSettings;
  exposure?: number;
  brightness?: number;
  contrast?: number;
  saturation?: number;
  grayscale?: number;
  sepia?: number;
  temperature?: number;
  tint?: number;
  fade?: number;
  hueRotate?: number;
}

export interface FilterDef {
  label: string;
  css: string;
  recipe: FilterRecipe;
  overlay?: "warm" | "vignette" | { color: string; opacity: number };
}

export const FILTERS: Record<FilterKey, FilterDef> = {
  none: { label: "Original", css: "none", recipe: {} },
  mono: {
    label: "Classic B&W",
    css: "grayscale(1) contrast(1.18)",
    recipe: {
      levels: { black: 12, white: 242, gamma: 1.02 },
      grayscale: 1,
      contrast: 1.18,
      fade: 2,
    },
  },
  warm: {
    label: "Golden Hour",
    css: "sepia(0.24) saturate(1.2) contrast(1.08) brightness(1.05)",
    recipe: {
      levels: { black: 6, white: 246, gamma: 1.08 },
      exposure: 0.08,
      contrast: 1.08,
      saturation: 1.2,
      sepia: 0.16,
      temperature: 18,
    },
    overlay: "warm",
  },
  glam: {
    label: "Studio Glam",
    css: "contrast(1.18) brightness(1.1) saturate(0.92)",
    recipe: {
      levels: { black: 8, white: 248, gamma: 1.14 },
      exposure: 0.1,
      contrast: 1.18,
      saturation: 0.92,
      tint: 5,
      fade: 4,
    },
  },
  vintage: {
    label: "Faded Film",
    css: "sepia(0.34) saturate(0.78) contrast(1.04)",
    recipe: {
      levels: { black: 18, white: 232, gamma: 0.94 },
      contrast: 1.04,
      saturation: 0.78,
      sepia: 0.3,
      temperature: 8,
      fade: 22,
    },
    overlay: "vignette",
  },
  "soft-flash": {
    label: "Soft Flash",
    css: "brightness(1.12) contrast(0.96) saturate(0.95)",
    recipe: {
      levels: { black: 4, white: 252, gamma: 1.16 },
      exposure: 0.14,
      contrast: 0.92,
      saturation: 0.94,
      fade: 7,
    },
    overlay: { color: "#ffffff", opacity: 0.08 },
  },
  "warm-film": {
    label: "Color Print",
    css: "sepia(0.22) saturate(1.28) contrast(1.1) brightness(1.02)",
    recipe: {
      levels: { black: 10, white: 240, gamma: 1 },
      exposure: 0.03,
      contrast: 1.1,
      saturation: 1.28,
      sepia: 0.14,
      temperature: 14,
      fade: 6,
    },
    overlay: { color: "#e8a04a", opacity: 0.1 },
  },
  "clean-bw": {
    label: "Clean B&W",
    css: "grayscale(1) contrast(1.08) brightness(1.03)",
    recipe: {
      levels: { black: 5, white: 250, gamma: 1.08 },
      grayscale: 1,
      exposure: 0.04,
      contrast: 1.08,
    },
  },
  "cool-studio": {
    label: "Cool Studio",
    css: "saturate(1.05) contrast(1.1) brightness(1.02) hue-rotate(-8deg)",
    recipe: {
      levels: { black: 8, white: 246, gamma: 1.04 },
      exposure: 0.04,
      contrast: 1.1,
      saturation: 1.05,
      temperature: -14,
      tint: 4,
      hueRotate: -6,
    },
    overlay: { color: "#3e7c78", opacity: 0.08 },
  },
  "glam-booth": {
    label: "Flash Booth",
    css: "grayscale(1) contrast(1.34) brightness(1.12)",
    recipe: {
      levels: { black: 20, white: 238, gamma: 1.08 },
      grayscale: 1,
      exposure: 0.1,
      contrast: 1.34,
      fade: 3,
    },
    overlay: { color: "#ffffff", opacity: 0.06 },
  },
  "vintage-sepia": {
    label: "Sepia Print",
    css: "sepia(0.5) saturate(0.8) contrast(1.14) brightness(0.98)",
    recipe: {
      levels: { black: 14, white: 228, gamma: 0.92 },
      contrast: 1.12,
      saturation: 0.72,
      sepia: 0.52,
      temperature: 10,
      fade: 18,
    },
    overlay: "vignette",
  },
  "high-contrast": {
    label: "Chrome Pop",
    css: "contrast(1.34) saturate(1.2)",
    recipe: {
      levels: { black: 22, white: 238, gamma: 1 },
      contrast: 1.32,
      saturation: 1.2,
    },
  },
  "dreamy-pastel": {
    label: "Dream Pop",
    css: "saturate(0.82) contrast(0.86) brightness(1.12)",
    recipe: {
      levels: { black: 0, white: 255, gamma: 1.16 },
      exposure: 0.12,
      contrast: 0.86,
      saturation: 0.82,
      tint: 10,
      fade: 24,
    },
    overlay: { color: "#f3c9d6", opacity: 0.12 },
  },
  "night-out": {
    label: "Night Out",
    css: "contrast(1.2) saturate(1.1) brightness(0.92)",
    recipe: {
      levels: { black: 18, white: 236, gamma: 0.86 },
      exposure: -0.1,
      contrast: 1.24,
      saturation: 1.12,
      temperature: 6,
      tint: 8,
    },
    overlay: { color: "#8f3b1e", opacity: 0.14 },
  },
  magazine: {
    label: "Editorial",
    css: "grayscale(0.25) contrast(1.24) saturate(0.9) brightness(1.04)",
    recipe: {
      levels: { black: 16, white: 246, gamma: 1.03 },
      grayscale: 0.25,
      exposure: 0.04,
      contrast: 1.24,
      saturation: 0.9,
    },
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

type Rgba = readonly [number, number, number, number];

const clampByte = (value: number) =>
  Math.max(0, Math.min(255, Math.round(value)));

function luminance(r: number, g: number, b: number) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function applyBrightness(rgb: [number, number, number], amount: number) {
  rgb[0] *= amount;
  rgb[1] *= amount;
  rgb[2] *= amount;
}

function applyExposure(rgb: [number, number, number], stops: number) {
  applyBrightness(rgb, Math.pow(2, stops));
}

function applyLevels(
  rgb: [number, number, number],
  { black = 0, white = 255, gamma = 1 }: LevelSettings,
) {
  const range = Math.max(1, white - black);
  for (let i = 0; i < rgb.length; i += 1) {
    const normalized = Math.max(0, Math.min(1, (rgb[i] - black) / range));
    rgb[i] = Math.pow(normalized, 1 / gamma) * 255;
  }
}

function applyContrast(rgb: [number, number, number], amount: number) {
  rgb[0] = (rgb[0] - 128) * amount + 128;
  rgb[1] = (rgb[1] - 128) * amount + 128;
  rgb[2] = (rgb[2] - 128) * amount + 128;
}

function applySaturation(rgb: [number, number, number], amount: number) {
  const luma = luminance(rgb[0], rgb[1], rgb[2]);
  rgb[0] = luma + (rgb[0] - luma) * amount;
  rgb[1] = luma + (rgb[1] - luma) * amount;
  rgb[2] = luma + (rgb[2] - luma) * amount;
}

function applyGrayscale(rgb: [number, number, number], amount: number) {
  const luma = luminance(rgb[0], rgb[1], rgb[2]);
  rgb[0] = rgb[0] * (1 - amount) + luma * amount;
  rgb[1] = rgb[1] * (1 - amount) + luma * amount;
  rgb[2] = rgb[2] * (1 - amount) + luma * amount;
}

function applySepia(rgb: [number, number, number], amount: number) {
  const [r, g, b] = rgb;
  const sepiaR = r * 0.393 + g * 0.769 + b * 0.189;
  const sepiaG = r * 0.349 + g * 0.686 + b * 0.168;
  const sepiaB = r * 0.272 + g * 0.534 + b * 0.131;
  rgb[0] = r * (1 - amount) + sepiaR * amount;
  rgb[1] = g * (1 - amount) + sepiaG * amount;
  rgb[2] = b * (1 - amount) + sepiaB * amount;
}

function applyHueRotate(rgb: [number, number, number], degrees: number) {
  const angle = (degrees * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const [r, g, b] = rgb;
  rgb[0] =
    (0.213 + cos * 0.787 - sin * 0.213) * r +
    (0.715 - cos * 0.715 - sin * 0.715) * g +
    (0.072 - cos * 0.072 + sin * 0.928) * b;
  rgb[1] =
    (0.213 - cos * 0.213 + sin * 0.143) * r +
    (0.715 + cos * 0.285 + sin * 0.14) * g +
    (0.072 - cos * 0.072 - sin * 0.283) * b;
  rgb[2] =
    (0.213 - cos * 0.213 - sin * 0.787) * r +
    (0.715 - cos * 0.715 + sin * 0.715) * g +
    (0.072 + cos * 0.928 + sin * 0.072) * b;
}

function applyTemperature(rgb: [number, number, number], amount: number) {
  rgb[0] += amount;
  rgb[1] += amount * 0.12;
  rgb[2] -= amount;
}

function applyTint(rgb: [number, number, number], amount: number) {
  rgb[0] += amount * 0.55;
  rgb[1] -= amount * 0.35;
  rgb[2] += amount * 0.55;
}

function applyFade(rgb: [number, number, number], amount: number) {
  const mix = amount / 255;
  rgb[0] = rgb[0] * (1 - mix) + amount;
  rgb[1] = rgb[1] * (1 - mix) + amount;
  rgb[2] = rgb[2] * (1 - mix) + amount;
}

function applyFilterRecipe(
  rgb: [number, number, number],
  recipe: FilterRecipe,
) {
  if (recipe.levels) applyLevels(rgb, recipe.levels);
  if (recipe.exposure) applyExposure(rgb, recipe.exposure);
  if (recipe.brightness) applyBrightness(rgb, recipe.brightness);
  if (recipe.contrast) applyContrast(rgb, recipe.contrast);
  if (recipe.saturation) applySaturation(rgb, recipe.saturation);
  if (recipe.grayscale) applyGrayscale(rgb, recipe.grayscale);
  if (recipe.sepia) applySepia(rgb, recipe.sepia);
  if (recipe.temperature) applyTemperature(rgb, recipe.temperature);
  if (recipe.tint) applyTint(rgb, recipe.tint);
  if (recipe.hueRotate) applyHueRotate(rgb, recipe.hueRotate);
  if (recipe.fade) applyFade(rgb, recipe.fade);
}

export function applyFilterToRgba(
  rgba: Rgba,
  filter: FilterKey,
): [number, number, number, number] {
  const rgb: [number, number, number] = [rgba[0], rgba[1], rgba[2]];
  applyFilterRecipe(rgb, FILTERS[filter].recipe);

  return [
    clampByte(rgb[0]),
    clampByte(rgb[1]),
    clampByte(rgb[2]),
    clampByte(rgba[3]),
  ];
}

function drawWithCanvasFilter(
  ctx: CanvasRenderingContext2D,
  frame: HTMLCanvasElement,
  dest: DrawRect,
  filter: FilterKey,
) {
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
}

function drawFilteredFrame(
  ctx: CanvasRenderingContext2D,
  frame: HTMLCanvasElement,
  dest: DrawRect,
  filter: FilterKey,
) {
  if (filter === "none") {
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
    return;
  }

  const width = Math.max(1, Math.round(dest.width));
  const height = Math.max(1, Math.round(dest.height));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const source = canvas.getContext("2d", { willReadFrequently: true });
  if (!source) {
    drawWithCanvasFilter(ctx, frame, dest, filter);
    return;
  }

  try {
    source.drawImage(
      frame,
      0,
      0,
      frame.width,
      frame.height,
      0,
      0,
      width,
      height,
    );
    const image = source.getImageData(0, 0, width, height);
    const { data } = image;
    for (let i = 0; i < data.length; i += 4) {
      const [r, g, b, a] = applyFilterToRgba(
        [data[i], data[i + 1], data[i + 2], data[i + 3]],
        filter,
      );
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = a;
    }
    source.putImageData(image, 0, 0);
    ctx.drawImage(canvas, dest.x, dest.y, dest.width, dest.height);
  } catch {
    drawWithCanvasFilter(ctx, frame, dest, filter);
  }
}

export function drawFrame(
  ctx: CanvasRenderingContext2D,
  frame: HTMLCanvasElement,
  dest: DrawRect,
  { filter = "none", sticker = "none" }: DrawFrameOptions = {},
): void {
  const def = FILTERS[filter];
  drawFilteredFrame(ctx, frame, dest, filter);
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
