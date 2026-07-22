import { afterEach, describe, expect, it, vi } from "vitest";
import {
  encodeVideo,
  isSocialVideoSupported,
  isVideoSupported,
  pickMimeType,
} from "./video";

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  // jsdom has no captureStream; remove any we added for a test.
  delete (HTMLCanvasElement.prototype as { captureStream?: unknown })
    .captureStream;
});

/** Fake a browser where only the listed mime types record. */
function stubMediaRecorder(supported: string[]) {
  const MR = function () {} as unknown as typeof MediaRecorder;
  (MR as { isTypeSupported: (t: string) => boolean }).isTypeSupported = (t) =>
    supported.includes(t);
  vi.stubGlobal("MediaRecorder", MR);
}

function stubEncoder({ emitStop }: { emitStop: boolean }) {
  const trackStops = [vi.fn(), vi.fn()];
  const stream = {
    getTracks: () => trackStops.map((stop) => ({ stop })),
  } as unknown as MediaStream;
  const context = {
    drawImage: vi.fn(),
    fillRect: vi.fn(),
    fillStyle: "",
    imageSmoothingEnabled: false,
    imageSmoothingQuality: "low",
  } as unknown as CanvasRenderingContext2D;

  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(context);
  (
    HTMLCanvasElement.prototype as {
      captureStream?: () => MediaStream;
    }
  ).captureStream = () => stream;

  class FakeMediaRecorder {
    static isTypeSupported = () => true;

    state: RecordingState = "inactive";
    ondataavailable: ((event: { data: Blob }) => void) | null = null;
    onerror: (() => void) | null = null;
    onstop: (() => void) | null = null;

    start() {
      this.state = "recording";
    }

    stop() {
      this.state = "inactive";
      if (emitStop) this.onstop?.();
    }
  }

  vi.stubGlobal("MediaRecorder", FakeMediaRecorder);
  return { trackStops };
}

describe("pickMimeType", () => {
  it("prefers mp4/avc1 when available", () => {
    stubMediaRecorder(["video/mp4;codecs=avc1", "video/webm"]);
    expect(pickMimeType()).toEqual({
      mimeType: "video/mp4;codecs=avc1",
      extension: "mp4",
    });
  });

  it("falls back to webm when mp4 is unsupported (Firefox-like)", () => {
    stubMediaRecorder(["video/webm;codecs=vp9"]);
    expect(pickMimeType()).toEqual({
      mimeType: "video/webm;codecs=vp9",
      extension: "webm",
    });
  });

  it("returns null when nothing records", () => {
    stubMediaRecorder([]);
    expect(pickMimeType()).toBeNull();
  });
});

describe("isVideoSupported", () => {
  it("is false without MediaRecorder (jsdom default)", () => {
    expect(isVideoSupported()).toBe(false);
  });

  it("is true with MediaRecorder + canvas.captureStream + a usable codec", () => {
    stubMediaRecorder(["video/mp4"]);
    (
      HTMLCanvasElement.prototype as { captureStream?: () => MediaStream }
    ).captureStream = () => ({}) as MediaStream;
    expect(isVideoSupported()).toBe(true);
  });
});

describe("isSocialVideoSupported", () => {
  it("requires MP4 on the web", () => {
    stubMediaRecorder(["video/webm;codecs=vp9"]);
    (
      HTMLCanvasElement.prototype as { captureStream?: () => MediaStream }
    ).captureStream = () => ({}) as MediaStream;
    expect(isSocialVideoSupported()).toBe(false);
  });

  it("accepts an MP4-capable browser", () => {
    stubMediaRecorder(["video/mp4"]);
    (
      HTMLCanvasElement.prototype as { captureStream?: () => MediaStream }
    ).captureStream = () => ({}) as MediaStream;
    expect(isSocialVideoSupported()).toBe(true);
  });
});

describe("encodeVideo", () => {
  it("rejects and stops capture tracks when MediaRecorder never emits stop", async () => {
    vi.useFakeTimers();
    const { trackStops } = stubEncoder({ emitStop: false });
    const frame = document.createElement("canvas");
    let outcome: "pending" | "resolved" | "rejected" = "pending";

    void encodeVideo([frame], {
      frameMs: 10,
      loops: 1,
      watermark: false,
    }).then(
      () => {
        outcome = "resolved";
      },
      () => {
        outcome = "rejected";
      },
    );

    await vi.advanceTimersByTimeAsync(5_000);

    expect(outcome).toBe("rejected");
    for (const trackStop of trackStops) {
      expect(trackStop).toHaveBeenCalledOnce();
    }
  });

  it("rejects zero-byte recorder output", async () => {
    const { trackStops } = stubEncoder({ emitStop: true });
    const frame = document.createElement("canvas");

    await expect(
      encodeVideo([frame], { frameMs: 0, loops: 1, watermark: false }),
    ).rejects.toThrow("no data");
    for (const trackStop of trackStops) {
      expect(trackStop).toHaveBeenCalledOnce();
    }
  });
});
