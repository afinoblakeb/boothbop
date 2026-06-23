// Brand watermark for generated GIFs / videos: the horizontal PhotoBlast
// wordmark drawn bottom-right, semi-transparent, with a soft light halo so it
// stays legible over both dark and light photos. (The photo strip carries the
// brand in its own footer, so it's not watermarked.)
//
// Kept as one function + a loader so a future paid "remove watermark" tier
// just skips the draw.

const SRC = `${import.meta.env.BASE_URL}watermark.png`;
let cached: HTMLImageElement | null | undefined;

/** Preload the watermark image (cached). Resolves null if it can't load. */
export function loadWatermark(): Promise<HTMLImageElement | null> {
  if (cached !== undefined) return Promise.resolve(cached);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      cached = img;
      resolve(img);
    };
    img.onerror = () => {
      cached = null;
      resolve(null);
    };
    img.src = SRC;
  });
}

export function drawWatermark(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  img: HTMLImageElement | null,
  opacity = 0.85,
) {
  if (!img) return;
  const w = width * 0.4;
  const h = w * (img.height / img.width);
  const pad = Math.round(width * 0.03);
  const x = width - w - pad;
  const y = height - h - pad;

  ctx.save();
  ctx.globalAlpha = opacity;
  // Soft light halo so the dark parts read on dark photos (invisible on light).
  ctx.shadowColor = "rgba(255,255,255,0.85)";
  ctx.shadowBlur = Math.max(4, width * 0.018);
  ctx.drawImage(img, x, y, w, h);
  ctx.drawImage(img, x, y, w, h); // second pass strengthens the halo
  ctx.shadowBlur = 0;
  ctx.drawImage(img, x, y, w, h); // crisp logo on top
  ctx.restore();
}
