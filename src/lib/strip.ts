// Compose the 4 captured frames into a downloadable photo strip.
import { loadWatermark } from "./watermark";
import { drawFilteredFrameCover, type FilterId } from "./filter";

export type Layout = "4x1" | "2x2";

export interface StripTheme {
  /** Strip background / border colour. */
  background: string;
  /** Footer text colour. */
  text: string;
  /** Optional caption shown in the footer. */
  caption: string;
}

// Atomic-age strip borders. Captions render in the condensed display face.
export const THEMES: Record<string, StripTheme> = {
  classic: { background: "#f6e7cf", text: "#111111", caption: "BoothBop" },
  // Deep burnt-sienna, not the logo's bright orange — the footer wordmark (which
  // contains that bright orange) would otherwise clash on a same-orange border.
  rust: { background: "#8f3b1e", text: "#f6e7cf", caption: "BoothBop" },
  teal: { background: "#3e7c78", text: "#f6e7cf", caption: "BoothBop" },
  mustard: { background: "#d9a441", text: "#111111", caption: "BoothBop" },
  olive: { background: "#6e7551", text: "#f6e7cf", caption: "BoothBop" },
  carbon: { background: "#111111", text: "#f6e7cf", caption: "BoothBop" },
};

// Strip layout constants (px). Shared by the geometry math and the renderer.
export const STRIP = {
  cell: 640, // size of each photo in the strip
  gap: 28, // space between/around photos
  footer: 132, // footer band height
} as const;

/** Screen previews never need export-sized pixels. */
export const PREVIEW_CELL = 320;

/** Use the smallest real source dimension so exports never invent detail. */
export function stripCellForFrames(
  frames: Pick<HTMLCanvasElement, "width" | "height">[],
  ceiling: number,
): number {
  if (!frames.length) return ceiling;
  return Math.min(
    ceiling,
    ...frames.map((frame) => Math.min(frame.width, frame.height)),
  );
}

export interface StripGeometry {
  width: number;
  height: number;
  cols: number;
  rows: number;
  photoWidth: number;
  photoHeight: number;
  footer: number;
  /** Top-left pixel position of each of the 4 photo cells, in order. */
  cells: { x: number; y: number }[];
}

export interface StripOptions {
  logo?: HTMLImageElement | null;
  cell?: number;
  branding?: boolean;
  filter?: FilterId;
}

/**
 * Pure layout math for a strip — canvas size and where each photo goes. Kept
 * separate from drawing so it can be unit-tested without a real canvas.
 */
export function stripGeometry(
  layout: Layout,
  cell: number = STRIP.cell,
): StripGeometry {
  // Everything but the photo cell scales with it, so a higher-quality strip
  // keeps the same proportions. `cell === STRIP.cell` reproduces the base layout.
  const scale = cell / STRIP.cell;
  const gap = Math.round(STRIP.gap * scale);
  const footer = Math.round(STRIP.footer * scale);
  const cols = layout === "2x2" ? 2 : 1;
  const rows = layout === "2x2" ? 2 : 4;

  const width = gap + cols * (cell + gap);
  const height =
    layout === "4x1" ? width * 3 : gap + rows * (cell + gap) + footer;
  const photoWidth = cell;
  const photoHeight =
    layout === "4x1"
      ? Math.floor((height - footer - gap * (rows + 1)) / rows)
      : cell;

  const cells = Array.from({ length: 4 }, (_, i) => {
    const col = layout === "2x2" ? i % 2 : 0;
    const row = layout === "2x2" ? Math.floor(i / 2) : i;
    return {
      x: gap + col * (photoWidth + gap),
      y: gap + row * (photoHeight + gap),
    };
  });

  return {
    width,
    height,
    cols,
    rows,
    photoWidth,
    photoHeight,
    footer,
    cells,
  };
}

