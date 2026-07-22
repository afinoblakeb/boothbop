import { afterEach, beforeEach, describe, expect, it } from "vitest";
// Reset the in-memory IndexedDB between tests for isolation.
import { IDBFactory } from "fake-indexeddb";
import {
  clearSessions,
  deleteSession,
  galleryCanvasSize,
  listSessionSummaries,
  loadSession,
  saveSession,
  updateSessionPhotos,
  type Session,
} from "./gallery";

const photo = (byte: number) =>
  new Blob([new Uint8Array([byte])], { type: "image/jpeg" });
const fourPhotos = () => [photo(1), photo(2), photo(3), photo(4)];
beforeEach(() => {
  // Fresh database per test.
  globalThis.indexedDB = new IDBFactory();
});
afterEach(async () => {
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
});
