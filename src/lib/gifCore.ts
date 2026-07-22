import { GIFEncoder, applyPalette, quantize } from "gifenc";
import { applyFilterToRgba, type FilterId } from "./filter";

export interface GifPixelJob {
  frames: Uint8ClampedArray[];
  frameIndexes: number[];
  size: number;
  delay: number;
  filter: FilterId;
  watermark: Uint8ClampedArray | null;
}

/** Alpha-composite a transparent watermark without touching empty pixels. */
export function blendRgba(
  background: Uint8ClampedArray,
  overlay: Uint8ClampedArray,
): void {
  for (let i = 0; i < background.length; i += 4) {
    const alpha = overlay[i + 3] / 255;
    if (alpha === 0) continue;
    const inverse = 1 - alpha;
    background[i] = overlay[i] * alpha + background[i] * inverse;
    background[i + 1] = overlay[i + 1] * alpha + background[i + 1] * inverse;
    background[i + 2] = overlay[i + 2] * alpha + background[i + 2] * inverse;
    background[i + 3] = 255;
  }
}

/** CPU-heavy filter, quantization, and GIF assembly. Runs inside a worker. */
export function encodeGifPixels(job: GifPixelJob): Uint8Array {
  const gif = GIFEncoder();
  const encoded = new Map<
    number,
    { palette: number[][]; indexes: Uint8Array }
  >();

  for (const frameIndex of job.frameIndexes) {
    let frame = encoded.get(frameIndex);
    if (!frame) {
      const pixels = applyFilterToRgba(job.frames[frameIndex], job.filter);
      if (job.watermark) blendRgba(pixels, job.watermark);
      const palette = quantize(pixels, 256, { oklab: true });
      frame = { palette, indexes: applyPalette(pixels, palette) };
      encoded.set(frameIndex, frame);
    }
    gif.writeFrame(frame.indexes, job.size, job.size, {
      palette: frame.palette,
      delay: job.delay,
    });
  }

  gif.finish();
  return gif.bytes();
}
