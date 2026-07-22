import { describe, expect, it, vi } from "vitest";
import { prepareServiceWorkerState } from "./nativeStartup";

describe("prepareServiceWorkerState", () => {
  it("unregisters legacy workers and removes caches in the native shell", async () => {
    const unregisterFirst = vi.fn().mockResolvedValue(true);
    const unregisterSecond = vi.fn().mockResolvedValue(true);
    const getRegistrations = vi
      .fn()
      .mockResolvedValue([
        { unregister: unregisterFirst },
        { unregister: unregisterSecond },
      ]);
    const deleteCache = vi.fn().mockResolvedValue(true);
    const keys = vi.fn().mockResolvedValue(["legacy-assets", "workbox"]);
    const registerWebServiceWorker = vi.fn();

    await prepareServiceWorkerState({
      nativeShell: true,
      registerWebServiceWorker,
      serviceWorker: { getRegistrations },
      cacheStorage: { keys, delete: deleteCache },
    });

    expect(registerWebServiceWorker).not.toHaveBeenCalled();
    expect(unregisterFirst).toHaveBeenCalledOnce();
    expect(unregisterSecond).toHaveBeenCalledOnce();
    expect(deleteCache).toHaveBeenCalledTimes(2);
    expect(deleteCache).toHaveBeenNthCalledWith(1, "legacy-assets");
    expect(deleteCache).toHaveBeenNthCalledWith(2, "workbox");
  });

  it("preserves PWA registration on the web without clearing web caches", async () => {
    const registerWebServiceWorker = vi.fn();
    const getRegistrations = vi.fn();
    const keys = vi.fn();

    await prepareServiceWorkerState({
      nativeShell: false,
      registerWebServiceWorker,
      serviceWorker: { getRegistrations },
      cacheStorage: { keys, delete: vi.fn() },
    });

    expect(registerWebServiceWorker).toHaveBeenCalledOnce();
    expect(getRegistrations).not.toHaveBeenCalled();
    expect(keys).not.toHaveBeenCalled();
  });

  it("does not block startup when native cleanup APIs fail", async () => {
    await expect(
      prepareServiceWorkerState({
        nativeShell: true,
        registerWebServiceWorker: vi.fn(),
        serviceWorker: {
          getRegistrations: vi.fn().mockRejectedValue(new Error("unavailable")),
        },
        cacheStorage: {
          keys: vi.fn().mockRejectedValue(new Error("unavailable")),
          delete: vi.fn(),
        },
      }),
    ).resolves.toBeUndefined();
  });
});
