import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CAMERA_MSG,
  CAPTURE_SIZE,
  MAX_CAPTURE_SIZE,
  cameraError,
  captureSizeForSource,
  captureSquareFrame,
  startCamera,
  stopCamera,
} from "./camera";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("captureSizeForSource", () => {
  it("uses the largest square supported by a high-quality 4:3 source", () => {
    expect(captureSizeForSource(1920, 1440)).toBe(1440);
  });

  it("caps very large sources at the export ceiling", () => {
    expect(captureSizeForSource(4032, 3024)).toBe(MAX_CAPTURE_SIZE);
  });

  it("never upscales a smaller source to the requested size", () => {
    expect(captureSizeForSource(640, 480, 1440)).toBe(480);
  });

  it("honours a smaller requested size as a downscale ceiling", () => {
    expect(captureSizeForSource(1920, 1440, 1080)).toBe(1080);
  });

  it("uses the legacy safe size while video metadata is unavailable", () => {
    expect(captureSizeForSource(0, 0)).toBe(CAPTURE_SIZE);
    expect(captureSizeForSource(Number.NaN, 1440, 480)).toBe(480);
  });
});

describe("startCamera", () => {
  it("requests a high-quality 4:3 front-camera stream", async () => {
    const stream = {} as MediaStream;
    const getUserMedia = vi.fn().mockResolvedValue(stream);
    vi.stubGlobal("navigator", { mediaDevices: { getUserMedia } });

    await expect(startCamera()).resolves.toBe(stream);
    expect(getUserMedia).toHaveBeenCalledWith({
      video: {
        facingMode: { ideal: "user" },
        width: { ideal: 1920 },
        height: { ideal: 1440 },
        aspectRatio: { ideal: 4 / 3 },
      },
      audio: false,
    });
  });

  it("retries with basic video when ideal constraints fail", async () => {
    const stream = {} as MediaStream;
    const getUserMedia = vi
      .fn()
      .mockRejectedValueOnce(new DOMException("Unavailable", "AbortError"))
      .mockResolvedValueOnce(stream);
    vi.stubGlobal("navigator", { mediaDevices: { getUserMedia } });

    await expect(startCamera()).resolves.toBe(stream);
    expect(getUserMedia).toHaveBeenCalledTimes(2);
    expect(getUserMedia).toHaveBeenLastCalledWith({
      video: true,
      audio: false,
    });
  });

  it("does not retry a denied permission request", async () => {
    const error = new DOMException("Denied", "NotAllowedError");
    const getUserMedia = vi.fn().mockRejectedValue(error);
    vi.stubGlobal("navigator", { mediaDevices: { getUserMedia } });

    await expect(startCamera()).rejects.toBe(error);
    expect(getUserMedia).toHaveBeenCalledOnce();
  });
});

describe("captureSquareFrame", () => {
  it("defaults to the real source square and mirrors the crop", () => {
    const video = document.createElement("video");
    Object.defineProperties(video, {
      videoWidth: { value: 1920 },
      videoHeight: { value: 1440 },
    });
    const context = {
      translate: vi.fn(),
      scale: vi.fn(),
      drawImage: vi.fn(),
    };
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
      context as unknown as CanvasRenderingContext2D,
    );

    const canvas = captureSquareFrame(video);

    expect(canvas.width).toBe(1440);
    expect(canvas.height).toBe(1440);
    expect(context.translate).toHaveBeenCalledWith(1440, 0);
    expect(context.scale).toHaveBeenCalledWith(-1, 1);
    expect(context.drawImage).toHaveBeenCalledWith(
      video,
      240,
      0,
      1440,
      1440,
      0,
      0,
      1440,
      1440,
    );
  });

  it("treats an explicit size as a ceiling instead of upscaling", () => {
    const video = document.createElement("video");
    Object.defineProperties(video, {
      videoWidth: { value: 640 },
      videoHeight: { value: 480 },
    });
    const context = {
      translate: vi.fn(),
      scale: vi.fn(),
      drawImage: vi.fn(),
    };
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
      context as unknown as CanvasRenderingContext2D,
    );

    const canvas = captureSquareFrame(video, 1440);

    expect(canvas.width).toBe(480);
    expect(canvas.height).toBe(480);
  });
});

describe("camera support helpers", () => {
  it("stops every stream track", () => {
    const tracks = [{ stop: vi.fn() }, { stop: vi.fn() }];
    stopCamera({ getTracks: () => tracks } as unknown as MediaStream);
    expect(tracks.every((track) => track.stop.mock.calls.length === 1)).toBe(
      true,
    );
  });

  it("maps permission failures to the camera permission message", () => {
    expect(cameraError(new DOMException("Denied", "NotAllowedError"))).toBe(
      CAMERA_MSG,
    );
  });
});
