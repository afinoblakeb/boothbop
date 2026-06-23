// Brand watermark drawn into the bottom-right of generated GIFs / videos.
// Matches the two-tone "PHOTO·BLAST" wordmark (cream + orange), with a dark
// outline so it stays legible over any photo. Kept as a single function so a
// future paid "remove watermark" flag just skips the call.

const CREAM = "#f6e7cf";
const ORANGE = "#e85a1a";
const INK = "#111111";

export function drawWatermark(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  opacity = 0.8,
) {
  const fontSize = Math.max(14, Math.round(width * 0.055));
  const pad = Math.round(width * 0.035);

  ctx.save();
  ctx.font = `400 ${fontSize}px "Bebas Neue", "Oswald", "Arial Narrow", sans-serif`;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.lineJoin = "round";

  const photo = "PHOTO";
  const blast = "BLAST";
  const photoW = ctx.measureText(photo).width;
  const blastW = ctx.measureText(blast).width;

  const baseY = height - pad;
  const blastX = width - pad - blastW;
  const photoX = blastX - photoW;

  ctx.globalAlpha = opacity;

  // Dark outline for contrast on light photos.
  ctx.lineWidth = Math.max(2, fontSize * 0.14);
  ctx.strokeStyle = INK;
  ctx.strokeText(photo, photoX, baseY);
  ctx.strokeText(blast, blastX, baseY);

  // Two-tone fill to read as the logo.
  ctx.fillStyle = CREAM;
  ctx.fillText(photo, photoX, baseY);
  ctx.fillStyle = ORANGE;
  ctx.fillText(blast, blastX, baseY);

  ctx.restore();
}
