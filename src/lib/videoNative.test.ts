import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { make, cancel, encodeVideo } = vi.hoisted(() => ({
  make: vi.fn(),
  cancel: vi.fn(),
  encodeVideo: vi.fn(),
}));

vi.mock("./boothBopVideoPlugin", () => ({
  BoothBopVideo: { make, cancel },
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
    cancel.mockReset();
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

  afterEach(() => {
    vi.useRealTimers();
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

  it("assigns a unique job ID to every native render", async () => {
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(
      (callback) => callback(new Blob(["frame"], { type: "image/png" })),
    );
    make.mockResolvedValue({ base64: "bXA0" });

    await encodeVideoNative([sourceFrame()]);
    await encodeVideoNative([sourceFrame()]);

    const firstJobId = make.mock.calls[0]?.[0]?.jobId;
    const secondJobId = make.mock.calls[1]?.[0]?.jobId;
    expect(firstJobId).toEqual(expect.any(String));
    expect(firstJobId).not.toBe("");
    expect(secondJobId).toEqual(expect.any(String));
    expect(secondJobId).not.toBe(firstJobId);
  });

  it("cancels the matching native render and never falls back after abort", async () => {
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(
      (callback) => callback(new Blob(["frame"], { type: "image/png" })),
    );
    make.mockImplementation(() => new Promise(() => undefined));
    cancel.mockResolvedValue({});
    const controller = new AbortController();

    const result = encodeVideoNative([sourceFrame()], {
      signal: controller.signal,
    });
    await vi.waitFor(() => expect(make).toHaveBeenCalledOnce());
    const jobId = make.mock.calls[0]?.[0]?.jobId;

    controller.abort();

    await expect(result).rejects.toMatchObject({ name: "AbortError" });
    expect(cancel).toHaveBeenCalledOnce();
    expect(cancel).toHaveBeenCalledWith({ jobId });
    expect(encodeVideo).not.toHaveBeenCalled();
  });

  it("waits for the matching native render to cancel before timeout fallback", async () => {
    vi.useFakeTimers();
    make.mockImplementation(() => new Promise(() => undefined));
    let finishCancellation!: () => void;
    cancel.mockImplementation(
      () =>
        new Promise((resolve) => {
          finishCancellation = () => resolve({ cancelled: true });
        }),
    );
    const fallback = {
      blob: new Blob(["fallback"], { type: "video/mp4" }),
      extension: "mp4",
    };
    encodeVideo.mockResolvedValue(fallback);

    const result = encodeVideoNative([]);
    await vi.advanceTimersByTimeAsync(0);
    expect(make).toHaveBeenCalledOnce();
    const jobId = make.mock.calls[0]?.[0]?.jobId;

    await vi.advanceTimersByTimeAsync(20_000);

    expect(cancel).toHaveBeenCalledOnce();
    expect(cancel).toHaveBeenCalledWith({ jobId });
    expect(encodeVideo).not.toHaveBeenCalled();

    finishCancellation();
    await vi.advanceTimersByTimeAsync(0);

    await expect(result).resolves.toBe(fallback);
    expect(encodeVideo).toHaveBeenCalledOnce();
  });

  it("waits for native cancellation before settling an abort", async () => {
    make.mockImplementation(() => new Promise(() => undefined));
    let finishCancellation!: () => void;
    cancel.mockImplementation(
      () =>
        new Promise((resolve) => {
          finishCancellation = () => resolve({ cancelled: true });
        }),
    );
    const controller = new AbortController();

    const result = encodeVideoNative([], { signal: controller.signal });
    await vi.waitFor(() => expect(make).toHaveBeenCalledOnce());
    const jobId = make.mock.calls[0]?.[0]?.jobId;
    let settled = false;
    void result.catch(() => {
      settled = true;
    });

    controller.abort();
    const stateAfterOneTurn = await Promise.race([
      result.then(
        () => "resolved",
        () => "rejected",
      ),
      new Promise<string>((resolve) => setTimeout(() => resolve("pending"), 0)),
    ]);

    expect(cancel).toHaveBeenCalledOnce();
    expect(cancel).toHaveBeenCalledWith({ jobId });
    expect(stateAfterOneTurn).toBe("pending");
    expect(settled).toBe(false);
    expect(encodeVideo).not.toHaveBeenCalled();

    finishCancellation();

    await expect(result).rejects.toMatchObject({ name: "AbortError" });
    expect(encodeVideo).not.toHaveBeenCalled();
  });

  it("does not overlap fallback when native cancellation fails", async () => {
    vi.useFakeTimers();
    make.mockImplementation(() => new Promise(() => undefined));
    cancel.mockRejectedValue(new Error("cancel failed"));

    const result = encodeVideoNative([]);
    const rejection = result.catch((caught: unknown) => caught);
    await vi.advanceTimersByTimeAsync(20_000);

    await expect(rejection).resolves.toMatchObject({
      message: expect.stringContaining("cancel failed"),
    });
    expect(cancel).toHaveBeenCalledOnce();
    expect(encodeVideo).not.toHaveBeenCalled();
  });

  it("clears the native timeout after the render settles", async () => {
    vi.useFakeTimers();
    make.mockResolvedValue({ base64: "bXA0" });

    const result = encodeVideoNative([]);
    await vi.advanceTimersByTimeAsync(0);

    await expect(result).resolves.toMatchObject({ extension: "mp4" });
    expect(vi.getTimerCount()).toBe(0);
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
