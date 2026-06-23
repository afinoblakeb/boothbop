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
  classic: { background: "#f6e7cf", text: "#111111", caption: "PhotoBlast" },
  orange: { background: "#e85a1a", text: "#f6e7cf", caption: "PhotoBlast" },
  teal: { background: "#3e7c78", text: "#f6e7cf", caption: "PhotoBlast" },
  mustard: { background: "#d9a441", text: "#111111", caption: "PhotoBlast" },
  olive: { background: "#6e7551", text: "#f6e7cf", caption: "PhotoBlast" },
  carbon: { background: "#111111", text: "#f6e7cf", caption: "PhotoBlast" },
};

/**
 * Draw the 4 frames onto a single canvas in the requested layout, with a
 * classic photo-booth border and a footer caption.
 */
export function composeStrip(
  frames: HTMLCanvasElement[],
  layout: Layout,
  theme: StripTheme,
): HTMLCanvasElement {
  const cell = 640; // size of each photo in the strip
  const gap = 28; // space between/around photos
  const footer = 132; // footer band height
  const cols = layout === "2x2" ? 2 : 1;
  const rows = layout === "2x2" ? 2 : 4;

  const width = gap + cols * (cell + gap);
  const height = gap + rows * (cell + gap) + footer;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = theme.background;
  ctx.fillRect(0, 0, width, height);

  frames.slice(0, 4).forEach((frame, i) => {
    const col = layout === "2x2" ? i % 2 : 0;
    const row = layout === "2x2" ? Math.floor(i / 2) : i;
    const x = gap + col * (cell + gap);
    const y = gap + row * (cell + gap);
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
  ctx.fillText(theme.caption.toUpperCase(), width / 2, footerY + footer / 2 - 14);

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
