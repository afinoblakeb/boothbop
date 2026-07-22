import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  type RemoteConfigDocument,
  type RuntimeConfig,
} from "../lib/remoteConfig";
import { useRemoteConfig } from "./useRemoteConfig";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

const documents: RemoteConfigDocument[] = [4, 5, 6].map((revision) => ({
  schemaVersion: 1,
  revision,
  features: {
    editor: false,
    gif: true,
    video: false,
    boom: true,
    retakeOne: false,
    brandingControl: true,
  },
}));

describe("useRemoteConfig", () => {
  let container: HTMLDivElement;
  let root: Root;
  let current: RuntimeConfig;

  beforeEach(() => {
    localStorage.clear();
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible",
    });
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  it("refreshes on foreground and resume without overlapping requests", async () => {
    const requests = documents.map(() => deferred<Response>());
    const fetcher = vi.fn(
      () => requests[fetcher.mock.calls.length - 1].promise,
    );
    vi.stubGlobal("fetch", fetcher);

    function Harness() {
      current = useRemoteConfig();
      return null;
    }

    act(() => root.render(<Harness />));
    expect(fetcher).toHaveBeenCalledTimes(1);

    document.dispatchEvent(new Event("visibilitychange"));
    document.dispatchEvent(new Event("resume"));
    expect(fetcher).toHaveBeenCalledTimes(1);

    await act(async () => {
      requests[0].resolve(
        new Response(JSON.stringify(documents[0]), { status: 200 }),
      );
      await requests[0].promise;
    });
    expect(current.revision).toBe(4);

    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "hidden",
    });
    document.dispatchEvent(new Event("visibilitychange"));
    expect(fetcher).toHaveBeenCalledTimes(1);

    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible",
    });
    document.dispatchEvent(new Event("visibilitychange"));
    expect(fetcher).toHaveBeenCalledTimes(2);
    document.dispatchEvent(new Event("resume"));
    expect(fetcher).toHaveBeenCalledTimes(2);

    await act(async () => {
      requests[1].resolve(
        new Response(JSON.stringify(documents[1]), { status: 200 }),
      );
      await requests[1].promise;
    });
    expect(current.revision).toBe(5);

    document.dispatchEvent(new Event("resume"));
    expect(fetcher).toHaveBeenCalledTimes(3);

    await act(async () => {
      requests[2].resolve(
        new Response(JSON.stringify(documents[2]), { status: 200 }),
      );
      await requests[2].promise;
    });
    expect(current.revision).toBe(6);
  });
});
