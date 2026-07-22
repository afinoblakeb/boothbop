// Auto-save BoothBop outputs to the iOS Photos app via our own native plugin
// (BoothBopPhotos, in AppDelegate.swift). Either a dedicated "BoothBop" album
// (full access) or the camera roll (add-only). No-ops on web.
//
// Replaces @capacitor-community/media, whose native class never registered under
// Capacitor 8 + SPM (calls hung silently). Our plugin registers deterministically.

import { isNativeShell } from "./platform";
import type { AlbumSaveKind, AutosaveDest } from "./settings";
import { BoothBopPhotos } from "./boothBopPhotosPlugin";

export type PermissionResult = "granted" | "limited" | "denied" | "unsupported";

export function canSaveWithPermission(
  dest: AutosaveDest,
  status: PermissionResult,
): boolean {
  return (
    status === "granted" || (dest === "cameraRoll" && status === "limited")
  );
}

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
 * Resolve the Photos access the chosen destination needs (album → full
 * read/write, camera roll → add-only). With `prompt` true it shows the iOS
 * permission dialog (use on an explicit toggle); false just reads the current
 * status (use on launch, so we never prompt out of the blue). "limited" (the
 * user picked "Select Photos") is reported distinctly — it's not full access.
 */
export async function ensurePhotosPermission(
  dest: AutosaveDest,
  prompt = true,
): Promise<PermissionResult> {
  if (!isNativeShell()) return "unsupported";
  const level = dest === "album" ? "readWrite" : "addOnly";
  const { status } = prompt
    ? await BoothBopPhotos.requestAccess({ level })
    : await BoothBopPhotos.checkAccess({ level });
  if (status === "granted") return "granted";
  if (status === "limited") return "limited";
  return "denied";
}

/** Open BoothBop's page in iOS Settings so the user can change Photos access. */
export async function openIosSettings(): Promise<void> {
  if (!isNativeShell()) return;
  await BoothBopPhotos.openSettings();
}
