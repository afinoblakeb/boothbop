// Compose the 4 captured frames into a downloadable photo strip.

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
 * classic photo-booth border and a footer caption.
 */
export function composeStrip(
  frames: HTMLCanvasElement[],
  layout: Layout,
  theme: StripTheme,
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

  // Footer: caption + date, in the condensed display face.
  const footerY = height - footer;
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

  try {
    ctx.letterSpacing = "1px";
  } catch {
    /* no-op */
  }
  ctx.font = "500 26px 'Oswald', 'Arial Narrow', sans-serif";
  ctx.globalAlpha = 0.75;
  ctx.fillText(
    formatDate(new Date()).toUpperCase(),
    width / 2,
    footerY + footer / 2 + 34,
  );
  ctx.globalAlpha = 1;

  return canvas;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
