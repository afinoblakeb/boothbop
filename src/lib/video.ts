// Record the 4 frames into a short looping video via canvas + MediaRecorder.
// (On native iOS the AVAssetWriter plugin is preferred — see videoNative.ts.)
import { drawWatermark } from "./watermark";
import { isNativeShell } from "./platform";
import { drawFilteredFrame, type FilterId } from "./filter";

export interface VideoOptions {
  size?: number; // output dimension (square)
  width?: number; // output width; defaults to size
  height?: number; // output height; defaults to size
  backgroundColor?: string; // visible around a centered square frame
  bitrate?: number; // target video bitrate (bits/sec)
  frameMs?: number; // how long each photo stays on screen
  loops?: number; // how many times to cycle through the 4 photos
  watermark?: boolean; // brand watermark bottom-right (paid feature removes it)
  watermarkImg?: HTMLImageElement | null; // preloaded logo
  filter?: FilterId;
  signal?: AbortSignal;
}

export interface VideoResult {
  blob: Blob;
  extension: string; // "mp4" or "webm"
}

/** Pick the best video container/codec the browser will actually record. */
export function pickMimeType(): { mimeType: string; extension: string } | null {
  const candidates: { mimeType: string; extension: string }[] = [
    { mimeType: "video/mp4;codecs=avc1", extension: "mp4" },
    { mimeType: "video/mp4", extension: "mp4" },
    { mimeType: "video/webm;codecs=vp9", extension: "webm" },
    { mimeType: "video/webm;codecs=vp8", extension: "webm" },
    { mimeType: "video/webm", extension: "webm" },
  ];
  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported?.(c.mimeType)) return c;
  }
  return null;
}

function webVideoSupported(): boolean {
  return (
    typeof MediaRecorder !== "undefined" &&
    typeof HTMLCanvasElement.prototype.captureStream === "function" &&
    pickMimeType() !== null
  );
}

export function isVideoSupported(): boolean {
  // Native iOS always supports video via the AVAssetWriter plugin; the web path
  // depends on MediaRecorder + canvas.captureStream.
  return isNativeShell() || webVideoSupported();
}

/** True only when this runtime can produce the MP4 social apps expect. */
export function isSocialVideoSupported(): boolean {
  if (isNativeShell()) return true;
  return webVideoSupported() && pickMimeType()?.extension === "mp4";
}

export async function encodeVideo(
  frames: HTMLCanvasElement[],
  {
    size = 720,
    width = size,
    height = size,
    backgroundColor = "#f6e7cf",
    bitrate = 6_000_000,
    frameMs = 600,
    loops = 2,
    watermark = true,
    watermarkImg = null,
    filter = "original",
    signal,
  }: VideoOptions = {},
): Promise<VideoResult> {
  signal?.throwIfAborted();
  const picked = pickMimeType();
  if (!picked) throw new Error("Video recording isn't supported here.");

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  const contentSize = Math.min(width, height);
  const contentX = Math.round((width - contentSize) / 2);
  const contentY = Math.round((height - contentSize) / 2);

  const draw = (frame: HTMLCanvasElement) => {
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);
    drawFilteredFrame(
      ctx,
      frame,
      contentX,
      contentY,
      contentSize,
      contentSize,
      filter,
    );
    if (watermark)
      drawWatermark(
        ctx,
        contentSize,
        contentSize,
        watermarkImg,
        0.85,
        contentX,
        contentY,
      );
  };
  draw(frames[0]);

  const stream = canvas.captureStream(30);
  const recorder = new MediaRecorder(stream, {
    mimeType: picked.mimeType,
    videoBitsPerSecond: bitrate,
  });
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);

  let terminalError: Error | null = null;
  let stopped = false;
  const stop = () => {
    if (stopped) return;
    stopped = true;
    if (recorder.state !== "inactive") recorder.stop();
  };
  const done = new Promise<VideoResult>((resolve, reject) => {
    recorder.onstop = () => {
      if (terminalError) reject(terminalError);
      else
        resolve({
          blob: new Blob(chunks, { type: picked.mimeType }),
          extension: picked.extension,
        });
    };
    recorder.onerror = () => {
      terminalError = new Error("Video recorder failed.");
      stop();
    };
  });

  recorder.start();

  // Stretch guard: MediaRecorder is wall-clock timed, but a backgrounded app
  // freezes the canvas and throttles timers — which would otherwise produce a
  // tens-of-seconds clip of a frozen frame. Stop the instant we're hidden, and
  // cap the total duration as a backstop.
  const onHidden = () => {
    if (document.visibilityState === "hidden") {
      terminalError = new Error("Video recording was interrupted.");
      stop();
    }
  };
  const onAbort = () => {
    terminalError = new DOMException("Aborted", "AbortError");
    stop();
  };
  document.addEventListener("visibilitychange", onHidden);
  signal?.addEventListener("abort", onAbort, { once: true });
  if (signal?.aborted) onAbort();
  const deadline = setTimeout(
    () => {
      terminalError = new Error("Video recording timed out.");
      stop();
    },
    loops * frames.length * frameMs + 1500,
  );

  const sequence: HTMLCanvasElement[] = [];
  for (let l = 0; l < loops; l++) sequence.push(...frames);
  try {
    for (const frame of sequence) {
      if (stopped) break;
      draw(frame);
      await wait(frameMs);
      signal?.throwIfAborted();
    }
    stop();
    return await done;
  } finally {
    clearTimeout(deadline);
    document.removeEventListener("visibilitychange", onHidden);
    signal?.removeEventListener("abort", onAbort);
    stop();
    stream.getTracks().forEach((track) => track.stop());
  }
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
