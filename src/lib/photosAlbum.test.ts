import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  canSaveWithPhotosPermission,
  ensurePhotosPermission,
  saveToPhotos,
} from "./photosAlbum";
import { BoothBopPhotos } from "./boothBopPhotosPlugin";
import type { AccessStatus } from "./boothBopPhotosPlugin";

// Mock our native bridge so the native-path tests run in jsdom without iOS.
// vi.mock is hoisted; the factory returns spies we re-grab via vi.mocked below.
vi.mock("./boothBopPhotosPlugin", () => ({
  BoothBopPhotos: {
    save: vi.fn(),
    requestAccess: vi.fn(),
    checkAccess: vi.fn(),
    openSettings: vi.fn(),
  },
}));

// With no window.Capacitor, isNativeShell() is false, so every function must
// no-op without ever importing the native plugin (which jsdom can't load).
afterEach(() => {
  delete (window as Window & { Capacitor?: unknown }).Capacitor;
  vi.clearAllMocks();
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

describe("photosAlbum on native shell", () => {
  beforeEach(() => {
    (window as Window & { Capacitor?: unknown }).Capacitor = {
      isNativePlatform: () => true,
    };
  });

  describe("saveToPhotos", () => {
    beforeEach(() => {
      vi.mocked(BoothBopPhotos.save).mockResolvedValue({ assetId: "a1" });
    });

    it("maps image kind → type 'image' and resolves true", async () => {
      await expect(
        saveToPhotos(new Blob(["x"], { type: "image/jpeg" }), "image", "album"),
      ).resolves.toBe(true);
      expect(vi.mocked(BoothBopPhotos.save)).toHaveBeenCalledWith(
        expect.objectContaining({ type: "image" }),
      );
    });

    it("maps video kind → type 'video'", async () => {
      await saveToPhotos(new Blob(["x"]), "video", "cameraRoll");
      expect(vi.mocked(BoothBopPhotos.save)).toHaveBeenCalledWith(
        expect.objectContaining({ type: "video" }),
      );
    });

    it("uses blob.type as the mime when present", async () => {
      await saveToPhotos(
        new Blob(["x"], { type: "image/jpeg" }),
        "image",
        "album",
      );
      expect(vi.mocked(BoothBopPhotos.save)).toHaveBeenCalledWith(
        expect.objectContaining({ mime: "image/jpeg" }),
      );
    });

    it("falls back to image/png for an untyped image blob", async () => {
      await saveToPhotos(new Blob(["x"]), "image", "album");
      expect(vi.mocked(BoothBopPhotos.save)).toHaveBeenCalledWith(
        expect.objectContaining({ mime: "image/png" }),
      );
    });

    it("falls back to video/mp4 for an untyped video blob", async () => {
      await saveToPhotos(new Blob(["x"]), "video", "album");
      expect(vi.mocked(BoothBopPhotos.save)).toHaveBeenCalledWith(
        expect.objectContaining({ mime: "video/mp4" }),
      );
    });

    it("sets album true for the album destination", async () => {
      await saveToPhotos(new Blob(["x"]), "image", "album");
      expect(vi.mocked(BoothBopPhotos.save)).toHaveBeenCalledWith(
        expect.objectContaining({ album: true }),
      );
    });

    it("sets album false for the camera-roll destination", async () => {
      await saveToPhotos(new Blob(["x"]), "image", "cameraRoll");
      expect(vi.mocked(BoothBopPhotos.save)).toHaveBeenCalledWith(
        expect.objectContaining({ album: false }),
      );
    });

    it("passes the base64 with the data-URL prefix stripped", async () => {
      await saveToPhotos(new Blob(["x"]), "image", "album");
      // base64("x") === "eA==" — no "data:...;base64," prefix.
      expect(vi.mocked(BoothBopPhotos.save)).toHaveBeenCalledWith(
        expect.objectContaining({ base64: "eA==" }),
      );
    });
  });

  describe("ensurePhotosPermission", () => {
    beforeEach(() => {
      vi.mocked(BoothBopPhotos.requestAccess).mockResolvedValue({
        status: "granted",
      });
      vi.mocked(BoothBopPhotos.checkAccess).mockResolvedValue({
        status: "granted",
      });
    });

    it("maps the album destination → readWrite level", async () => {
      await ensurePhotosPermission("album");
      expect(vi.mocked(BoothBopPhotos.requestAccess)).toHaveBeenCalledWith({
        level: "readWrite",
      });
    });

    it("maps the camera-roll destination → addOnly level", async () => {
      await ensurePhotosPermission("cameraRoll");
      expect(vi.mocked(BoothBopPhotos.requestAccess)).toHaveBeenCalledWith({
        level: "addOnly",
      });
    });

    it("prompts via requestAccess by default (not checkAccess)", async () => {
      await ensurePhotosPermission("album");
      expect(vi.mocked(BoothBopPhotos.requestAccess)).toHaveBeenCalled();
      expect(vi.mocked(BoothBopPhotos.checkAccess)).not.toHaveBeenCalled();
    });

    it("reads via checkAccess when prompt is false (not requestAccess)", async () => {
      await ensurePhotosPermission("album", false);
      expect(vi.mocked(BoothBopPhotos.checkAccess)).toHaveBeenCalled();
      expect(vi.mocked(BoothBopPhotos.requestAccess)).not.toHaveBeenCalled();
    });

    const cases: [AccessStatus, "granted" | "limited" | "denied"][] = [
      ["granted", "granted"],
      ["limited", "limited"],
      ["denied", "denied"],
      ["notDetermined", "denied"],
    ];

    it.each(cases)(
      "maps native status %s → result %s when prompting",
      async (status, expected) => {
        vi.mocked(BoothBopPhotos.requestAccess).mockResolvedValue({ status });
        await expect(ensurePhotosPermission("album")).resolves.toBe(expected);
      },
    );

    it.each(cases)(
      "maps native status %s → result %s when reading",
      async (status, expected) => {
        vi.mocked(BoothBopPhotos.checkAccess).mockResolvedValue({ status });
        await expect(ensurePhotosPermission("album", false)).resolves.toBe(
          expected,
        );
      },
    );
  });
});

describe("canSaveWithPhotosPermission", () => {
  it("requires full access for album saves", () => {
    expect(canSaveWithPhotosPermission("album", "granted")).toBe(true);
    expect(canSaveWithPhotosPermission("album", "limited")).toBe(false);
    expect(canSaveWithPhotosPermission("album", "denied")).toBe(false);
  });

  it("allows camera-roll saves with add-only limited access", () => {
    expect(canSaveWithPhotosPermission("cameraRoll", "granted")).toBe(true);
    expect(canSaveWithPhotosPermission("cameraRoll", "limited")).toBe(true);
    expect(canSaveWithPhotosPermission("cameraRoll", "unsupported")).toBe(
      false,
    );
  });
});
