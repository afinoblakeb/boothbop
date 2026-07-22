import { encodeGifPixels } from "../lib/gifCore";
import type { FilterId } from "../lib/filter";

interface WorkerRequest {
  frames?: ArrayBuffer[];
  bitmaps?: ImageBitmap[];
  frameIndexes: number[];
  size: number;
  delay: number;
  filter: FilterId;
  watermark: ArrayBuffer | null;
}

const worker = globalThis as unknown as {
  onmessage: ((event: MessageEvent<WorkerRequest>) => void) | null;
  postMessage: (message: ArrayBuffer, transfer: Transferable[]) => void;
};

worker.onmessage = ({ data }) => {
  let frames: Uint8ClampedArray[];
  if (data.bitmaps) {
    const canvas = new OffscreenCanvas(data.size, data.size);
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("GIF worker canvas is unavailable");
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    frames = data.bitmaps.map((bitmap) => {
      context.clearRect(0, 0, data.size, data.size);
      context.drawImage(bitmap, 0, 0, data.size, data.size);
      bitmap.close();
      return context.getImageData(0, 0, data.size, data.size).data;
    });
  } else {
    frames = (data.frames ?? []).map((frame) => new Uint8ClampedArray(frame));
  }
  const bytes = encodeGifPixels({
    ...data,
    frames,
    watermark: data.watermark ? new Uint8ClampedArray(data.watermark) : null,
  });
  const output = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
  worker.postMessage(output, [output]);
};
