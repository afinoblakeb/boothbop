import { describe, expect, it } from "vitest";
import {
  CURRENT_RELEASE_ANNOUNCEMENT,
  dismissReleaseAnnouncement,
  loadReleaseAnnouncement,
} from "./whatsNew";

describe("release announcements", () => {
  it("shows the current major-feature announcement until dismissed", () => {
    const storage = new StorageStub();

    expect(loadReleaseAnnouncement(storage)).toEqual(
      CURRENT_RELEASE_ANNOUNCEMENT,
    );
    dismissReleaseAnnouncement(storage);
    expect(loadReleaseAnnouncement(storage)).toBeNull();
  });

  it("shows a new announcement after the release version changes", () => {
    const storage = new StorageStub();
    storage.setItem("bb.lastSeenRelease", "0.0.3");

    expect(loadReleaseAnnouncement(storage)?.version).toBe("0.0.4");
  });

  it("fails soft when storage is unavailable", () => {
    const storage = {
      getItem: () => {
        throw new Error("storage unavailable");
      },
      setItem: () => {
        throw new Error("storage unavailable");
      },
    } as unknown as Storage;

    expect(loadReleaseAnnouncement(storage)).toEqual(
      CURRENT_RELEASE_ANNOUNCEMENT,
    );
    expect(() => dismissReleaseAnnouncement(storage)).not.toThrow();
  });
});

class StorageStub implements Storage {
  private readonly values = new Map<string, string>();

  get length() {
    return this.values.size;
  }

  clear() {
    this.values.clear();
  }

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  key(index: number) {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}
