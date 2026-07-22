import { afterEach, describe, expect, it, vi } from "vitest";
import { storageGet, storageSet } from "./safeStorage";

describe("safe storage", () => {
  afterEach(() => vi.restoreAllMocks());

  it("falls back instead of crashing launch when storage is unavailable", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("Storage blocked", "SecurityError");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Storage blocked", "SecurityError");
    });

    expect(storageGet("bb.delay")).toBeNull();
    expect(storageSet("bb.delay", "2")).toBe(false);
  });
});
