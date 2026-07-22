// Camera access + frame capture helpers.
import { configureHighQualityScaling } from "./filter";

export const CAPTURE_SIZE = 720; // square capture resolution (px)
export const MAX_CAPTURE_SIZE = 1920;

/**
 * Choose a square capture size from the camera's real pixel dimensions.
 * `requestedSize` is a ceiling, never a target that may upscale the source.
 */
export function captureSizeForSource(
  sourceWidth: number,
  sourceHeight: number,
  requestedSize = MAX_CAPTURE_SIZE,
): number {
  const width = Math.floor(sourceWidth);
  const height = Math.floor(sourceHeight);
  const ceiling = Math.floor(requestedSize);
  const fallback = ceiling > 0 ? Math.min(ceiling, CAPTURE_SIZE) : CAPTURE_SIZE;

  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  ) {
    return fallback;
  }

  if (!Number.isFinite(ceiling) || ceiling <= 0) {
    return Math.min(width, height);
  }

  return Math.min(width, height, ceiling);
}

/** Request the front ("selfie") camera. Falls back to any camera. */
export async function startCamera(): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Camera access isn't supported in this browser.");
  }

  const tryGet = (constraints: MediaStreamConstraints) =>
    navigator.mediaDevices.getUserMedia(constraints);

  try {
    return await tryGet({
      video: {
        facingMode: { ideal: "user" },
        width: { ideal: 1920 },
        height: { ideal: 1440 },
        aspectRatio: { ideal: 4 / 3 },
      },
      audio: false,
    });
  } catch (e) {
    const name = (e as Error)?.name;
    // Permission denied: don't retry, surface it so the UI can explain.
    if (name === "NotAllowedError" || name === "SecurityError") throw e;
    // Otherwise the ideal constraints were too strict — retry with basics.
    return await tryGet({ video: true, audio: false });
  }
}

export function stopCamera(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

/**
 * Capture a centred square frame from a <video>, mirrored to match the
 * selfie preview the user is looking at.
 */
export function captureSquareFrame(
  video: HTMLVideoElement,
  requestedSize = MAX_CAPTURE_SIZE,
): HTMLCanvasElement {
  const size = captureSizeForSource(
    video.videoWidth,
    video.videoHeight,
    requestedSize,
  );
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  configureHighQualityScaling(ctx);

  const vw = video.videoWidth || size;
  const vh = video.videoHeight || size;
  const side = Math.min(vw, vh);
  const sx = (vw - side) / 2;
  const sy = (vh - side) / 2;

  // Mirror horizontally so the saved photo matches the on-screen preview.
  ctx.translate(size, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, sx, sy, side, side, 0, 0, size, size);
  return canvas;
}

export const CAMERA_MSG =
  "BoothBop requires camera permission. Please try again.";

/** Friendly message for a getUserMedia failure. */
export function cameraError(e: unknown): string {
  const name = (e as Error)?.name;
  if (name === "NotAllowedError" || name === "SecurityError") return CAMERA_MSG;
  if (name === "NotFoundError" || name === "OverconstrainedError") {
    return "No camera found on this device.";
  }
  if (name === "NotReadableError") {
    return "The camera is in use by another app. Close it and try again.";
  }
  return "Couldn't access the camera. Please try again.";
}

/** Resolve once the video has real pixels (so we never capture black). */
export function videoReady(
  video: HTMLVideoElement,
  timeoutMs = 2500,
): Promise<boolean> {
  if (video.videoWidth > 0) return Promise.resolve(true);
  return new Promise((resolve) => {
    const deadline = Date.now() + timeoutMs;
    const tick = () => {
      if (video.videoWidth > 0) return resolve(true);
      if (Date.now() > deadline) return resolve(false);
      requestAnimationFrame(tick);
    };
    tick();
  });
}
