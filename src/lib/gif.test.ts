import { afterEach, describe, expect, it, vi } from "vitest";
import { encodeGif } from "./gif";

const workerPostMessage = vi.fn();

class UnusedWorker {
  postMessage = workerPostMessage;
  terminate = vi.fn();
}

function bitmap() {
  return {
    close: vi.fn(),
  } as unknown as ImageBitmap;
}

function deferredBitmap() {
  let resolve!: (bitmap: ImageBitmap) => void;
  const promise = new Promise<ImageBitmap>((finish) => {
    resolve = finish;
  });
  return { promise, resolve };
}

function useBitmapWorkerPath(
  createImageBitmap: ReturnType<typeof vi.fn>,
  worker: unknown = UnusedWorker,
) {
  vi.stubGlobal("Worker", worker);
  vi.stubGlobal("OffscreenCanvas", class {});
  vi.stubGlobal("createImageBitmap", createImageBitmap);
}

afterEach(() => {
  workerPostMessage.mockClear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("encodeGif bitmap ownership", () => {
  it("closes decoded and late-arriving bitmaps when cancelled", async () => {
    const controller = new AbortController();
    const first = bitmap();
    const second = bitmap();
    const pending = deferredBitmap();
    const createImageBitmap = vi
      .fn()
      .mockResolvedValueOnce(first)
      .mockReturnValueOnce(pending.promise);
    useBitmapWorkerPath(createImageBitmap);

    const encoding = encodeGif(
      [{} as HTMLCanvasElement, {} as HTMLCanvasElement],
      { watermark: false, signal: controller.signal },
    );
    await vi.waitFor(() => expect(createImageBitmap).toHaveBeenCalledTimes(2));

    controller.abort();
    expect(first.close).toHaveBeenCalledOnce();

    pending.resolve(second);
    await expect(encoding).rejects.toMatchObject({ name: "AbortError" });
    expect(second.close).toHaveBeenCalledOnce();
    expect(workerPostMessage).not.toHaveBeenCalled();
  });

  it("closes every decoded bitmap after a partial decode failure", async () => {
    const first = bitmap();
    const third = bitmap();
    const pending = deferredBitmap();
    const decodeError = new Error("decode failed");
    const createImageBitmap = vi
      .fn()
      .mockResolvedValueOnce(first)
      .mockRejectedValueOnce(decodeError)
      .mockReturnValueOnce(pending.promise);
    useBitmapWorkerPath(createImageBitmap);

    const encoding = encodeGif(
      [
        {} as HTMLCanvasElement,
        {} as HTMLCanvasElement,
        {} as HTMLCanvasElement,
      ],
      { watermark: false },
    );

    await expect(encoding).rejects.toBe(decodeError);
    expect(first.close).toHaveBeenCalledOnce();

    pending.resolve(third);
    await vi.waitFor(() => expect(third.close).toHaveBeenCalledOnce());
    expect(workerPostMessage).not.toHaveBeenCalled();
  });

  it("closes a bitmap when transfer to the worker fails", async () => {
    const decoded = bitmap();
    const transferError = new DOMException("transfer failed", "DataCloneError");
    class FailingWorker extends UnusedWorker {
      postMessage = vi.fn(() => {
        throw transferError;
      });
    }
    useBitmapWorkerPath(vi.fn().mockResolvedValue(decoded), FailingWorker);

    await expect(
      encodeGif([{} as HTMLCanvasElement], { watermark: false }),
    ).rejects.toThrow("GIF worker request could not be sent");
    expect(decoded.close).toHaveBeenCalledOnce();
  });

  it("does not close a bitmap after ownership transfers", async () => {
    const decoded = bitmap();
    class TransferringWorker extends UnusedWorker {
      postMessage = vi.fn(() => {
        queueMicrotask(() => this.onerror?.(new Event("error")));
      });
      onerror: ((event: Event) => void) | null = null;
    }
    useBitmapWorkerPath(vi.fn().mockResolvedValue(decoded), TransferringWorker);

    await expect(
      encodeGif([{} as HTMLCanvasElement], { watermark: false }),
    ).rejects.toThrow("GIF worker failed");
    expect(decoded.close).not.toHaveBeenCalled();
  });
});
