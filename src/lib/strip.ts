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

export const THEMES: Record<string, StripTheme> = {
  classic: { background: "#ffffff", text: "#111111", caption: "PhotoBlast" },
  noir: { background: "#111111", text: "#ffffff", caption: "PhotoBlast" },
  bubblegum: { background: "#ff5db1", text: "#ffffff", caption: "PhotoBlast" },
  mint: { background: "#19c37d", text: "#04150d", caption: "PhotoBlast" },
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

  // Footer: caption + date.
  const footerY = height - footer;
  ctx.fillStyle = theme.text;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "700 56px 'Helvetica Neue', Arial, sans-serif";
  ctx.fillText(theme.caption, width / 2, footerY + footer / 2 - 16);

  ctx.font = "400 28px 'Helvetica Neue', Arial, sans-serif";
  ctx.globalAlpha = 0.7;
  ctx.fillText(formatDate(new Date()), width / 2, footerY + footer / 2 + 32);
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
