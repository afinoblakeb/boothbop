import { drawWatermark } from "./watermark";
import { type FilterId } from "./filter";
import { frameIndexes } from "./session";
import { encodeGifPixels } from "./gifCore";

export interface GifOptions {
  size?: number;
  delay?: number;
  watermark?: boolean;
  watermarkImg?: HTMLImageElement | null;
  filter?: FilterId;
  boom?: boolean;
}

export const GIF_DEFAULT_DELAY_MS = 450;

const yieldToBrowser = () =>
  new Promise<void>((resolve) => setTimeout(resolve, 0));

function pixelsForFrames(
  frames: HTMLCanvasElement[],
  size: number,
): Uint8ClampedArray[] {
  const scratch = document.createElement("canvas");
  scratch.width = size;
  scratch.height = size;
  const ctx = scratch.getContext("2d", { willReadFrequently: true })!;
  return frames.map((frame) => {
    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(frame, 0, 0, frame.width, frame.height, 0, 0, size, size);
    return ctx.getImageData(0, 0, size, size).data;
  });
}

function watermarkPixels(
  size: number,
  image: HTMLImageElement | null,
): Uint8ClampedArray | null {
  if (!image) return null;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  drawWatermark(ctx, size, size, image);
  return ctx.getImageData(0, 0, size, size).data;
}

function encodeInWorker(
  frames: Uint8ClampedArray[],
  indexes: number[],
  size: number,
  delay: number,
  filter: FilterId,
  watermark: Uint8ClampedArray | null,
): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL("../workers/gif.worker.ts", import.meta.url),
      {
        type: "module",
      },
    );
    worker.onmessage = ({ data }: MessageEvent<ArrayBuffer>) => {
      worker.terminate();
      resolve(new Uint8Array(data));
    };
    worker.onerror = () => {
      worker.terminate();
      reject(new Error("GIF worker failed"));
    };
    const frameBuffers = frames.map((frame) => frame.buffer as ArrayBuffer);
    const watermarkBuffer = watermark?.buffer as ArrayBuffer | undefined;
    const transfer: Transferable[] = [...frameBuffers];
    if (watermarkBuffer) transfer.push(watermarkBuffer);
    worker.postMessage(
      {
        frames: frameBuffers,
        frameIndexes: indexes,
        size,
        delay,
        filter,
        watermark: watermarkBuffer ?? null,
      },
      transfer,
    );
  });
}

/** Encode without blocking taps or animations while quantization is running. */
export async function encodeGif(
  frames: HTMLCanvasElement[],
  {
    size = 640,
    delay = GIF_DEFAULT_DELAY_MS,
    watermark = true,
    watermarkImg = null,
    filter = "original",
    boom = false,
  }: GifOptions = {},
): Promise<Blob> {
  const pixels = pixelsForFrames(frames, size);
  const overlay = watermark ? watermarkPixels(size, watermarkImg) : null;
  const indexes = frameIndexes(frames.length, boom);
  await yieldToBrowser();

  const bytes =
    typeof Worker === "undefined"
      ? encodeGifPixels({
          frames: pixels,
          frameIndexes: indexes,
          size,
          delay,
          filter,
          watermark: overlay,
        })
      : await encodeInWorker(pixels, indexes, size, delay, filter, overlay);

  return new Blob([bytes as unknown as BlobPart], { type: "image/gif" });
}
