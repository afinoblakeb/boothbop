// Conservative platform / capability detection.
//
// Rule of thumb: drive *behaviour* off feature detection (can we share files?)
// and use platform detection only to tailor *instructions/copy*.

/** True for iPhone/iPad (including iPadOS, which masquerades as macOS). */
export function isIOS(): boolean {
  const ua = navigator.userAgent || "";
  const iDevice = /iPad|iPhone|iPod/.test(ua);
  const iPadOS =
    navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return iDevice || iPadOS;
}

/** Can this browser share actual files (not just links/text)? */
export function canShareFiles(file: File): boolean {
  const nav = navigator as Navigator & {
    canShare?: (data?: ShareData) => boolean;
  };
  return typeof nav.share === "function" && nav.canShare?.({ files: [file] }) === true;
}

/** One-off probe so UI can label the primary button before a file exists. */
export function probeShareFiles(): boolean {
  try {
    const probe = new File([new Uint8Array([0])], "probe.png", {
      type: "image/png",
    });
    return canShareFiles(probe);
  } catch {
    return false;
  }
}
