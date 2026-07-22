import { BoothBopCamera } from "./boothBopCameraPlugin";
import { drawMirroredSquare, MAX_CAPTURE_SIZE } from "./camera";
import { isNativeShell } from "./platform";

const START_TIMEOUT_MS = 12_000;
const CAPTURE_TIMEOUT_MS = 15_000;
let pendingStop: Promise<void> = Promise.resolve();

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(
      () => reject(new Error(`${label} timed out`)),
      timeoutMs,
    );
    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        window.clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export async function canUseNativeCamera(): Promise<boolean> {
  if (!isNativeShell()) return false;
  try {
    return (await BoothBopCamera.isAvailable()).available;
  } catch {
    return false;
  }
}

export async function startNativeCamera(): Promise<void> {
  await pendingStop;
  await withTimeout(BoothBopCamera.start(), START_TIMEOUT_MS, "native camera");
}

export async function setNativePreviewFrame(
  rect: DOMRect,
  cornerRadius: number,
): Promise<void> {
  await BoothBopCamera.setPreviewFrame({
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
    cornerRadius,
  });
}

export async function stopNativeCamera(): Promise<void> {
  pendingStop = pendingStop.then(async () => {
    try {
      await BoothBopCamera.stop();
    } catch {
      // Stopping is idempotent and best-effort during navigation/unmount.
    }
  });
  await pendingStop;
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type: mimeType });
}

export async function captureNativeSquareFrame(
  requestedSize = MAX_CAPTURE_SIZE,
): Promise<HTMLCanvasElement> {
  const photo = await withTimeout(
    BoothBopCamera.capture(),
    CAPTURE_TIMEOUT_MS,
    "native photo",
  );
  const bitmap = await createImageBitmap(
    base64ToBlob(photo.data, photo.mimeType || "image/jpeg"),
  );
  try {
    return drawMirroredSquare(
      bitmap,
      bitmap.width || photo.width,
      bitmap.height || photo.height,
      requestedSize,
    );
  } finally {
    bitmap.close();
  }
}
