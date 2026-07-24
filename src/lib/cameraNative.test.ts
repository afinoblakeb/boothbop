import { afterEach, describe, expect, it, vi } from "vitest";

const cameraPlugin = vi.hoisted(() => ({
  isAvailable: vi.fn(),
  bopFXCapabilities: vi.fn(),
  setBopFX: vi.fn(),
  start: vi.fn(),
  setPreviewFrame: vi.fn(),
  capture: vi.fn(),
  release: vi.fn(),
  stop: vi.fn(),
  addListener: vi.fn(),
}));

vi.mock("./boothBopCameraPlugin", () => ({ BoothBopCamera: cameraPlugin }));

import {
  canUseNativeCamera,
  captureNativeSquareFrame,
  getNativeBopFXCapabilities,
  observeNativeCameraFailures,
  setNativeBopFX,
  setNativePreviewFrame,
  startNativeCamera,
  stopNativeCamera,
} from "./cameraNative";

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  Object.defineProperty(window, "Capacitor", {
    configurable: true,
    value: undefined,
  });
  Object.values(cameraPlugin).forEach((mock) => mock.mockReset());
});

function installCapacitor(values: Record<string, unknown>) {
  Object.defineProperty(window, "Capacitor", {
    configurable: true,
    value: values,
  });
}

function installNativePlugin(available = true) {
  installCapacitor({
    isNativePlatform: () => true,
    isPluginAvailable: (name: string) => available && name === "BoothBopCamera",
  });
}

