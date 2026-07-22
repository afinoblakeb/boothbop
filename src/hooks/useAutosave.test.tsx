import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ensurePhotosPermission,
  type PermissionResult,
} from "../lib/photosAlbum";
import { useAutosave } from "./useAutosave";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("../lib/photosAlbum", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/photosAlbum")>();
  return { ...actual, ensurePhotosPermission: vi.fn() };
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

describe("useAutosave", () => {
  let container: HTMLDivElement;
  let root: Root;
  let current: ReturnType<typeof useAutosave>;

  beforeEach(() => {
    localStorage.clear();
    (window as Window & { Capacitor?: unknown }).Capacitor = {
      isNativePlatform: () => true,
    };
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    function Harness() {
      current = useAutosave();
      return null;
    }

    act(() => root.render(<Harness />));
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    delete (window as Window & { Capacitor?: unknown }).Capacitor;
    vi.clearAllMocks();
  });

  it("ignores an older permission denial after a newer apply succeeds", async () => {
    const older = deferred<PermissionResult>();
    const newer = deferred<PermissionResult>();
    vi.mocked(ensurePhotosPermission)
      .mockReturnValueOnce(older.promise)
      .mockReturnValueOnce(newer.promise);

    act(() => current.toggleFormat("strip", true));
    act(() => current.toggleFormat("grid", true));

    await act(async () => newer.resolve("granted"));
    await act(async () => older.resolve("denied"));

    expect(current.autosave).toMatchObject({ strip: true, grid: true });
    expect(current.error).toBeNull();
    expect(localStorage.getItem("bb.autosave.strip")).toBe("1");
    expect(localStorage.getItem("bb.autosave.grid")).toBe("1");
  });
});
