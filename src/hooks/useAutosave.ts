import { useEffect, useState } from "react";
import { isNativeShell } from "../lib/platform";
import {
  anyAutosaveOn,
  loadAutosave,
  saveAutosaveDest,
  saveAutosaveFormat,
  type AutosaveDest,
  type AutosaveFormat,
  type AutosaveSettings,
} from "../lib/settings";
import {
  ensurePhotosPermission,
  type PermissionResult,
} from "../lib/photosAlbum";

// The actionable message when auto-save can't run because Photos access isn't
// sufficient — tailored to the destination and the exact access state.
function autosaveAccessMessage(
  dest: AutosaveDest,
  status: PermissionResult,
): string {
  if (dest === "album") {
    return status === "limited"
      ? "BoothBop has limited Photos access. Saving to an album needs Full Access — set Photos to “All Photos” in iOS Settings, then turn auto-save on again."
      : "Saving to a BoothBop album needs Full Photos Access. Allow it in iOS Settings (or switch to Camera Roll), then turn auto-save on again.";
  }
  return "Photos access is off. Allow it in iOS Settings, then turn auto-save on again.";
}

/**
 * Owns the auto-save-to-Photos settings + permission logic: the four format
 * toggles, the album/camera-roll destination, the Settings-overlay flag, and the
 * actionable error. Auto-save requires the right Photos access — FULL for the
 * album, add-only for the camera roll — so if access isn't granted (including
 * "limited") every toggle reverts and an explanatory error is set. On launch we
 * re-check WITHOUT prompting; an explicit toggle prompts.
 */
export function useAutosave() {
  const [autosave, setAutosave] = useState<AutosaveSettings>(loadAutosave);
  const [showSettings, setShowSettings] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tipSeen, setTipSeen] = useState(
    () => localStorage.getItem("bb.autosave.tipSeen") === "1",
  );

  // On launch (native): if auto-save is already on, verify access is still
  // granted WITHOUT prompting; if it was revoked, switch auto-save off.
  useEffect(() => {
    if (isNativeShell()) void applyAutosave(loadAutosave(), false);
  }, []);

  async function applyAutosave(next: AutosaveSettings, prompt: boolean) {
    setAutosave(next);
    if (!isNativeShell() || !anyAutosaveOn(next)) {
      setError(null);
      return;
    }
    let status: PermissionResult;
    try {
      status = await ensurePhotosPermission(next.dest, prompt);
    } catch {
      status = "denied";
    }
    // The album needs FULL access; the camera roll is fine with add-only, where
    // "limited" (Select Photos) still allows adding.
    const ok =
      status === "granted" ||
      (next.dest === "cameraRoll" && status === "limited");
    if (ok) {
      setError(null);
      return;
    }
    // Not enough access → turn auto-save off everywhere and explain.
    (["strip", "grid", "gif", "video"] as AutosaveFormat[]).forEach((f) =>
      saveAutosaveFormat(f, false),
    );
    setAutosave({
      ...next,
      strip: false,
      grid: false,
      gif: false,
      video: false,
    });
    setError(autosaveAccessMessage(next.dest, status));
  }

  function changeDest(dest: AutosaveDest) {
    saveAutosaveDest(dest);
    void applyAutosave({ ...autosave, dest }, true);
  }

  function toggleFormat(format: AutosaveFormat, on: boolean) {
    // Turning a format on prompts for access; turning off just re-verifies.
    saveAutosaveFormat(format, on);
    void applyAutosave({ ...autosave, [format]: on }, on);
  }

  function dismissTip() {
    if (tipSeen) return;
    localStorage.setItem("bb.autosave.tipSeen", "1");
    setTipSeen(true);
  }

  function openSettings() {
    setShowSettings(true);
    dismissTip();
    if (isNativeShell()) void applyAutosave(loadAutosave(), false);
  }

  return {
    autosave,
    showSettings,
    setShowSettings,
    error,
    tipSeen,
    changeDest,
    toggleFormat,
    dismissTip,
    openSettings,
  };
}
