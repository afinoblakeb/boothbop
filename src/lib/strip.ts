// Compose the 4 captured frames into a downloadable photo strip.
import { loadWatermark } from "./watermark";

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
  orange: { background: "#e85a1a", text: "#f6e7cf", caption: "BoothBop" },
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

export interface StripGeometry {
  width: number;
  height: number;
  cols: number;
  rows: number;
  /** Top-left pixel position of each of the 4 photo cells, in order. */
  cells: { x: number; y: number }[];
}

/**
 * Pure layout math for a strip — canvas size and where each photo goes. Kept
 * separate from drawing so it can be unit-tested without a real canvas.
 */
export function stripGeometry(layout: Layout): StripGeometry {
  const { cell, gap, footer } = STRIP;
  const cols = layout === "2x2" ? 2 : 1;
  const rows = layout === "2x2" ? 2 : 4;

  const width = gap + cols * (cell + gap);
  const height = gap + rows * (cell + gap) + footer;

  const cells = Array.from({ length: 4 }, (_, i) => {
    const col = layout === "2x2" ? i % 2 : 0;
    const row = layout === "2x2" ? Math.floor(i / 2) : i;
    return { x: gap + col * (cell + gap), y: gap + row * (cell + gap) };
  });

  return { width, height, cols, rows, cells };
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
  logo: HTMLImageElement | null = null,
): HTMLCanvasElement {
  const { cell, footer } = STRIP;
  const { width, height, cells } = stripGeometry(layout);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = theme.background;
  ctx.fillRect(0, 0, width, height);

  frames.slice(0, 4).forEach((frame, i) => {
    const { x, y } = cells[i];
    ctx.drawImage(frame, 0, 0, frame.width, frame.height, x, y, cell, cell);
  });

  const footerY = height - footer;

  if (logo) {
    // Brand logo centered, with a soft light halo so the dark parts stay
    // legible on the dark themes (carbon) — same treatment as the watermark,
    // invisible on the light themes.
    const logoH = 64;
    const logoW = logoH * (logo.width / logo.height);
    const lx = (width - logoW) / 2;
    const ly = footerY + 20;
    ctx.save();
    ctx.shadowColor = "rgba(255,255,255,0.85)";
    ctx.shadowBlur = Math.max(4, width * 0.012);
    ctx.drawImage(logo, lx, ly, logoW, logoH);
    ctx.drawImage(logo, lx, ly, logoW, logoH); // second pass strengthens the halo
    ctx.shadowBlur = 0;
    ctx.drawImage(logo, lx, ly, logoW, logoH); // crisp logo on top
    ctx.restore();

    drawDate(ctx, width, ly + logoH + 22, theme.text);
    return canvas;
  }

  // Fallback: render the wordmark as text in the condensed display face.
  ctx.fillStyle = theme.text;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  try {
    ctx.letterSpacing = "3px";
  } catch {
    /* older browsers: no canvas letter-spacing */
  }
  ctx.font = "400 72px 'Bebas Neue', 'Oswald', 'Arial Narrow', sans-serif";
  ctx.fillText(
    theme.caption.toUpperCase(),
    width / 2,
    footerY + footer / 2 - 14,
  );
  drawDate(ctx, width, footerY + footer / 2 + 34, theme.text);

  return canvas;
}

// The date line, in the condensed face, shared by both footer variants.
function drawDate(
  ctx: CanvasRenderingContext2D,
  width: number,
  y: number,
  color: string,
) {
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  try {
    ctx.letterSpacing = "1px";
  } catch {
    /* no-op */
  }
  ctx.font = "500 26px 'Oswald', 'Arial Narrow', sans-serif";
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
): Promise<Blob> {
  const logo = await loadWatermark();
  return new Promise((resolve, reject) => {
    composeStrip(frames, layout, theme, logo).toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("strip failed"))),
      "image/png",
    );
  });
}
