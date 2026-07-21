// Native iOS looping-video path. Builds each frame in JS (scale + watermark, so
// the paid-tier watermark flag stays here) and hands the frames to the
// AVAssetWriter plugin, which muxes them into an MP4 — a real, sub-second encode
// instead of the web MediaRecorder's flaky ~5s real-time recording.
import { drawWatermark } from "./watermark";
import { encodeVideo, type VideoOptions, type VideoResult } from "./video";
import { drawFilteredFrame, type FilterId } from "./filter";

const NATIVE_TIMEOUT_MS = 20_000;

// Guard against the Capacitor 8 + SPM hazard where an unregistered plugin call
// never resolves: race the native call so we can fall back instead of hanging.
function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out`)), ms),
    ),
  ]);
}

function base64ToBlob(base64: string, mime: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

// One frame at the output size with the watermark, as base64 JPEG (no data:
// prefix) — exactly what the native plugin expects.
function frameToBase64(
  frame: HTMLCanvasElement,
  width: number,
  height: number,
  backgroundColor: string,
  watermark: boolean,
  watermarkImg: HTMLImageElement | null,
  filter: FilterId,
): string {
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
  return canvas.toDataURL("image/jpeg", 0.92).split(",")[1];
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
  }: VideoOptions = {},
): Promise<VideoResult> {
  try {
    const images = frames.map((f) =>
      frameToBase64(
        f,
        width,
        height,
        backgroundColor,
        watermark,
        watermarkImg,
        filter,
      ),
    );
    const { BoothBopVideo } = await import("./boothBopVideoPlugin");
    const { base64 } = await withTimeout(
      BoothBopVideo.make({
        images,
        size,
        width,
        height,
        bitrate,
        frameMs,
        loops,
        fps: 30,
      }),
      NATIVE_TIMEOUT_MS,
      "native video",
    );
    return { blob: base64ToBlob(base64, "video/mp4"), extension: "mp4" };
  } catch {
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
    });
  }
}
