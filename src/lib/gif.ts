// Encode the 4 frames into an animated GIF using gifenc (pure JS, no workers).
import { GIFEncoder, quantize, applyPalette } from "gifenc";
import {
  drawFrame,
  motionSequence,
  type FilterKey,
  type MotionMode,
} from "./render";
import { drawWatermark } from "./watermark";

export interface GifOptions {
  size?: number; // output dimension (square)
  delay?: number; // ms each frame is shown
  filter?: FilterKey;
  motion?: MotionMode;
  watermark?: boolean; // brand watermark bottom-right (paid feature removes it)
  watermarkImg?: HTMLImageElement | null; // preloaded logo
}

export function encodeGif(
  frames: HTMLCanvasElement[],
  {
    size = 640,
    delay = 450,
    filter = "none",
    motion = "loop",
    watermark = true,
    watermarkImg = null,
  }: GifOptions = {},
): Blob {
  const gif = GIFEncoder();

  const scratch = document.createElement("canvas");
  scratch.width = size;
  scratch.height = size;
  const ctx = scratch.getContext("2d", { willReadFrequently: true })!;

  for (const frame of motionSequence(frames, motion)) {
    ctx.clearRect(0, 0, size, size);
    drawFrame(
      ctx,
      frame,
      { x: 0, y: 0, width: size, height: size },
      { filter },
    );
    if (watermark) drawWatermark(ctx, size, size, watermarkImg);
    const { data } = ctx.getImageData(0, 0, size, size);
    // oklab = perceptual palette → better color fidelity than the default.
    const palette = quantize(data, 256, { oklab: true });
    const index = applyPalette(data, palette);
    gif.writeFrame(index, size, size, { palette, delay });
  }

  gif.finish();
  return new Blob([gif.bytes() as unknown as BlobPart], { type: "image/gif" });
}
