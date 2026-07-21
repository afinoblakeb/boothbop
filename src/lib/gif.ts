// Encode the 4 frames into an animated GIF using gifenc (pure JS, no workers).
import { GIFEncoder, quantize, applyPalette } from "gifenc";
import { drawWatermark } from "./watermark";
import { drawFilteredFrame, type FilterId } from "./filter";
import { frameIndexes } from "./session";

export interface GifOptions {
  size?: number; // output dimension (square)
  delay?: number; // ms each frame is shown
  watermark?: boolean; // brand watermark bottom-right (paid feature removes it)
  watermarkImg?: HTMLImageElement | null; // preloaded logo
  filter?: FilterId;
  boom?: boolean;
}

export const GIF_DEFAULT_DELAY_MS = 450;

export function encodeGif(
  frames: HTMLCanvasElement[],
  {
    size = 640,
    delay = GIF_DEFAULT_DELAY_MS,
    watermark = true,
    watermarkImg = null,
    filter = "original",
    boom = false,
  }: GifOptions = {},
): Blob {
  const gif = GIFEncoder();

  const scratch = document.createElement("canvas");
  scratch.width = size;
  scratch.height = size;
  const ctx = scratch.getContext("2d", { willReadFrequently: true })!;

  for (const frameIndex of frameIndexes(frames.length, boom)) {
    const frame = frames[frameIndex];
    ctx.clearRect(0, 0, size, size);
    drawFilteredFrame(ctx, frame, 0, 0, size, size, filter);
    if (watermark) drawWatermark(ctx, size, size, watermarkImg);
    const { data } = ctx.getImageData(0, 0, size, size);
    // oklab = perceptual palette → better color fidelity than the default.
    const palette = quantize(data, 256, { oklab: true });
    const paletteIndex = applyPalette(data, palette);
    gif.writeFrame(paletteIndex, size, size, { palette, delay });
  }

  gif.finish();
  return new Blob([gif.bytes() as unknown as BlobPart], { type: "image/gif" });
}
