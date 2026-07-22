import { encodeGifPixels } from "../lib/gifCore";
import type { FilterId } from "../lib/filter";

interface WorkerRequest {
  frames: ArrayBuffer[];
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
  const bytes = encodeGifPixels({
    ...data,
    frames: data.frames.map((frame) => new Uint8ClampedArray(frame)),
    watermark: data.watermark ? new Uint8ClampedArray(data.watermark) : null,
  });
  const output = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
  worker.postMessage(output, [output]);
};
