import { afterEach, describe, expect, it, vi } from "vitest";

const cameraPlugin = vi.hoisted(() => ({
  isAvailable: vi.fn(),
  start: vi.fn(),
  setPreviewFrame: vi.fn(),
  capture: vi.fn(),
  stop: vi.fn(),
}));

vi.mock("./boothBopCameraPlugin", () => ({ BoothBopCamera: cameraPlugin }));

import {
  canUseNativeCamera,
  captureNativeSquareFrame,
  setNativePreviewFrame,
  startNativeCamera,
  stopNativeCamera,
} from "./cameraNative";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  Object.values(cameraPlugin).forEach((mock) => mock.mockReset());
});

function installNativePlugin(available = true) {
  vi.stubGlobal("window", {
    Capacitor: {
      isNativePlatform: () => true,
      isPluginAvailable: (name: string) =>
        available && name === "BoothBopCamera",
    },
  });
}

describe("native camera bridge", () => {
  it("uses the bridge only when the native plugin is registered and available", async () => {
    installNativePlugin();
    cameraPlugin.isAvailable.mockResolvedValue({ available: true });
    await expect(canUseNativeCamera()).resolves.toBe(true);

    installNativePlugin(false);
    await expect(canUseNativeCamera()).resolves.toBe(false);
  });

  it("starts, positions, and stops the native preview", async () => {
    cameraPlugin.start.mockResolvedValue({ width: 3024, height: 4032 });
    cameraPlugin.setPreviewFrame.mockResolvedValue({ visible: true });
    cameraPlugin.stop.mockResolvedValue({ stopped: true });

    await startNativeCamera();
    await setNativePreviewFrame(new DOMRect(12, 84, 366, 366));
    await stopNativeCamera();

    expect(cameraPlugin.setPreviewFrame).toHaveBeenCalledWith({
      x: 12,
      y: 84,
      width: 366,
      height: 366,
    });
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

  it("turns the full-resolution native JPEG into a mirrored square", async () => {
    const binary = btoa("jpeg");
    cameraPlugin.capture.mockResolvedValue({
      data: binary,
      mimeType: "image/jpeg",
      width: 4032,
      height: 3024,
    });
    const close = vi.fn();
    const bitmap = {
      width: 4032,
      height: 3024,
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
    expect(context.drawImage).toHaveBeenCalledWith(
      bitmap,
      504,
      0,
      3024,
      3024,
      0,
      0,
      1920,
      1920,
    );
    expect(close).toHaveBeenCalledOnce();
  });
});
