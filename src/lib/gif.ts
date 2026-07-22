import { drawWatermark } from "./watermark";
import { configureHighQualityScaling, type FilterId } from "./filter";
import { frameIndexes } from "./session";
import { encodeGifPixels } from "./gifCore";

export interface GifOptions {
  size?: number;
  delay?: number;
  watermark?: boolean;
  watermarkImg?: HTMLImageElement | null;
  filter?: FilterId;
  boom?: boolean;
  signal?: AbortSignal;
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
  configureHighQualityScaling(ctx);
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

interface GifWorkerPayload {
  frames?: ArrayBuffer[];
  bitmaps?: ImageBitmap[];
  frameIndexes: number[];
  size: number;
  delay: number;
  filter: FilterId;
  watermark: ArrayBuffer | null;
}

function runGifWorker(
  payload: GifWorkerPayload,
  transfer: Transferable[],
  signal?: AbortSignal,
): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL("../workers/gif.worker.ts", import.meta.url),
      {
        type: "module",
      },
    );
    let settled = false;
    const settle = (error?: Error, bytes?: Uint8Array) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      signal?.removeEventListener("abort", onAbort);
      worker.terminate();
      if (error) reject(error);
      else resolve(bytes!);
    };
    const onAbort = () => settle(new DOMException("Aborted", "AbortError"));
    const timeout = window.setTimeout(
      () => settle(new Error("GIF worker timed out")),
      30_000,
    );
    worker.onmessage = ({ data }: MessageEvent<unknown>) => {
      if (!(data instanceof ArrayBuffer)) {
        settle(new Error("GIF worker returned invalid data"));
        return;
      }
      settle(undefined, new Uint8Array(data));
    };
    worker.onerror = () => settle(new Error("GIF worker failed"));
    worker.onmessageerror = () =>
      settle(new Error("GIF worker response could not be read"));
    signal?.addEventListener("abort", onAbort, { once: true });
    if (signal?.aborted) {
      onAbort();
      return;
    }
    worker.postMessage(payload, transfer);
  });
}

async function encodeBitmapsInWorker(
  frames: HTMLCanvasElement[],
  indexes: number[],
  size: number,
  delay: number,
  filter: FilterId,
  watermark: Uint8ClampedArray | null,
  signal?: AbortSignal,
): Promise<Uint8Array> {
  const bitmaps = await Promise.all(
    frames.map((frame) => createImageBitmap(frame)),
  );
  signal?.throwIfAborted();
  const watermarkBuffer = watermark?.buffer as ArrayBuffer | undefined;
  const transfer: Transferable[] = [...bitmaps];
  if (watermarkBuffer) transfer.push(watermarkBuffer);
  return runGifWorker(
    {
      bitmaps,
      frameIndexes: indexes,
      size,
      delay,
      filter,
      watermark: watermarkBuffer ?? null,
    },
    transfer,
    signal,
  );
}

function encodePixelsInWorker(
  frames: Uint8ClampedArray[],
  indexes: number[],
  size: number,
  delay: number,
  filter: FilterId,
  watermark: Uint8ClampedArray | null,
  signal?: AbortSignal,
): Promise<Uint8Array> {
  const frameBuffers = frames.map((frame) => frame.buffer as ArrayBuffer);
  const watermarkBuffer = watermark?.buffer as ArrayBuffer | undefined;
  const transfer: Transferable[] = [...frameBuffers];
  if (watermarkBuffer) transfer.push(watermarkBuffer);
  return runGifWorker(
    {
      frames: frameBuffers,
      frameIndexes: indexes,
      size,
      delay,
      filter,
      watermark: watermarkBuffer ?? null,
    },
    transfer,
    signal,
  );
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
    signal,
  }: GifOptions = {},
): Promise<Blob> {
  signal?.throwIfAborted();
  const overlay = watermark ? watermarkPixels(size, watermarkImg) : null;
  const indexes = frameIndexes(frames.length, boom);
  await yieldToBrowser();
  signal?.throwIfAborted();

  let bytes: Uint8Array;
  if (
    typeof Worker !== "undefined" &&
    typeof OffscreenCanvas !== "undefined" &&
    typeof createImageBitmap === "function"
  ) {
    bytes = await encodeBitmapsInWorker(
      frames,
      indexes,
      size,
      delay,
      filter,
      overlay,
      signal,
    );
  } else {
    const pixels = pixelsForFrames(frames, size);
    bytes =
      typeof Worker === "undefined"
        ? encodeGifPixels({
            frames: pixels,
            frameIndexes: indexes,
            size,
            delay,
            filter,
            watermark: overlay,
          })
        : await encodePixelsInWorker(
            pixels,
            indexes,
            size,
            delay,
            filter,
            overlay,
            signal,
          );
  }

  signal?.throwIfAborted();
  return new Blob([bytes as unknown as BlobPart], { type: "image/gif" });
}