/**
 * Draw the 4 frames onto a single canvas in the requested layout, with a
 * classic photo-booth border and a footer.
 *
 * The footer carries the horizontal BoothBop logo (same mark used to watermark
 * the GIF/video exports) over the date. If the logo image isn't available it
 * falls back to the wordmark rendered as text, so the strip is always branded.
 */
export function composeStrip(
  frames: HTMLCanvasElement[],
  layout: Layout,
  theme: StripTheme,
  {
    logo = null,
    cell = STRIP.cell,
    branding = true,
    filter = "original",
  }: StripOptions = {},
): HTMLCanvasElement {
  const scale = cell / STRIP.cell;
  const { width, height, photoWidth, photoHeight, footer, cells } =
    stripGeometry(layout, cell);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = theme.background;
  ctx.fillRect(0, 0, width, height);

  frames.slice(0, 4).forEach((frame, i) => {
    const { x, y } = cells[i];
    drawFilteredFrameCover(ctx, frame, x, y, photoWidth, photoHeight, filter);
  });

  const footerY = height - footer;

  if (!branding) {
    drawDate(ctx, width, footerY + footer / 2, theme.text, scale);
    return canvas;
  }

  if (logo) {
    // Brand logo centered, with a soft light halo so the dark parts stay
    // legible on the dark themes (carbon) — same treatment as the watermark,
    // invisible on the light themes.
    const logoH = 64 * scale;
    const logoW = logoH * (logo.width / logo.height);
    const lx = (width - logoW) / 2;
    const ly = footerY + 20 * scale;
    ctx.save();
    ctx.shadowColor = "rgba(255,255,255,0.85)";
    ctx.shadowBlur = Math.max(4, width * 0.012);
    ctx.drawImage(logo, lx, ly, logoW, logoH);
    ctx.drawImage(logo, lx, ly, logoW, logoH); // second pass strengthens the halo
    ctx.shadowBlur = 0;
    ctx.drawImage(logo, lx, ly, logoW, logoH); // crisp logo on top
    ctx.restore();

    drawDate(ctx, width, ly + logoH + 22 * scale, theme.text, scale);
    return canvas;
  }

  // Fallback: render the wordmark as text in the condensed display face.
  ctx.fillStyle = theme.text;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  try {
    ctx.letterSpacing = `${3 * scale}px`;
  } catch {
    /* older browsers: no canvas letter-spacing */
  }
  ctx.font = `400 ${72 * scale}px 'Bebas Neue', 'Oswald', 'Arial Narrow', sans-serif`;
  ctx.fillText(
    theme.caption.toUpperCase(),
    width / 2,
    footerY + footer / 2 - 14 * scale,
  );
  drawDate(ctx, width, footerY + footer / 2 + 34 * scale, theme.text, scale);

  return canvas;
}

// The date line, in the condensed face, shared by both footer variants.
function drawDate(
  ctx: CanvasRenderingContext2D,
  width: number,
  y: number,
  color: string,
  scale: number,
) {
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  try {
    ctx.letterSpacing = `${1 * scale}px`;
  } catch {
    /* no-op */
  }
  ctx.font = `500 ${26 * scale}px 'Oswald', 'Arial Narrow', sans-serif`;
  ctx.globalAlpha = 0.75;
  ctx.fillText(formatDate(new Date()).toUpperCase(), width / 2, y);
  ctx.globalAlpha = 1;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Compose the strip and encode it as a PNG blob, loading the brand logo for the
 * footer. The one-stop helper the UI uses to get a shareable/savable strip.
 */
export async function stripBlob(
  frames: HTMLCanvasElement[],
  layout: Layout,
  theme: StripTheme,
  options: Omit<StripOptions, "logo"> = {},
): Promise<Blob> {
  const logo = options.branding === false ? null : await loadWatermark();
  return new Promise((resolve, reject) => {
    composeStrip(frames, layout, theme, { ...options, logo }).toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("strip failed"))),
      "image/png",
    );
  });
}
