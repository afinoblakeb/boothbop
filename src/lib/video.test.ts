import { afterEach, describe, expect, it, vi } from "vitest";
import { isVideoSupported, pickMimeType } from "./video";

afterEach(() => {
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
