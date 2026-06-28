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
  | "shades"
  | "stache"
  | "monster"
  | "hearts"
  | "party"
  | "wedding"
  | "graduation"
  | "holiday"
  | "friends"
  | "crown"
  | "neon";
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
  birthday: { label: "Birthday Kit" },
  sparkles: { label: "Sparkle Frame" },
  shades: { label: "Star Shades" },
  stache: { label: "Stache" },
  monster: { label: "Monster Ball" },
  hearts: { label: "Heart Glow" },
  party: { label: "Party Pop" },
  wedding: { label: "Just Married" },
  graduation: { label: "Grad Cap" },
  holiday: { label: "Holiday Lights" },
  friends: { label: "Besties" },
  crown: { label: "Crown" },
  neon: { label: "Neon" },
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
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (sticker === "sparkles") {
    drawCornerFrame(ctx, rect, scale, "#d9a441", "#e85a1a");
    drawSparkle(ctx, rect, 0.18, 0.18, 48 * scale, "#f7d154");
    drawSparkle(ctx, rect, 0.82, 0.22, 34 * scale, "#f6e7cf");
    drawSparkle(ctx, rect, 0.24, 0.76, 32 * scale, "#e85a1a");
    drawSparkle(ctx, rect, 0.86, 0.78, 28 * scale, "#3e7c78");
  } else if (sticker === "birthday") {
    drawCornerFrame(ctx, rect, scale, "#e85a1a", "#f7d154");
    drawConfetti(ctx, rect, scale, "top");
    drawPartyHat(ctx, rect, 0.22, 0.2, 92 * scale);
    drawBalloon(ctx, rect, 0.78, 0.22, 56 * scale, "#e85a1a");
    drawBalloon(ctx, rect, 0.88, 0.3, 44 * scale, "#3e7c78");
    drawRibbonText(ctx, rect, "BDAY", 0.88, "#f7d154", "#111111");
  } else if (sticker === "shades") {
    drawStarShades(ctx, rect, 0.5, 0.4, 78 * scale);
    drawSparkle(ctx, rect, 0.82, 0.18, 28 * scale, "#f7d154");
  } else if (sticker === "stache") {
    drawMustache(ctx, rect, 0.5, 0.62, 118 * scale);
    drawBowTie(ctx, rect, 0.5, 0.78, 70 * scale, "#e85a1a");
  } else if (sticker === "monster") {
    drawMonsterBallFrame(ctx, rect, scale);
    drawMonsterBall(ctx, rect, 0.5, 0.22, 102 * scale);
    drawLightning(ctx, rect, 0.17, 0.26, 42 * scale, "#f7d154");
    drawLightning(ctx, rect, 0.84, 0.72, 36 * scale, "#e85a1a");
    drawSparkle(ctx, rect, 0.82, 0.2, 24 * scale, "#f7d154");
    drawRibbonText(ctx, rect, "CATCH!", 0.9, "#f6e7cf", "#111111");
  } else if (sticker === "hearts") {
    drawHeartGlasses(ctx, rect, 0.5, 0.4, 74 * scale);
    drawHeart(ctx, rect, 0.17, 0.22, 40 * scale, "#f7d154");
    drawHeart(ctx, rect, 0.84, 0.75, 34 * scale, "#e85a1a");
    drawCornerFrame(ctx, rect, scale, "#e85a1a", "#f7d154");
  } else if (sticker === "party") {
    drawConfetti(ctx, rect, scale * 1.4, "bands");
    drawStreamer(ctx, rect, 0.18, 0.22, 0.88, 0.16, "#e85a1a");
    drawStreamer(ctx, rect, 0.1, 0.76, 0.74, 0.86, "#3e7c78");
    drawBalloon(ctx, rect, 0.84, 0.25, 50 * scale, "#3e7c78");
    drawHashtag(ctx, rect, 0.18, 0.76, 44 * scale, "#111111");
    drawRibbonText(ctx, rect, "PARTY", 0.9, "#e85a1a", "#f6e7cf");
  } else if (sticker === "wedding") {
    drawCornerFrame(ctx, rect, scale, "#f6e7cf", "#d9a441");
    drawHeart(ctx, rect, 0.16, 0.18, 36 * scale, "#8f3b1e");
    drawRing(ctx, rect, 0.82, 0.2, 46 * scale, "#d9a441");
    drawSparkle(ctx, rect, 0.2, 0.78, 28 * scale, "#f7d154");
    drawRibbonText(ctx, rect, "JUST MARRIED", 0.9, "#f6e7cf", "#111111");
  } else if (sticker === "graduation") {
    drawGradCap(ctx, rect, 0.5, 0.2, 86 * scale, "#111111");
    drawTassel(ctx, rect, 0.58, 0.18, 74 * scale, "#d9a441");
    drawRosette(ctx, rect, 0.82, 0.78, 42 * scale, "#e85a1a");
    drawRibbonText(ctx, rect, "GRAD", 0.9, "#111111", "#f6e7cf");
  } else if (sticker === "holiday") {
    drawLightString(ctx, rect, scale);
    drawSnowflake(ctx, rect, 0.17, 0.22, 38 * scale, "#3e7c78");
    drawSnowflake(ctx, rect, 0.84, 0.26, 30 * scale, "#f6e7cf");
    drawGift(ctx, rect, 0.82, 0.8, 46 * scale, "#8f3b1e");
    drawCornerFrame(ctx, rect, scale, "#3e7c78", "#f6e7cf");
  } else if (sticker === "crown") {
    drawCrown(ctx, rect, 0.5, 0.2, 118 * scale);
    drawSparkle(ctx, rect, 0.2, 0.24, 28 * scale, "#f7d154");
    drawSparkle(ctx, rect, 0.82, 0.28, 24 * scale, "#f6e7cf");
  } else if (sticker === "neon") {
    drawNeonFrame(ctx, rect, scale);
    drawLightning(ctx, rect, 0.2, 0.25, 52 * scale, "#f7d154");
    drawLightning(ctx, rect, 0.82, 0.74, 44 * scale, "#e85a1a");
  } else {
    drawCornerFrame(ctx, rect, scale, "#111111", "#e85a1a");
    drawRosette(ctx, rect, 0.16, 0.78, 42 * scale, "#111111");
    drawHashtag(ctx, rect, 0.82, 0.78, 42 * scale, "#e85a1a");
    drawSparkle(ctx, rect, 0.82, 0.18, 28 * scale, "#d9a441");
    drawRibbonText(ctx, rect, "BESTIES", 0.9, "#3e7c78", "#f6e7cf");
  }
  ctx.restore();
}

