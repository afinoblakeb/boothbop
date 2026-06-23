// Camera access + frame capture helpers.

export const CAPTURE_SIZE = 720; // square capture resolution (px)

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

  // Mirror horizontally so the saved photo matches the on-screen preview.
  ctx.translate(size, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, sx, sy, side, side, 0, 0, size, size);
  return canvas;
}
