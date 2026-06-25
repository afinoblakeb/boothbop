import { afterEach, beforeEach, describe, expect, it } from "vitest";
// Reset the in-memory IndexedDB between tests for isolation.
import { IDBFactory } from "fake-indexeddb";
import {
  clearSessions,
  cleanSessionTitle,
  deleteSession,
  listSessions,
  saveSession,
  updateSessionMeta,
  updateSessionPhotos,
  updateSessionStyle,
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

  it("cleans saved session titles", () => {
    expect(cleanSessionTitle("  birthday    booth   ")).toBe("birthday booth");
    expect(cleanSessionTitle("x".repeat(60))).toHaveLength(36);
  });

  it("updates a session title and favorite flag", async () => {
    const session = await saveSession(fourPhotos());
    const updated = await updateSessionMeta(session.id, {
      title: "  Launch   Party  ",
      favorite: true,
    });
    expect(updated?.title).toBe("Launch Party");
    expect(updated?.favorite).toBe(true);
    const stored = (await listSessions()).find((s) => s.id === session.id);
    expect(stored?.title).toBe("Launch Party");
    expect(stored?.favorite).toBe(true);
  });

  it("pins favorites before non-favorites", async () => {
    const a = await saveSession(fourPhotos());
    const b = await saveSession(fourPhotos());
    await updateSessionMeta(a.id, { favorite: true });
    const list = await listSessions();
    expect(list[0].id).toBe(a.id);
    expect(list.map((s) => s.id)).toContain(b.id);
  });

  it("replaces the photos on an existing session", async () => {
    const session = await saveSession(fourPhotos());
    const updated = await updateSessionPhotos(session.id, [photo(99)]);
    expect(updated?.photos).toHaveLength(1);
    const stored = (await listSessions()).find((s) => s.id === session.id);
    expect(stored?.photos).toHaveLength(1);
  });

  it("saves and updates session style metadata", async () => {
    const session = await saveSession(fourPhotos(), {
      layout: "2x2",
      themeKey: "teal",
      filter: "warm",
      sticker: "sparkles",
      caption: "  Launch   Night  ",
    });
    expect(session.style).toEqual({
      layout: "2x2",
      themeKey: "teal",
      filter: "warm",
      sticker: "sparkles",
      caption: "Launch Night",
    });

    const updated = await updateSessionStyle(session.id, {
      layout: "story",
      themeKey: "rust",
      filter: "vintage",
      sticker: "party",
    });
    expect(updated?.style).toEqual({
      layout: "story",
      themeKey: "rust",
      filter: "vintage",
      sticker: "party",
    });
    const stored = (await listSessions()).find((s) => s.id === session.id);
    expect(stored?.style?.layout).toBe("story");
  });

  it("normalizes legacy invalid style metadata", async () => {
    const session = await saveSession(fourPhotos(), {
      layout: "bad" as never,
      themeKey: "missing",
      filter: "weird" as never,
      sticker: "strange" as never,
      caption: "x".repeat(60),
    });
    expect(session.style).toEqual({
      layout: "4x1",
      themeKey: "classic",
      filter: "none",
      caption: "x".repeat(28),
    });
  });
});
