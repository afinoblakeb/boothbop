// Native iOS looping-video path. Builds each frame in JS (scale + watermark, so
// the paid-tier watermark flag stays here) and hands the frames to the
// AVAssetWriter plugin, which muxes them into an MP4 — a real, sub-second encode
// instead of the web MediaRecorder's flaky ~5s real-time recording.
import { drawWatermark } from "./watermark";
import { encodeVideo, type VideoOptions, type VideoResult } from "./video";
import { drawFilteredFrame, type FilterId } from "./filter";

const NATIVE_TIMEOUT_MS = 20_000;

class NativeCancellationError extends Error {
  constructor(jobId: string, cause: unknown) {
    const detail = cause instanceof Error ? `: ${cause.message}` : "";
    super(`Native video job ${jobId} cancellation failed${detail}`);
    this.name = "NativeCancellationError";
  }
}

// Own the native job's complete lifecycle so timeout/abort cannot leave an
// encoder running while the caller starts a fallback or replacement render.
function runNativeJob<T>(
  start: () => Promise<T>,
  jobId: string,
  cancel: (jobId: string) => Promise<unknown>,
  signal?: AbortSignal,
  timeoutMs = NATIVE_TIMEOUT_MS,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let settled = false;
    let started = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;

    const cleanup = () => {
      if (timeout !== undefined) {
        clearTimeout(timeout);
        timeout = undefined;
      }
      signal?.removeEventListener("abort", onAbort);
    };

    const rejectAfterCancellationFailure = (reason: Error, cause: unknown) => {
      if (reason.name === "AbortError") reject(reason);
      else reject(new NativeCancellationError(jobId, cause));
    };

    const cancelBeforeReject = (reason: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      if (!started) {
        reject(reason);
        return;
      }

      let cancellation: Promise<unknown>;
      try {
        cancellation = cancel(jobId);
      } catch (cause) {
        rejectAfterCancellationFailure(reason, cause);
        return;
      }
      void cancellation.then(
        () => reject(reason),
        (cause: unknown) => rejectAfterCancellationFailure(reason, cause),
      );
    };

    const onAbort = () =>
      cancelBeforeReject(new DOMException("Aborted", "AbortError"));

    signal?.addEventListener("abort", onAbort, { once: true });
    if (signal?.aborted) {
      onAbort();
      return;
    }

    timeout = setTimeout(
      () => cancelBeforeReject(new Error("native video timed out")),
      timeoutMs,
    );

    let promise: Promise<T>;
    try {
      started = true;
      promise = start();
    } catch (caught) {
      settled = true;
      cleanup();
      reject(caught);
      return;
    }

    void promise.then(
      (value) => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(value);
      },
      (caught: unknown) => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(caught);
      },
    );
  });
}

function newJobId(): string {
  const bytes = new Uint32Array(4);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (value) => value.toString(16).padStart(8, "0")).join(
    "-",
  );
}

function base64ToBlob(base64: string, mime: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

function yieldForPaint(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => resolve());
    } else {
      setTimeout(resolve, 0);
    }
  });
}

function canvasToPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("PNG frame encoding failed"));
    }, "image/png");
  });
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () =>
      reject(reader.error ?? new Error("Frame read failed"));
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Frame read returned an invalid result"));
        return;
      }
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.readAsDataURL(blob);
  });
}

// Render one lossless frame at the output size. Yielding before each frame and
// using toBlob/FileReader keeps PNG encoding and base64 conversion off the
// synchronous interaction path.
async function frameToBase64(
  frame: HTMLCanvasElement,
  width: number,
  height: number,
  backgroundColor: string,
  watermark: boolean,
  watermarkImg: HTMLImageElement | null,
  filter: FilterId,
): Promise<string> {
  await yieldForPaint();
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  const contentSize = Math.min(width, height);
  const contentX = Math.round((width - contentSize) / 2);
  const contentY = Math.round((height - contentSize) / 2);
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
  return blobToBase64(await canvasToPng(canvas));
}

export async function encodeVideoNative(
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
  try {
    signal?.throwIfAborted();
    const encodedFrames = new WeakMap<HTMLCanvasElement, Promise<string>>();
    const images: string[] = [];
    for (const frame of frames) {
      signal?.throwIfAborted();
      let encoded = encodedFrames.get(frame);
      if (!encoded) {
        encoded = frameToBase64(
          frame,
          width,
          height,
          backgroundColor,
          watermark,
          watermarkImg,
          filter,
        );
        encodedFrames.set(frame, encoded);
      }
      images.push(await encoded);
      signal?.throwIfAborted();
    }
    const { BoothBopVideo } = await import("./boothBopVideoPlugin");
    signal?.throwIfAborted();
    const jobId = newJobId();
    const { base64 } = await runNativeJob(
      () =>
        BoothBopVideo.make({
          jobId,
          images,
          size,
          width,
          height,
          bitrate,
          frameMs,
          loops,
          fps: 30,
        }),
      jobId,
      async (id) => BoothBopVideo.cancel({ jobId: id }),
      signal,
    );
    return { blob: base64ToBlob(base64, "video/mp4"), extension: "mp4" };
  } catch (caught) {
    if (
      (caught as Error).name === "AbortError" ||
      caught instanceof NativeCancellationError
    )
      throw caught;
    // Plugin missing (older build) or render failed — fall back to the web
    // recorder so the Video tab still produces something.
    return encodeVideo(frames, {
      size,
      width,
      height,
      backgroundColor,
      bitrate,
      frameMs,
      loops,
      watermark,
      watermarkImg,
      filter,
      signal,
    });
  }
}