describe("native camera bridge", () => {
  it("validates native BopFX capabilities and effect selection", async () => {
    installNativePlugin();
    cameraPlugin.bopFXCapabilities.mockResolvedValue({
      nativePreview: true,
      faceLandmarks: true,
      personSegmentation: true,
      metalRendering: true,
      arFaceTracking: true,
      maximumTrackedFaces: 3,
      trueDepthCamera: true,
      depthStream: true,
      effects: ["original", "spectralEcho", "notARealEffect", "mirrorBloom"],
    });
    cameraPlugin.setBopFX.mockResolvedValue({ effect: "spectralEcho" });

    await expect(getNativeBopFXCapabilities()).resolves.toEqual({
      nativePreview: true,
      faceLandmarks: true,
      personSegmentation: true,
      metalRendering: true,
      arFaceTracking: true,
      maximumTrackedFaces: 3,
      trueDepthCamera: true,
      depthStream: true,
      effects: ["original", "spectralEcho", "mirrorBloom"],
    });
    await setNativeBopFX("spectralEcho");

    expect(cameraPlugin.setBopFX).toHaveBeenCalledWith({
      effect: "spectralEcho",
    });
  });

  it("falls back to Original when BopFX capability probing fails", async () => {
    installNativePlugin();
    cameraPlugin.bopFXCapabilities.mockRejectedValue(
      new Error("Metal unavailable"),
    );

    await expect(getNativeBopFXCapabilities()).resolves.toEqual({
      nativePreview: false,
      faceLandmarks: false,
      personSegmentation: false,
      metalRendering: false,
      arFaceTracking: false,
      maximumTrackedFaces: 0,
      trueDepthCamera: false,
      depthStream: false,
      effects: ["original"],
    });
  });

  it("uses the bridge only in the native shell with an available camera", async () => {
    installNativePlugin();
    cameraPlugin.isAvailable.mockResolvedValue({ available: true });
    await expect(canUseNativeCamera()).resolves.toBe(true);

    vi.stubGlobal("window", {
      Capacitor: { isNativePlatform: () => false },
    });
    await expect(canUseNativeCamera()).resolves.toBe(false);
  });

  it("probes runtime-registered local plugins even when Capacitor does not advertise them", async () => {
    installNativePlugin(false);
    cameraPlugin.isAvailable.mockResolvedValue({ available: true });

    await expect(canUseNativeCamera()).resolves.toBe(true);
    expect(cameraPlugin.isAvailable).toHaveBeenCalledOnce();
  });

  it("starts, positions, and stops the native preview", async () => {
    cameraPlugin.start.mockResolvedValue({ width: 3024, height: 4032 });
    cameraPlugin.setPreviewFrame.mockResolvedValue({ visible: true });
    cameraPlugin.stop.mockResolvedValue({ stopped: true });

    await startNativeCamera();
    await setNativePreviewFrame(new DOMRect(12, 84, 366, 366), 8);
    await stopNativeCamera();

    expect(cameraPlugin.setPreviewFrame).toHaveBeenCalledWith({
      x: 12,
      y: 84,
      width: 366,
      height: 366,
      cornerRadius: 8,
    });
  });

  it("warms the JPEG decode path before reporting the native camera ready", async () => {
    cameraPlugin.start.mockResolvedValue({ width: 3024, height: 4032 });
    let finishDecode: ((bitmap: ImageBitmap) => void) | undefined;
    const close = vi.fn();
    const createImageBitmap = vi.fn().mockReturnValue(
      new Promise<ImageBitmap>((resolve) => {
        finishDecode = resolve;
      }),
    );
    vi.stubGlobal("createImageBitmap", createImageBitmap);
    const drawImage = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      drawImage,
    } as unknown as CanvasRenderingContext2D);

    let ready = false;
    const starting = startNativeCamera().then(() => {
      ready = true;
    });
    await vi.waitFor(() => {
      expect(createImageBitmap).toHaveBeenCalledOnce();
    });

    expect(cameraPlugin.start).toHaveBeenCalledOnce();
    expect(createImageBitmap).toHaveBeenCalledWith(
      expect.objectContaining({ type: "image/jpeg" }),
    );
    expect(ready).toBe(false);

    finishDecode?.({ width: 2, height: 2, close } as unknown as ImageBitmap);
    await starting;

    expect(drawImage).toHaveBeenCalledOnce();
    expect(close).toHaveBeenCalledOnce();
  });

  it("warms and releases the real native file before reporting ready", async () => {
    const fileURL = "file:///tmp/boothbop-warmup.jpg";
    const convertedURL =
      "capacitor://localhost/_capacitor_file_/tmp/boothbop-warmup.jpg";
    cameraPlugin.start.mockResolvedValue({
      width: 3024,
      height: 4032,
      warmupPath: fileURL,
    });
    cameraPlugin.release.mockResolvedValue({ released: true });
    installCapacitor({
      convertFileSrc: vi.fn().mockReturnValue(convertedURL),
    });
    const blob = new Blob(["warmup"], { type: "image/jpeg" });
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: vi.fn().mockResolvedValue(blob),
    });
    vi.stubGlobal("fetch", fetch);
    const close = vi.fn();
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn().mockResolvedValue({ width: 1920, height: 1920, close }),
    );
    const drawImage = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      drawImage,
    } as unknown as CanvasRenderingContext2D);

    await startNativeCamera();

    expect(fetch).toHaveBeenCalledWith(convertedURL);
    expect(drawImage).toHaveBeenCalledOnce();
    expect(close).toHaveBeenCalledOnce();
    expect(cameraPlugin.release).toHaveBeenCalledWith({ path: fileURL });
  });

  it("waits for a previous native session to stop before starting again", async () => {
    let finishStop: (() => void) | undefined;
    cameraPlugin.stop.mockReturnValue(
      new Promise((resolve) => {
        finishStop = () => resolve({ stopped: true });
      }),
    );
    cameraPlugin.start.mockResolvedValue({ width: 3024, height: 4032 });

    const stopping = stopNativeCamera();
    const restarting = startNativeCamera();
    await Promise.resolve();

    expect(cameraPlugin.start).not.toHaveBeenCalled();
    finishStop?.();
    await stopping;
    await restarting;
    expect(cameraPlugin.start).toHaveBeenCalledOnce();
  });

  it("serializes a stop requested during startup before the next start", async () => {
    const events: string[] = [];
    let finishFirstStart: (() => void) | undefined;
    cameraPlugin.start
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            events.push("start-1");
            finishFirstStart = () => {
              events.push("start-1-ready");
              resolve({ width: 3024, height: 4032 });
            };
          }),
      )
      .mockImplementationOnce(async () => {
        events.push("start-2");
        return { width: 3024, height: 4032 };
      });
    cameraPlugin.stop.mockImplementation(async () => {
      events.push("stop");
      return { stopped: true };
    });

    const firstStart = startNativeCamera();
    await vi.waitFor(() => expect(events).toEqual(["start-1"]));
    const stopping = stopNativeCamera();
    const secondStart = startNativeCamera();
    await Promise.resolve();
    expect(events).toEqual(["start-1"]);

    finishFirstStart?.();
    await Promise.all([firstStart, stopping, secondStart]);

    expect(events).toEqual(["start-1", "start-1-ready", "stop", "start-2"]);
  });

  it("lets a new start proceed when a native stop never settles", async () => {
    vi.useFakeTimers();
    cameraPlugin.stop.mockReturnValue(new Promise(() => {}));
    cameraPlugin.start.mockResolvedValue({ width: 3024, height: 4032 });

    const stopping = stopNativeCamera();
    const restarting = startNativeCamera();
    await vi.advanceTimersByTimeAsync(4_000);
    await Promise.all([stopping, restarting]);

    expect(cameraPlugin.start).toHaveBeenCalledOnce();
  });

  it("bounds preview positioning when the native bridge stalls", async () => {
    vi.useFakeTimers();
    cameraPlugin.setPreviewFrame.mockReturnValue(new Promise(() => {}));

    const positioning = setNativePreviewFrame(new DOMRect(0, 0, 390, 390), 8);
    const rejection = expect(positioning).rejects.toThrow(
      "native camera preview timed out",
    );
    await vi.advanceTimersByTimeAsync(4_000);
    await rejection;
  });

  it("forwards native session failures and removes the listener", async () => {
    cameraPlugin.start.mockResolvedValue({
      width: 3024,
      height: 4032,
      generation: 2,
    });
    await startNativeCamera();
    let listener:
      | ((event: { message: string; generation: number }) => void)
      | undefined;
    const remove = vi.fn().mockResolvedValue(undefined);
    cameraPlugin.addListener.mockImplementation(
      async (
        _eventName: string,
        callback: (event: { message: string; generation: number }) => void,
      ) => {
        listener = callback;
        return { remove };
      },
    );
    const onFailure = vi.fn();

    const unsubscribe = await observeNativeCameraFailures(onFailure);
    listener?.({ message: "Old camera was interrupted", generation: 1 });
    listener?.({ message: "Camera was interrupted", generation: 2 });
    unsubscribe();

    expect(onFailure).toHaveBeenCalledOnce();
    expect(onFailure).toHaveBeenCalledWith("Camera was interrupted");
    expect(remove).toHaveBeenCalledOnce();
  });

  it("loads the native square from a temporary file without a base64 bridge", async () => {
    const fileURL = "file:///tmp/boothbop-photo.jpg";
    const convertedURL =
      "capacitor://localhost/_capacitor_file_/tmp/boothbop-photo.jpg";
    cameraPlugin.capture.mockResolvedValue({
      path: fileURL,
      mimeType: "image/jpeg",
      width: 1920,
      height: 1920,
      mirrored: true,
    });
    cameraPlugin.release.mockResolvedValue({ released: true });
    installCapacitor({
      isNativePlatform: () => true,
      convertFileSrc: vi.fn().mockReturnValue(convertedURL),
    });
    const blob = new Blob(["jpeg"], { type: "image/jpeg" });
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: vi.fn().mockResolvedValue(blob),
    });
    vi.stubGlobal("fetch", fetch);
    const close = vi.fn();
    const bitmap = {
      width: 1920,
      height: 1920,
      close,
    } as unknown as ImageBitmap;
    vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue(bitmap));
    const context = {
      translate: vi.fn(),
      scale: vi.fn(),
      drawImage: vi.fn(),
    };
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
      context as unknown as CanvasRenderingContext2D,
    );

    const canvas = await captureNativeSquareFrame();

    expect(canvas.width).toBe(1920);
    expect(canvas.height).toBe(1920);
    expect(cameraPlugin.capture).toHaveBeenCalledWith({ size: 1920 });
    expect(fetch).toHaveBeenCalledWith(convertedURL);
    expect(context.drawImage).toHaveBeenCalledWith(
      bitmap,
      0,
      0,
      1920,
      1920,
      0,
      0,
      1920,
      1920,
    );
    expect(context.translate).not.toHaveBeenCalled();
    expect(context.scale).not.toHaveBeenCalled();
    expect(close).toHaveBeenCalledOnce();
    expect(cameraPlugin.release).toHaveBeenCalledWith({ path: fileURL });
  });

  it("releases the native file when WebKit cannot load it", async () => {
    const fileURL = "file:///tmp/boothbop-broken.jpg";
    cameraPlugin.capture.mockResolvedValue({
      path: fileURL,
      mimeType: "image/jpeg",
      width: 1920,
      height: 1920,
      mirrored: true,
    });
    cameraPlugin.release.mockResolvedValue({ released: true });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    const createImageBitmap = vi.fn();
    vi.stubGlobal("createImageBitmap", createImageBitmap);

    await expect(captureNativeSquareFrame()).rejects.toThrow(
      "Native photo file could not be loaded",
    );
    expect(createImageBitmap).not.toHaveBeenCalled();
    expect(cameraPlugin.release).toHaveBeenCalledWith({ path: fileURL });
  });
});
