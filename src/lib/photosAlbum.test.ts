import { afterEach, describe, expect, it } from "vitest";
import { ensurePhotosPermission, saveToPhotos } from "./photosAlbum";

// With no window.Capacitor, isNativeShell() is false, so every function must
// no-op without ever importing the native plugin (which jsdom can't load).
afterEach(() => {
  delete (window as Window & { Capacitor?: unknown }).Capacitor;
});

describe("photosAlbum on web (no native shell)", () => {
  it("saveToPhotos resolves false and touches no plugin", async () => {
    await expect(saveToPhotos(new Blob(["x"]), "image", "album")).resolves.toBe(
      false,
    );
  });

  it("ensurePhotosPermission reports unsupported on web", async () => {
    await expect(ensurePhotosPermission("album")).resolves.toBe("unsupported");
    await expect(ensurePhotosPermission("cameraRoll")).resolves.toBe(
      "unsupported",
    );
  });
});
