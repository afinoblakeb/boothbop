import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
// Reset the in-memory IndexedDB between tests for isolation.
import { IDBFactory } from "fake-indexeddb";
import {
  blobToCanvas,
  clearSessions,
  deleteSession,
  galleryCanvasSize,
  listSessionSummaries,
  loadSession,
  saveSession,
  updateSessionPhotos,
  type Session,
} from "./gallery";

type Settlement =
  | { status: "fulfilled" }
  | { status: "rejected"; reason: unknown }
  | { status: "pending" };

async function settlement(
  promise: Promise<unknown>,
  timeout = 25,
): Promise<Settlement> {
  return Promise.race([
    promise.then<Settlement, Settlement>(
      () => ({ status: "fulfilled" }),
      (reason: unknown) => ({ status: "rejected", reason }),
    ),
    new Promise<Settlement>((resolve) =>
      setTimeout(() => resolve({ status: "pending" }), timeout),
    ),
  ]);
}

function abortOnlyIndexedDB(error: DOMException): IDBFactory {
  return {
    open: vi.fn(() => {
      const request = {
        error: null,
        result: undefined as unknown,
        onerror: null as ((event: Event) => void) | null,
        onsuccess: null as ((event: Event) => void) | null,
        onupgradeneeded: null as ((event: Event) => void) | null,
      };
      const database = {
        close: vi.fn(),
        objectStoreNames: { contains: () => false },
        transaction: vi.fn(() => {
          const storeRequest = {
            error: null,
            result: undefined,
            onerror: null,
            onsuccess: null,
          };
          const store = {
            clear: vi.fn(() => storeRequest),
            delete: vi.fn(() => storeRequest),
            get: vi.fn(() => storeRequest),
            getAll: vi.fn(() => storeRequest),
            put: vi.fn(() => storeRequest),
          };
          const transaction = {
            error,
            objectStore: vi.fn(() => store),
            onabort: null as ((event: Event) => void) | null,
            oncomplete: null as ((event: Event) => void) | null,
            onerror: null as ((event: Event) => void) | null,
          };
          queueMicrotask(() => transaction.onabort?.(new Event("abort")));
          return transaction;
        }),
      };
      request.result = database;
      queueMicrotask(() => request.onsuccess?.(new Event("success")));
      return request;
    }),
  } as unknown as IDBFactory;
}

const photo = (byte: number) =>
  new Blob([new Uint8Array([byte])], { type: "image/jpeg" });
const fourPhotos = () => [photo(1), photo(2), photo(3), photo(4)];
beforeEach(() => {
  // Fresh database per test.
  globalThis.indexedDB = new IDBFactory();
});
afterEach(async () => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  globalThis.indexedDB = new IDBFactory();
  await clearSessions();
});

