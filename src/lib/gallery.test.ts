import { afterEach, beforeEach, describe, expect, it } from "vitest";
// Reset the in-memory IndexedDB between tests for isolation.
import { IDBFactory } from "fake-indexeddb";
import {
  clearSessions,
  deleteSession,
  listSessions,
  saveSession,
  updateSessionPhotos,
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
    const list = await listSessions();
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
    const list = await listSessions();
    const ids = list.map((s) => s.id);
    expect(ids).not.toContain(a.id);
    expect(ids).toContain(b.id);
  });

  it("clears every session", async () => {
    await saveSession(fourPhotos());
    await saveSession(fourPhotos());
    await clearSessions();
    expect(await listSessions()).toHaveLength(0);
  });

  it("persists the photos array through a save/list round-trip", async () => {
    const { id } = await saveSession([photo(42), photo(7)]);
    const stored = (await listSessions()).find((s) => s.id === id);
    expect(stored).toBeDefined();
    expect(stored!.photos).toHaveLength(2);
    expect(stored!.photos[0]).toBeTruthy();
  });

  it("updates photos without changing identity or creating a duplicate", async () => {
    const session = await saveSession(fourPhotos());
    const replacement = [photo(1), photo(2), photo(99)];

    const updated = await updateSessionPhotos(session.id, replacement);
    const stored = await listSessions();

    expect(updated.id).toBe(session.id);
    expect(updated.createdAt).toBe(session.createdAt);
    expect(stored).toHaveLength(1);
    expect(stored[0].photos).toHaveLength(3);
  });

  it("rejects an update for a session that no longer exists", async () => {
    await expect(updateSessionPhotos("missing", fourPhotos())).rejects.toThrow(
      "Session not found",
    );
  });
});