function drawCornerFrame(
  ctx: CanvasRenderingContext2D,
  rect: DrawRect,
  scale: number,
  primary: string,
  secondary: string,
) {
  const inset = 18 * scale;
  const len = rect.width * 0.22;
  ctx.lineWidth = Math.max(5, 8 * scale);
  ctx.strokeStyle = "#111111";
  for (const [sx, sy] of [
    [1, 1],
    [-1, 1],
    [1, -1],
    [-1, -1],
  ] as const) {
    const x = sx > 0 ? rect.x + inset : rect.x + rect.width - inset;
    const y = sy > 0 ? rect.y + inset : rect.y + rect.height - inset;
    ctx.beginPath();
    ctx.moveTo(x, y + sy * len);
    ctx.lineTo(x, y);
    ctx.lineTo(x + sx * len, y);
    ctx.stroke();
  }
  ctx.lineWidth = Math.max(3, 4 * scale);
  ctx.strokeStyle = primary;
  ctx.strokeRect(
    rect.x + inset,
    rect.y + inset,
    rect.width - inset * 2,
    rect.height - inset * 2,
  );
  ctx.strokeStyle = secondary;
  ctx.strokeRect(
    rect.x + inset * 1.7,
    rect.y + inset * 1.7,
    rect.width - inset * 3.4,
    rect.height - inset * 3.4,
  );
}

