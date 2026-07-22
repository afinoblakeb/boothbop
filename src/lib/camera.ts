// Camera access + frame capture helpers.
import { configureHighQualityScaling } from "./filter";

export const CAPTURE_SIZE = 720; // square capture resolution (px)
export const MAX_CAPTURE_SIZE = 1920;

interface CameraCapabilities extends MediaTrackCapabilities {
  focusMode?: string[];
  exposureMode?: string[];
  whiteBalanceMode?: string[];
}

interface CameraConstraintSet extends MediaTrackConstraintSet {
  focusMode?: string;
  exposureMode?: string;
  whiteBalanceMode?: string;
}

interface ImageCaptureConstructor {
  new (track: MediaStreamTrack): { takePhoto: () => Promise<Blob> };
}

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

/** Request the front ("selfie") camera with the best supported profile. */
export async function startCamera(): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Camera access isn't supported in this browser.");
  }

  const tryGet = (constraints: MediaStreamConstraints) =>
    navigator.mediaDevices.getUserMedia(constraints);

  const prepare = async (stream: MediaStream) => {
    const track = stream.getVideoTracks?.()[0];
    if (!track?.getCapabilities || !track.applyConstraints) return stream;
    try {
      const capabilities = track.getCapabilities() as CameraCapabilities;
      const advanced: CameraConstraintSet = {};
      if (capabilities.focusMode?.includes("continuous")) {
        advanced.focusMode = "continuous";
      }
      if (capabilities.exposureMode?.includes("continuous")) {
        advanced.exposureMode = "continuous";
      }
      if (capabilities.whiteBalanceMode?.includes("continuous")) {
        advanced.whiteBalanceMode = "continuous";
      }
      if (Object.keys(advanced).length) {
        await track.applyConstraints({
          advanced: [advanced],
        } as MediaTrackConstraints);
      }
    } catch {
      // Capability reporting varies across WebKit versions. Automatic camera
      // behavior remains active when an optional constraint is rejected.
    }
    return stream;
  };

  try {
    return await prepare(
      await tryGet({
        video: {
          facingMode: { ideal: "user" },
          width: { ideal: 1920 },
          height: { ideal: 1440 },
          aspectRatio: { ideal: 4 / 3 },
        },
        audio: false,
      }),
    );
  } catch (e) {
    const name = (e as Error)?.name;
    // Permission denied: don't retry, surface it so the UI can explain.
    if (name === "NotAllowedError" || name === "SecurityError") throw e;
    // Preserve the selfie-camera preference if a device rejects the ideal
    // resolution profile; never silently fall through to a rear camera.
    return prepare(
      await tryGet({
        video: { facingMode: { ideal: "user" } },
        audio: false,
      }),
    );
  }
}

export function drawMirroredSquare(
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  requestedSize: number,
): HTMLCanvasElement {
  const size = captureSizeForSource(sourceWidth, sourceHeight, requestedSize);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  configureHighQualityScaling(ctx);

  const side = Math.min(sourceWidth, sourceHeight);
  const sx = (sourceWidth - side) / 2;
  const sy = (sourceHeight - side) / 2;

  ctx.translate(size, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(source, sx, sy, side, side, 0, 0, size, size);
  return canvas;
}

/**
 * Prefer a real high-resolution still from the active camera track. Modern
 * WebKit exposes ImageCapture for this; older shells retain the proven video
 * frame path instead of failing a session.
 */
export async function captureBestSquareFrame(
  video: HTMLVideoElement,
  requestedSize = MAX_CAPTURE_SIZE,
): Promise<HTMLCanvasElement> {
  const stream = video.srcObject as MediaStream | null;
  const track = stream?.getVideoTracks?.()[0];
  const ImageCaptureApi = (
    globalThis as typeof globalThis & { ImageCapture?: ImageCaptureConstructor }
  ).ImageCapture;

  if (track && ImageCaptureApi && typeof createImageBitmap === "function") {
    try {
      const still = await new ImageCaptureApi(track).takePhoto();
      const bitmap = await createImageBitmap(still);
      try {
        return drawMirroredSquare(
          bitmap,
          bitmap.width,
          bitmap.height,
          requestedSize,
        );
      } finally {
        bitmap.close();
      }
    } catch {
      // Some WKWebView releases expose ImageCapture without a working still
      // implementation. Preserve capture reliability with the video frame.
    }
  }

  return captureSquareFrame(video, requestedSize);
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
  const fallback = captureSizeForSource(
    video.videoWidth,
    video.videoHeight,
    requestedSize,
  );
  const vw = video.videoWidth || fallback;
  const vh = video.videoHeight || fallback;
  return drawMirroredSquare(video, vw, vh, requestedSize);
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
