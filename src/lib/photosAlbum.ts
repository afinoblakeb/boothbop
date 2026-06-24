// Auto-save BoothBop outputs to the iOS Photos app — either a dedicated
// "BoothBop" album (full Photos access) or the camera roll (add-only access).
// This is a native-only capability: a web PWA can't create albums or save
// silently, so every function no-ops on web. Mirrors src/lib/nativeShare.ts.

import type { MediaAlbum, MediaPlugin } from "@capacitor-community/media";
import { isNativeShell } from "./platform";
import type { AlbumSaveKind, AutosaveDest } from "./settings";

const ALBUM_NAME = "BoothBop";

export type PermissionResult = "granted" | "denied" | "unsupported";

// Cached identifier of the BoothBop album, plus the in-flight lookup so the four
// concurrent first-saves of one capture don't each create a duplicate album.
let albumId: string | null = null;
let albumPromise: Promise<string> | null = null;

async function loadMedia(): Promise<MediaPlugin> {
  const { Media } = await import("@capacitor-community/media");
  return Media;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error("read failed"));
    reader.readAsDataURL(blob);
  });
}

function isDeniedError(e: unknown): boolean {
  const msg = (e as Error)?.message ?? String(e);
  return /denied|not authorized|permission|access/i.test(msg);
}

// Resolve (creating if needed) the BoothBop album identifier. Requires full
// Photos access; the first getAlbums()/createAlbum() call triggers the prompt.
async function ensureAlbum(Media: MediaPlugin): Promise<string> {
  if (albumId) return albumId;
  if (albumPromise) return albumPromise;
  const find = (albums: MediaAlbum[]) =>
    albums.find((a) => a.name === ALBUM_NAME)?.identifier;
  albumPromise = (async () => {
    let id = find((await Media.getAlbums()).albums);
    if (!id) {
      await Media.createAlbum({ name: ALBUM_NAME });
      // createAlbum resolves void on iOS — re-query to read the new identifier.
      id = find((await Media.getAlbums()).albums);
    }
    if (!id) throw new Error("could not resolve BoothBop album");
    albumId = id;
    return id;
  })();
  try {
    return await albumPromise;
  } finally {
    albumPromise = null;
  }
}

/**
 * Save one blob to Photos. Returns true if saved, false on web (no-op). Throws
 * on permission denial / plugin failure so the caller can react (the capture
 * orchestrator swallows it so the flow is never broken).
 */
export async function saveToPhotos(
  blob: Blob,
  kind: AlbumSaveKind,
  dest: AutosaveDest,
): Promise<boolean> {
  if (!isNativeShell()) return false;
  const Media = await loadMedia();
  const path = await blobToDataUrl(blob);

  const save = (albumIdentifier?: string) =>
    kind === "video"
      ? Media.saveVideo({ path, albumIdentifier })
      : Media.savePhoto({ path, albumIdentifier });

  if (dest === "cameraRoll") {
    await save();
    return true;
  }

  try {
    await save(await ensureAlbum(Media));
  } catch (e) {
    // If the album was deleted out from under us, drop the stale id and retry
    // once. A permission denial is re-thrown for the caller to handle.
    if (isDeniedError(e)) throw e;
    albumId = null;
    await save(await ensureAlbum(Media));
  }
  return true;
}

/**
 * Proactively request the access the chosen destination needs, so a settings
 * toggle can revert if the user declines. Album → full access (probed via
 * getAlbums); camera roll → add-only, which iOS requests lazily at first save,
 * so we report "granted" and let that prompt happen then.
 */
export async function ensurePhotosPermission(
  dest: AutosaveDest,
): Promise<PermissionResult> {
  if (!isNativeShell()) return "unsupported";
  if (dest === "cameraRoll") return "granted";
  try {
    await ensureAlbum(await loadMedia());
    return "granted";
  } catch (e) {
    return isDeniedError(e) ? "denied" : "granted";
  }
}