function drawRibbonText(
  ctx: CanvasRenderingContext2D,
  rect: DrawRect,
  text: string,
  ry: number,
  background: string,
  foreground: string,
) {
  const h = rect.height * 0.1;
  const w = rect.width * 0.68;
  const x = rect.x + rect.width * 0.5 - w / 2;
  const y = rect.y + rect.height * ry - h / 2;
  ctx.fillStyle = background;
  ctx.strokeStyle = "#111111";
  ctx.lineWidth = Math.max(3, rect.width * 0.008);
  ctx.fillRect(x, y, w, h);
  ctx.strokeRect(x, y, w, h);
  ctx.font = `${Math.max(18, h * 0.56)}px "Bebas Neue", "Arial Narrow", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = foreground;
  ctx.fillText(text, rect.x + rect.width / 2, y + h * 0.54);
}

function drawPartyHat(
  ctx: CanvasRenderingContext2D,
  rect: DrawRect,
  rx: number,
  ry: number,
  size: number,
) {
  const x = rect.x + rect.width * rx;
  const y = rect.y + rect.height * ry;
  ctx.fillStyle = "#f7d154";
  ctx.strokeStyle = "#111111";
  ctx.lineWidth = Math.max(3, size * 0.06);
  ctx.beginPath();
  ctx.moveTo(x, y - size * 0.58);
  ctx.lineTo(x - size * 0.42, y + size * 0.42);
  ctx.lineTo(x + size * 0.42, y + size * 0.42);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = "#e85a1a";
  ctx.beginPath();
  ctx.moveTo(x - size * 0.25, y - size * 0.08);
  ctx.lineTo(x + size * 0.25, y + size * 0.12);
  ctx.moveTo(x - size * 0.32, y + size * 0.24);
  ctx.lineTo(x + size * 0.32, y + size * 0.42);
  ctx.stroke();
  drawSparkle(ctx, rect, rx, ry - 0.1, size * 0.16, "#e85a1a");
}

function drawStarShades(
  ctx: CanvasRenderingContext2D,
  rect: DrawRect,
  rx: number,
  ry: number,
  size: number,
) {
  const x = rect.x + rect.width * rx;
  const y = rect.y + rect.height * ry;
  ctx.strokeStyle = "#111111";
  ctx.lineWidth = Math.max(4, size * 0.07);
  drawStarPolygon(ctx, x - size * 0.7, y, size * 0.5, "#111111", "#f7d154");
  drawStarPolygon(ctx, x + size * 0.7, y, size * 0.5, "#111111", "#e85a1a");
  ctx.beginPath();
  ctx.moveTo(x - size * 0.22, y);
  ctx.quadraticCurveTo(x, y - size * 0.16, x + size * 0.22, y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - size * 1.18, y - size * 0.04);
  ctx.lineTo(x - size * 1.5, y - size * 0.18);
  ctx.moveTo(x + size * 1.18, y - size * 0.04);
  ctx.lineTo(x + size * 1.5, y - size * 0.18);
  ctx.stroke();
}

function drawStarPolygon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  fill: string,
  accent: string,
) {
  ctx.fillStyle = fill;
  ctx.strokeStyle = "#111111";
  ctx.lineWidth = Math.max(3, radius * 0.1);
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const angle = -Math.PI / 2 + (Math.PI * 2 * i) / 10;
    const r = i % 2 === 0 ? radius : radius * 0.45;
    const px = x + Math.cos(angle) * r;
    const py = y + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(x - radius * 0.15, y - radius * 0.16, radius * 0.12, 0, Math.PI * 2);
  ctx.fill();
}

function drawMustache(
  ctx: CanvasRenderingContext2D,
  rect: DrawRect,
  rx: number,
  ry: number,
  size: number,
) {
  const x = rect.x + rect.width * rx;
  const y = rect.y + rect.height * ry;
  ctx.fillStyle = "#111111";
  ctx.strokeStyle = "#111111";
  ctx.lineWidth = Math.max(3, size * 0.04);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.bezierCurveTo(
    x - size * 0.35,
    y - size * 0.34,
    x - size * 0.98,
    y - size * 0.26,
    x - size * 1.18,
    y + size * 0.08,
  );
  ctx.bezierCurveTo(
    x - size * 0.76,
    y + size * 0.3,
    x - size * 0.28,
    y + size * 0.22,
    x,
    y,
  );
  ctx.bezierCurveTo(
    x + size * 0.28,
    y + size * 0.22,
    x + size * 0.76,
    y + size * 0.3,
    x + size * 1.18,
    y + size * 0.08,
  );
  ctx.bezierCurveTo(
    x + size * 0.98,
    y - size * 0.26,
    x + size * 0.35,
    y - size * 0.34,
    x,
    y,
  );
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function drawBowTie(
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
  ctx.lineWidth = Math.max(3, size * 0.06);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - size, y - size * 0.42);
  ctx.lineTo(x - size, y + size * 0.42);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + size, y - size * 0.42);
  ctx.lineTo(x + size, y + size * 0.42);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#f7d154";
  ctx.fillRect(x - size * 0.16, y - size * 0.22, size * 0.32, size * 0.44);
  ctx.strokeRect(x - size * 0.16, y - size * 0.22, size * 0.32, size * 0.44);
}

function drawHeartGlasses(
  ctx: CanvasRenderingContext2D,
  rect: DrawRect,
  rx: number,
  ry: number,
  size: number,
) {
  drawHeart(ctx, rect, rx - 0.11, ry, size * 0.48, "#e85a1a");
  drawHeart(ctx, rect, rx + 0.11, ry, size * 0.48, "#f7d154");
  const x = rect.x + rect.width * rx;
  const y = rect.y + rect.height * ry;
  ctx.strokeStyle = "#111111";
  ctx.lineWidth = Math.max(3, size * 0.08);
  ctx.beginPath();
  ctx.moveTo(x - size * 0.16, y);
  ctx.quadraticCurveTo(x, y - size * 0.12, x + size * 0.16, y);
  ctx.stroke();
}

function drawStreamer(
  ctx: CanvasRenderingContext2D,
  rect: DrawRect,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
) {
  const startX = rect.x + rect.width * x1;
  const startY = rect.y + rect.height * y1;
  const endX = rect.x + rect.width * x2;
  const endY = rect.y + rect.height * y2;
  ctx.strokeStyle = "#111111";
  ctx.lineWidth = Math.max(5, rect.width * 0.012);
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.bezierCurveTo(
    startX + rect.width * 0.18,
    startY + rect.height * 0.12,
    endX - rect.width * 0.18,
    endY - rect.height * 0.12,
    endX,
    endY,
  );
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(3, rect.width * 0.007);
  ctx.stroke();
}

function drawTassel(
  ctx: CanvasRenderingContext2D,
  rect: DrawRect,
  rx: number,
  ry: number,
  size: number,
  color: string,
) {
  const x = rect.x + rect.width * rx;
  const y = rect.y + rect.height * ry;
  ctx.strokeStyle = "#111111";
  ctx.lineWidth = Math.max(3, size * 0.05);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + size * 0.42, y + size * 0.58);
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.beginPath();
  ctx.moveTo(x + size * 0.42, y + size * 0.58);
  ctx.lineTo(x + size * 0.28, y + size * 0.9);
  ctx.moveTo(x + size * 0.42, y + size * 0.58);
  ctx.lineTo(x + size * 0.52, y + size * 0.92);
  ctx.stroke();
}

function drawLightString(
  ctx: CanvasRenderingContext2D,
  rect: DrawRect,
  scale: number,
) {
  ctx.strokeStyle = "#111111";
  ctx.lineWidth = Math.max(3, 4 * scale);
  ctx.beginPath();
  ctx.moveTo(rect.x + rect.width * 0.08, rect.y + rect.height * 0.1);
  ctx.quadraticCurveTo(
    rect.x + rect.width * 0.5,
    rect.y + rect.height * 0.2,
    rect.x + rect.width * 0.92,
    rect.y + rect.height * 0.1,
  );
  ctx.stroke();
  const bulbs: [number, number, string][] = [
    [0.16, 0.12, "#e85a1a"],
    [0.31, 0.16, "#f7d154"],
    [0.5, 0.18, "#3e7c78"],
    [0.69, 0.16, "#f6e7cf"],
    [0.84, 0.12, "#e85a1a"],
  ];
  for (const [rx, ry, color] of bulbs) {
    const x = rect.x + rect.width * rx;
    const y = rect.y + rect.height * ry;
    ctx.fillStyle = color;
    ctx.strokeStyle = "#111111";
    ctx.beginPath();
    ctx.ellipse(x, y + 14 * scale, 9 * scale, 16 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}

function drawCrown(
  ctx: CanvasRenderingContext2D,
  rect: DrawRect,
  rx: number,
  ry: number,
  size: number,
) {
  const x = rect.x + rect.width * rx;
  const y = rect.y + rect.height * ry;
  ctx.fillStyle = "#f7d154";
  ctx.strokeStyle = "#111111";
  ctx.lineWidth = Math.max(4, size * 0.06);
  ctx.beginPath();
  ctx.moveTo(x - size, y + size * 0.32);
  ctx.lineTo(x - size * 0.78, y - size * 0.48);
  ctx.lineTo(x - size * 0.28, y + size * 0.06);
  ctx.lineTo(x, y - size * 0.62);
  ctx.lineTo(x + size * 0.28, y + size * 0.06);
  ctx.lineTo(x + size * 0.78, y - size * 0.48);
  ctx.lineTo(x + size, y + size * 0.32);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#e85a1a";
  for (const dx of [-0.78, 0, 0.78]) {
    ctx.beginPath();
    ctx.arc(x + size * dx, y - size * 0.48, size * 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}

function drawNeonFrame(
  ctx: CanvasRenderingContext2D,
  rect: DrawRect,
  scale: number,
) {
  const inset = 18 * scale;
  ctx.lineWidth = Math.max(7, 10 * scale);
  ctx.strokeStyle = "#111111";
  ctx.strokeRect(
    rect.x + inset,
    rect.y + inset,
    rect.width - inset * 2,
    rect.height - inset * 2,
  );
  ctx.lineWidth = Math.max(3, 5 * scale);
  ctx.strokeStyle = "#e85a1a";
  ctx.strokeRect(
    rect.x + inset * 1.45,
    rect.y + inset * 1.45,
    rect.width - inset * 2.9,
    rect.height - inset * 2.9,
  );
  ctx.strokeStyle = "#3e7c78";
  ctx.beginPath();
  ctx.moveTo(rect.x + rect.width * 0.12, rect.y + rect.height * 0.88);
  ctx.lineTo(rect.x + rect.width * 0.88, rect.y + rect.height * 0.12);
  ctx.stroke();
}

function drawLightning(
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
  ctx.lineWidth = Math.max(3, size * 0.06);
  ctx.beginPath();
  ctx.moveTo(x + size * 0.1, y - size * 0.6);
  ctx.lineTo(x - size * 0.32, y + size * 0.08);
  ctx.lineTo(x + size * 0.03, y + size * 0.08);
  ctx.lineTo(x - size * 0.12, y + size * 0.6);
  ctx.lineTo(x + size * 0.38, y - size * 0.12);
  ctx.lineTo(x + size * 0.04, y - size * 0.12);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function drawMonsterBallFrame(
  ctx: CanvasRenderingContext2D,
  rect: DrawRect,
  scale: number,
) {
  const inset = 18 * scale;
  const len = rect.width * 0.2;
  ctx.lineWidth = Math.max(5, 8 * scale);
  ctx.strokeStyle = "#111111";
  for (const [sx, sy] of [
    [1, 1],
    [-1, 1],
    [1, -1],
    [-1, -1],
  ] as const) {
    const x = sx > 0 ? rect.x + inset : rect.x + rect.width - inset;
    const y = sy > 0 ? rect.y + inset : rect.y + rect.height - inset;
    ctx.beginPath();
    ctx.moveTo(x, y + sy * len);
    ctx.lineTo(x, y);
    ctx.lineTo(x + sx * len, y);
    ctx.stroke();
  }

  ctx.lineWidth = Math.max(3, 4 * scale);
  ctx.strokeStyle = "#e85a1a";
  ctx.beginPath();
  ctx.moveTo(rect.x + inset * 1.5, rect.y + inset * 1.5);
  ctx.lineTo(rect.x + rect.width - inset * 1.5, rect.y + inset * 1.5);
  ctx.moveTo(rect.x + inset * 1.5, rect.y + rect.height - inset * 1.5);
  ctx.lineTo(
    rect.x + rect.width - inset * 1.5,
    rect.y + rect.height - inset * 1.5,
  );
  ctx.stroke();

  ctx.strokeStyle = "#f7d154";
  ctx.beginPath();
  ctx.moveTo(rect.x + inset * 1.5, rect.y + inset * 2.6);
  ctx.lineTo(rect.x + rect.width - inset * 1.5, rect.y + inset * 2.6);
  ctx.moveTo(rect.x + inset * 1.5, rect.y + rect.height - inset * 2.6);
  ctx.lineTo(
    rect.x + rect.width - inset * 1.5,
    rect.y + rect.height - inset * 2.6,
  );
  ctx.stroke();
}

function drawMonsterBall(
  ctx: CanvasRenderingContext2D,
  rect: DrawRect,
  rx: number,
  ry: number,
  size: number,
) {
  const x = rect.x + rect.width * rx;
  const y = rect.y + rect.height * ry;
  const radius = size / 2;
  const bandHeight = Math.max(8, size * 0.13);
  const buttonRadius = size * 0.18;

  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = "#e85a1a";
  ctx.fillRect(x - radius, y - radius, size, radius);
  ctx.fillStyle = "#f6e7cf";
  ctx.fillRect(x - radius, y, size, radius);
  ctx.fillStyle = "#111111";
  ctx.fillRect(x - radius, y - bandHeight / 2, size, bandHeight);
  ctx.restore();

  ctx.strokeStyle = "#111111";
  ctx.lineWidth = Math.max(4, size * 0.07);
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = "#f6e7cf";
  ctx.beginPath();
  ctx.arc(x, y, buttonRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#f7d154";
  ctx.beginPath();
  ctx.arc(
    x - buttonRadius * 0.24,
    y - buttonRadius * 0.28,
    buttonRadius * 0.28,
    0,
    Math.PI * 2,
  );
  ctx.fill();
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
