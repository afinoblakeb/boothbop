// Conservative platform / capability detection.
//
// Rule of thumb: drive *behaviour* off feature detection (can we share files?)
// and use platform detection only to tailor *instructions/copy*.

/**
 * True when running inside the native app shell (Capacitor), as opposed to a
 * web browser. Capacitor injects `window.Capacitor` and exposes
 * `isNativePlatform()`. Use this to hide web-only UI — install/"Add to Home
 * Screen" prompts, the PhotoBlast migration landing — that must NOT appear in
 * the App Store build (Apple rejects apps that point users off-platform).
 * Do NOT use `isStandalone()` for this: a Capacitor WKWebView does not report
 * `display-mode: standalone`.
 */
export function isNativeShell(): boolean {
  // Production browser journeys can exercise native-only launch behavior
  // without weakening the real build. VITE_DEMO is absent from App Store and
  // web releases, so Vite removes this branch there.
  if (
    import.meta.env.VITE_DEMO === "1" &&
    new URLSearchParams(window.location.search).get("native") === "1"
  ) {
    return true;
  }
  const w = window as Window & {
    Capacitor?: { isNativePlatform?: () => boolean };
  };
  return w.Capacitor?.isNativePlatform?.() === true;
}

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
  return (
    typeof nav.share === "function" &&
    nav.canShare?.({ files: [file] }) === true
  );
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
