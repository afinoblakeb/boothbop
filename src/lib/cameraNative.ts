import { BoothBopCamera } from "./boothBopCameraPlugin";
import { captureSizeForSource, MAX_CAPTURE_SIZE } from "./camera";
import { configureHighQualityScaling } from "./filter";
import { isNativeShell } from "./platform";

const START_TIMEOUT_MS = 12_000;
const CAPTURE_TIMEOUT_MS = 15_000;
const PREVIEW_TIMEOUT_MS = 3_000;
const STOP_TIMEOUT_MS = 3_000;
const WARMUP_JPEG =
  "/9j/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAACAAIDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAAAP/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AAA//2Q==";
let lifecycleQueue: Promise<void> = Promise.resolve();
let activeGeneration = 0;

function enqueueLifecycle<T>(operation: () => Promise<T>): Promise<T> {
  const result = lifecycleQueue.then(operation);
  lifecycleQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

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
  await enqueueLifecycle(async () => {
    activeGeneration = 0;
    const started = await withTimeout(
      BoothBopCamera.start(),
      START_TIMEOUT_MS,
      "native camera",
    );
    activeGeneration = started.generation;
    await warmWebImagePipeline(started.warmupPath);
  });
}

export async function setNativePreviewFrame(
  rect: DOMRect,
  cornerRadius: number,
): Promise<void> {
  await withTimeout(
    BoothBopCamera.setPreviewFrame({
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      cornerRadius,
    }),
    PREVIEW_TIMEOUT_MS,
    "native camera preview",
  );
}

export async function stopNativeCamera(): Promise<void> {
  activeGeneration = 0;
  await enqueueLifecycle(async () => {
    try {
      await withTimeout(
        BoothBopCamera.stop(),
        STOP_TIMEOUT_MS,
        "native camera stop",
      );
    } catch {
      // Stopping is idempotent and best-effort during navigation/unmount.
    }
  });
}

export async function observeNativeCameraFailures(
  onFailure: (message: string) => void,
): Promise<() => void> {
  try {
    const listener = await BoothBopCamera.addListener(
      "stateChanged",
      ({ message, generation }) => {
        if (activeGeneration !== 0 && generation === activeGeneration) {
          onFailure(message);
        }
      },
    );
    return () => {
      void listener.remove();
    };
  } catch {
    return () => {};
  }
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type: mimeType });
}

function convertFileSrc(path: string): string {
  const capacitor = (
    window as Window & {
      Capacitor?: { convertFileSrc?: (path: string) => string };
    }
  ).Capacitor;
  return capacitor?.convertFileSrc?.(path) ?? path;
}

async function readNativePhoto(path: string): Promise<Blob> {
  const response = await fetch(convertFileSrc(path));
  if (!response.ok) throw new Error("Native photo file could not be loaded");
  return response.blob();
}

async function releaseNativePhoto(path: string): Promise<void> {
  try {
    await BoothBopCamera.release({ path });
  } catch {
    // Temporary-directory cleanup is also enforced when the camera stops.
  }
}

async function warmWebImagePipeline(warmupPath?: string): Promise<void> {
  if (typeof createImageBitmap !== "function") {
    if (warmupPath) await releaseNativePhoto(warmupPath);
    return;
  }
  let bitmap: ImageBitmap | undefined;
  try {
    const blob = warmupPath
      ? await readNativePhoto(warmupPath)
      : base64ToBlob(WARMUP_JPEG, "image/jpeg");
    bitmap = await createImageBitmap(blob);
    const canvas = document.createElement("canvas");
    canvas.width = MAX_CAPTURE_SIZE;
    canvas.height = MAX_CAPTURE_SIZE;
    const context = canvas.getContext("2d");
    if (context) {
      configureHighQualityScaling(context);
      context.drawImage(
        bitmap,
        0,
        0,
        bitmap.width,
        bitmap.height,
        0,
        0,
        canvas.width,
        canvas.height,
      );
    }
  } catch {
    // This is a startup optimization. Native capture remains available if an
    // older WebKit build cannot pre-decode the tiny local JPEG.
  } finally {
    bitmap?.close();
    if (warmupPath) await releaseNativePhoto(warmupPath);
  }
}

export async function captureNativeSquareFrame(
  requestedSize = MAX_CAPTURE_SIZE,
): Promise<HTMLCanvasElement> {
  const photo = await withTimeout(
    BoothBopCamera.capture({ size: requestedSize }),
    CAPTURE_TIMEOUT_MS,
    "native photo",
  );
  let bitmap: ImageBitmap | undefined;
  try {
    bitmap = await createImageBitmap(await readNativePhoto(photo.path));
    const sourceWidth = bitmap.width || photo.width;
    const sourceHeight = bitmap.height || photo.height;
    const size = captureSizeForSource(sourceWidth, sourceHeight, requestedSize);
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d")!;
    configureHighQualityScaling(context);
    context.drawImage(
      bitmap,
      0,
      0,
      sourceWidth,
      sourceHeight,
      0,
      0,
      size,
      size,
    );
    return canvas;
  } finally {
    bitmap?.close();
    await releaseNativePhoto(photo.path);
  }
}
