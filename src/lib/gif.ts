// Encode the 4 frames into an animated GIF using gifenc (pure JS, no workers).
import { GIFEncoder, quantize, applyPalette } from "gifenc";

export interface GifOptions {
  size?: number; // output dimension (square)
  delay?: number; // ms each frame is shown
}

export function encodeGif(
  frames: HTMLCanvasElement[],
  { size = 480, delay = 450 }: GifOptions = {},
): Blob {
  const gif = GIFEncoder();

  const scratch = document.createElement("canvas");
  scratch.width = size;
  scratch.height = size;
  const ctx = scratch.getContext("2d", { willReadFrequently: true })!;

  for (const frame of frames) {
    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(frame, 0, 0, frame.width, frame.height, 0, 0, size, size);
    const { data } = ctx.getImageData(0, 0, size, size);
    const palette = quantize(data, 256);
    const index = applyPalette(data, palette);
    gif.writeFrame(index, size, size, { palette, delay });
  }

  gif.finish();
  return new Blob([gif.bytes() as unknown as BlobPart], { type: "image/gif" });
}