describe("gallery sessions", () => {
  it("migrates existing v1 sessions without losing their masters", async () => {
    const legacy: Session = {
      id: "legacy-session",
      createdAt: 1234,
      photos: fourPhotos(),
    };
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open("boothbop", 1);
      request.onupgradeneeded = () =>
        request.result.createObjectStore("sessions", { keyPath: "id" });
      request.onsuccess = () => {
        const database = request.result;
        const transaction = database.transaction("sessions", "readwrite");
        transaction.objectStore("sessions").put(legacy);
        transaction.oncomplete = () => {
          database.close();
          resolve();
        };
        transaction.onerror = () => reject(transaction.error);
      };
      request.onerror = () => reject(request.error);
    });

    const summaries = await listSessionSummaries();
    expect(summaries).toHaveLength(1);
    expect(summaries[0]).toMatchObject({
      id: legacy.id,
      createdAt: legacy.createdAt,
    });
    expect((await loadSession(legacy.id)).photos).toHaveLength(4);
  });

  it("preserves decoded source dimensions unless an explicit size is requested", () => {
    expect(galleryCanvasSize(1440, 1440)).toEqual({
      width: 1440,
      height: 1440,
    });
    expect(galleryCanvasSize(1440, 1440, 320)).toEqual({
      width: 320,
      height: 320,
    });
  });
  it("saves a session with a generated id, timestamp, and its photos", async () => {
    const session = await saveSession(fourPhotos());
    expect(session.id).toBeTruthy();
    expect(session.photos).toHaveLength(4);
    expect(typeof session.createdAt).toBe("number");
  });

  it("lists saved sessions newest-first", async () => {
    const a = await saveSession(fourPhotos());
    const b = await saveSession(fourPhotos());
    // Force a deterministic ordering regardless of clock resolution.
    a.createdAt = 1000;
    b.createdAt = 2000;
    await saveSession([]); // touch store so ids differ
    const list = await listSessionSummaries();
    const ids = list.map((s) => s.id);
    expect(ids).toContain(a.id);
    expect(ids).toContain(b.id);
    // Sorted by createdAt descending.
    for (let i = 1; i < list.length; i++) {
      expect(list[i - 1].createdAt).toBeGreaterThanOrEqual(list[i].createdAt);
    }
  });

  it("deletes a single session by id, leaving the rest", async () => {
    const a = await saveSession(fourPhotos());
    const b = await saveSession(fourPhotos());
    await deleteSession(a.id);
    const list = await listSessionSummaries();
    const ids = list.map((s) => s.id);
    expect(ids).not.toContain(a.id);
    expect(ids).toContain(b.id);
  });

  it("clears every session", async () => {
    await saveSession(fourPhotos());
    await saveSession(fourPhotos());
    await clearSessions();
    expect(await listSessionSummaries()).toHaveLength(0);
  });

  it("persists the photos array through a save/list round-trip", async () => {
    const { id } = await saveSession([photo(42), photo(7)]);
    const summaries = await listSessionSummaries();
    expect(summaries[0]).not.toHaveProperty("photos");
    const stored = await loadSession(id);
    expect(stored.photos).toHaveLength(2);
    expect(stored.photos[0]).toBeTruthy();
  });

  it("updates photos without changing identity or creating a duplicate", async () => {
    const session = await saveSession(fourPhotos());
    const replacement = [photo(1), photo(2), photo(99)];

    const updated = await updateSessionPhotos(session.id, replacement);
    const stored = await listSessionSummaries();

    expect(updated.id).toBe(session.id);
    expect(updated.createdAt).toBe(session.createdAt);
    expect(stored).toHaveLength(1);
    expect((await loadSession(session.id)).photos).toHaveLength(3);
  });

  it("rejects an update for a session that no longer exists", async () => {
    await expect(updateSessionPhotos("missing", fourPhotos())).rejects.toThrow(
      "Session not found",
    );
  });

  it("rejects every operation when its IndexedDB transaction aborts", async () => {
    const abortError = new DOMException("Transaction aborted", "AbortError");
    globalThis.indexedDB = abortOnlyIndexedDB(abortError);

    const results = await Promise.all(
      [
        saveSession(fourPhotos()),
        loadSession("session"),
        updateSessionPhotos("session", fourPhotos()),
        listSessionSummaries(),
        deleteSession("session"),
        clearSessions(),
      ].map((operation) => settlement(operation)),
    );

    expect(results).toEqual(
      Array.from({ length: 6 }, () => ({
        status: "rejected",
        reason: abortError,
      })),
    );
  });
});

describe("blobToCanvas", () => {
  it("rejects when canvas setup throws during image load", async () => {
    const setupError = new Error("canvas setup failed");
    let triggerLoad: (() => void) | undefined;
    class TestImage {
      height = 100;
      naturalHeight = 100;
      naturalWidth = 100;
      onerror: ((error: unknown) => void) | null = null;
      onload: (() => void) | null = null;
      src = "";
      width = 100;

      constructor() {
        triggerLoad = () => this.onload?.();
      }
    }
    vi.stubGlobal("Image", TestImage);
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:gallery-test"),
      revokeObjectURL: vi.fn(),
    });
    vi.spyOn(document, "createElement").mockImplementation(() => {
      throw setupError;
    });

    const resultPromise = blobToCanvas(photo(1));
    try {
      triggerLoad?.();
    } catch {
      // Browser event dispatch reports callback errors instead of rethrowing them.
    }

    await expect(settlement(resultPromise)).resolves.toEqual({
      status: "rejected",
      reason: setupError,
    });
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:gallery-test");
  });
});
