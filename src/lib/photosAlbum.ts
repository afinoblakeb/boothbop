// Auto-save BoothBop outputs to the iOS Photos app via our own native plugin
// (BoothBopPhotos, in AppDelegate.swift). Either a dedicated "BoothBop" album
// (full access) or the camera roll (add-only). No-ops on web.
//
// Replaces @capacitor-community/media, whose native class never registered under
// Capacitor 8 + SPM (calls hung silently). Our plugin registers deterministically.

import { isNativeShell } from "./platform";
import type { AlbumSaveKind, AutosaveDest } from "./settings";
import { BoothBopPhotos } from "./boothBopPhotosPlugin";

export type PermissionResult = "granted" | "denied" | "unsupported";

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const s = reader.result as string;
      resolve(s.slice(s.indexOf(",") + 1)); // strip the "data:...;base64," prefix
    };
    reader.onerror = () => reject(reader.error ?? new Error("read failed"));
    reader.readAsDataURL(blob);
  });
}

/**
 * Save one blob to Photos. Returns true if saved, false on web (no-op). Throws
 * on permission denial / native failure so the caller can react (the capture
 * orchestrator swallows so the flow is never broken).
 */
export async function saveToPhotos(
  blob: Blob,
  kind: AlbumSaveKind,
  dest: AutosaveDest,
): Promise<boolean> {
  if (!isNativeShell()) return false;
  const base64 = await blobToBase64(blob);
  const type = kind === "video" ? "video" : "image";
  const mime = blob.type || (type === "video" ? "video/mp4" : "image/png");
  await BoothBopPhotos.save({ base64, type, mime, album: dest === "album" });
  return true;
}

/**
 * Request the access the chosen destination needs (album → full read/write,
 * camera roll → add-only), so a settings toggle can revert if the user declines.
 */
export async function ensurePhotosPermission(
  dest: AutosaveDest,
): Promise<PermissionResult> {
  if (!isNativeShell()) return "unsupported";
  const level = dest === "album" ? "readWrite" : "addOnly";
  const { status } = await BoothBopPhotos.requestAccess({ level });
  return status === "granted" ? "granted" : "denied";
}
