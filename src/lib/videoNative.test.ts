import { beforeEach, describe, expect, it, vi } from "vitest";

const { make, encodeVideo } = vi.hoisted(() => ({
  make: vi.fn(),
  encodeVideo: vi.fn(),
}));

vi.mock("./boothBopVideoPlugin", () => ({
  BoothBopVideo: { make },
}));

vi.mock("./video", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./video")>();
  return { ...actual, encodeVideo };
});

vi.mock("./filter", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./filter")>();
  return { ...actual, drawFilteredFrame: vi.fn() };
});

vi.mock("./watermark", () => ({ drawWatermark: vi.fn() }));

import { encodeVideoNative } from "./videoNative";

function sourceFrame(): HTMLCanvasElement {
  return document.createElement("canvas");
}

describe("encodeVideoNative", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    make.mockReset();
    encodeVideo.mockReset();

    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      fillRect: vi.fn(),
      fillStyle: "",
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockImplementation(
      () => {
        throw new Error("synchronous data URL encoding must not be used");
      },
    );
  });

  it("encodes lossless PNG frames asynchronously and preserves their order", async () => {
    const callbacks: BlobCallback[] = [];
    const toBlob = vi
      .spyOn(HTMLCanvasElement.prototype, "toBlob")
      .mockImplementation((callback, type) => {
        expect(type).toBe("image/png");
        callbacks.push(callback);
      });
    make.mockResolvedValue({ base64: "bXA0" });

    const resultPromise = encodeVideoNative([sourceFrame(), sourceFrame()], {
      width: 1080,
      height: 1350,
      bitrate: 16_000_000,
    });

    await vi.waitFor(() => expect(callbacks).toHaveLength(1));
    expect(make).not.toHaveBeenCalled();
    callbacks[0](new Blob(["first"], { type: "image/png" }));

    await vi.waitFor(() => expect(callbacks).toHaveLength(2));
    expect(make).not.toHaveBeenCalled();
    callbacks[1](new Blob(["second"], { type: "image/png" }));

    const result = await resultPromise;

    expect(toBlob).toHaveBeenCalledTimes(2);
    expect(HTMLCanvasElement.prototype.toDataURL).not.toHaveBeenCalled();
    expect(make).toHaveBeenCalledWith(
      expect.objectContaining({
        images: ["Zmlyc3Q=", "c2Vjb25k"],
        width: 1080,
        height: 1350,
        bitrate: 16_000_000,
      }),
    );
    expect(result.extension).toBe("mp4");
    expect(result.blob.type).toBe("video/mp4");
  });

  it("encodes a repeated canvas once while preserving repeated playback slots", async () => {
    const frame = sourceFrame();
    const toBlob = vi
      .spyOn(HTMLCanvasElement.prototype, "toBlob")
      .mockImplementation((callback, type) => {
        expect(type).toBe("image/png");
        callback(new Blob(["shared"], { type: "image/png" }));
      });
    make.mockResolvedValue({ base64: "bXA0" });

    await encodeVideoNative([frame, frame, frame], {
      width: 1080,
      height: 1350,
      bitrate: 16_000_000,
    });

    expect(toBlob).toHaveBeenCalledTimes(1);
    expect(make).toHaveBeenCalledWith(
      expect.objectContaining({
        images: ["c2hhcmVk", "c2hhcmVk", "c2hhcmVk"],
        width: 1080,
        height: 1350,
        bitrate: 16_000_000,
      }),
    );
  });

  it("falls back to the web encoder when PNG generation fails", async () => {
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(
      (callback) => callback(null),
    );
    const fallback = {
      blob: new Blob(["fallback"], { type: "video/mp4" }),
      extension: "mp4",
    };
    encodeVideo.mockResolvedValue(fallback);
    const frames = [sourceFrame()];

    await expect(
      encodeVideoNative(frames, { bitrate: 12_000_000 }),
    ).resolves.toBe(fallback);

    expect(make).not.toHaveBeenCalled();
    expect(encodeVideo).toHaveBeenCalledWith(
      frames,
      expect.objectContaining({ bitrate: 12_000_000 }),
    );
  });
});
