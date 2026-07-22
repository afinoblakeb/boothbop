import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nativeShareFile, uniqueShareFilename } from "./nativeShare";

const WRITE_TIMEOUT_MS = 15_000;
const SHARE_TIMEOUT_MS = 10 * 60_000;
const CLEANUP_TIMEOUT_MS = 5_000;

const native = vi.hoisted(() => ({
  isNative: true,
  writeFile: vi.fn(),
  share: vi.fn(),
  deleteFile: vi.fn(),
}));

vi.mock("./platform", () => ({
  isNativeShell: () => native.isNative,
}));

vi.mock("@capacitor/filesystem", () => ({
  Directory: { Cache: "CACHE" },
  Filesystem: {
    writeFile: native.writeFile,
    deleteFile: native.deleteFile,
  },
}));

vi.mock("@capacitor/share", () => ({
  Share: { share: native.share },
}));

class ImmediateFileReader {
  error: DOMException | null = null;
  onerror: (() => void) | null = null;
  onloadend: (() => void) | null = null;
  result: string | ArrayBuffer | null = null;

  readAsDataURL() {
    this.result = "data:image/png;base64,AQ==";
    this.onloadend?.();
  }
}

function pending<T>(): Promise<T> {
  return new Promise(() => {});
}

async function outcomeOf(promise: Promise<unknown>) {
  let outcome: "resolved" | "rejected" | undefined;
  void promise.then(
    () => {
      outcome = "resolved";
    },
    () => {
      outcome = "rejected";
    },
  );
  await vi.advanceTimersByTimeAsync(1);
  return () => outcome;
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers();
  vi.stubGlobal("FileReader", ImmediateFileReader);
  native.isNative = true;
  native.writeFile.mockResolvedValue({ uri: "file:///cache/share.png" });
  native.share.mockResolvedValue({ activityType: "save-image" });
  native.deleteFile.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("native share cache files", () => {
  it("uses a unique path for repeated shares in the same second", () => {
    expect(uniqueShareFilename("boothbop.gif", "first")).toBe(
      "first-boothbop.gif",
    );
    expect(uniqueShareFilename("boothbop.gif", "second")).not.toBe(
      uniqueShareFilename("boothbop.gif", "first"),
    );
  });

  it("passes the cache URI to the native share sheet and removes it", async () => {
    await expect(
      nativeShareFile(new Blob([new Uint8Array([1])]), "share.png"),
    ).resolves.toBe(true);

    const { path, directory } = native.writeFile.mock.calls[0][0];
    expect(native.writeFile).toHaveBeenCalledWith({
      path,
      data: "AQ==",
      directory: "CACHE",
    });
    expect(native.share).toHaveBeenCalledWith({
      title: "BoothBop",
      files: ["file:///cache/share.png"],
    });
    expect(native.deleteFile).toHaveBeenCalledWith({ path, directory });
  });

  it("attempts cleanup when the native cache write stalls", async () => {
    native.writeFile.mockReturnValue(pending());
    const share = nativeShareFile(new Blob(["photo"]), "share.png");
    const getOutcome = await outcomeOf(share);

    await vi.advanceTimersByTimeAsync(WRITE_TIMEOUT_MS);

    expect(getOutcome()).toBe("rejected");
    expect(native.share).not.toHaveBeenCalled();
    expect(native.deleteFile).toHaveBeenCalledOnce();
  });

  it("attempts cleanup when the native cache write fails", async () => {
    const writeError = new Error("write failed");
    native.writeFile.mockRejectedValue(writeError);

    await expect(
      nativeShareFile(new Blob(["photo"]), "share.png"),
    ).rejects.toBe(writeError);
    expect(native.share).not.toHaveBeenCalled();
    expect(native.deleteFile).toHaveBeenCalledOnce();
  });

  it("times out a stalled share so a later retry can complete", async () => {
    native.share
      .mockReturnValueOnce(pending())
      .mockResolvedValueOnce({ activityType: "save-image" });
    const firstShare = nativeShareFile(new Blob(["first"]), "first.png");
    const getFirstOutcome = await outcomeOf(firstShare);

    await vi.advanceTimersByTimeAsync(SHARE_TIMEOUT_MS);

    expect(getFirstOutcome()).toBe("rejected");
    await expect(
      nativeShareFile(new Blob(["second"]), "second.png"),
    ).resolves.toBe(true);
    expect(native.share).toHaveBeenCalledTimes(2);
    expect(native.deleteFile).toHaveBeenCalledTimes(2);
  });

  it("cleans up a failed share so a later retry can complete", async () => {
    const shareError = new Error("native share failed");
    native.share
      .mockRejectedValueOnce(shareError)
      .mockResolvedValueOnce({ activityType: "save-image" });

    await expect(
      nativeShareFile(new Blob(["first"]), "first.png"),
    ).rejects.toBe(shareError);
    await expect(
      nativeShareFile(new Blob(["second"]), "second.png"),
    ).resolves.toBe(true);
    expect(native.share).toHaveBeenCalledTimes(2);
    expect(native.deleteFile).toHaveBeenCalledTimes(2);
  });

  it("preserves the native user-cancel rejection", async () => {
    const cancel = new Error("Share canceled");
    native.share.mockRejectedValue(cancel);

    await expect(
      nativeShareFile(new Blob(["photo"]), "share.png"),
    ).rejects.toBe(cancel);
    expect(native.deleteFile).toHaveBeenCalledOnce();
  });

  it("does not let stalled cleanup wedge the completed share", async () => {
    native.deleteFile.mockReturnValue(pending());
    const share = nativeShareFile(new Blob(["photo"]), "share.png");
    const getOutcome = await outcomeOf(share);

    await vi.advanceTimersByTimeAsync(CLEANUP_TIMEOUT_MS);

    expect(getOutcome()).toBe("resolved");
  });
});
