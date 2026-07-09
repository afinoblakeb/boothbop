// Camera access + frame capture helpers.

export const CAPTURE_SIZE = 720; // square capture resolution (px)

export type CameraFacing = "user" | "environment";

/** Request the selected camera. Falls back to any camera. */
export async function startCamera(
  facingMode: CameraFacing = "user",
): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Camera access isn't supported in this browser.");
  }

  const tryGet = (constraints: MediaStreamConstraints) =>
    navigator.mediaDevices.getUserMedia(constraints);

  try {
    return await tryGet({
      video: {
        facingMode: { ideal: facingMode },
        width: { ideal: 1280 },
        height: { ideal: 1280 },
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
  size = CAPTURE_SIZE,
  mirror = true,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  const vw = video.videoWidth || size;
  const vh = video.videoHeight || size;
  const side = Math.min(vw, vh);
  const sx = (vw - side) / 2;
  const sy = (vh - side) / 2;

  // Mirror horizontally when the preview is mirrored so the saved photo matches
  // exactly what the user saw while posing.
  if (mirror) {
    ctx.translate(size, 0);
    ctx.scale(-1, 1);
  }
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
