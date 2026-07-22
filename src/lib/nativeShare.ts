// Native share for the iOS/Android shell (Capacitor).
//
// The Web Share API works in a WKWebView for Messages/AirDrop, but iOS does NOT
// expose "Save Image" / "Save Video" to the Photos library for files shared
// that way. The native Capacitor share sheet does — but it needs a real file
// URI, so we first write the blob to the cache directory, then share that.
//
// Web builds never call this (guarded by isNativeShell); the Capacitor plugins
// are dynamically imported so they stay out of the web path.
import { isNativeShell } from "./platform";

const NATIVE_BRIDGE_TIMEOUT_MS = {
  write: 15_000,
  share: 10 * 60_000,
  cleanup: 5_000,
} as const;

function boundedNativePhase<T>(
  phase: string,
  operation: () => Promise<T>,
  timeoutMs: number,
): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => {
      reject(new Error(`Native ${phase} timed out.`));
    }, timeoutMs);
  });

  return Promise.race([Promise.resolve().then(operation), deadline]).finally(
    () => {
      if (timeout !== undefined) clearTimeout(timeout);
    },
  );
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // strip the "data:<type>;base64," prefix Filesystem doesn't want
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export function uniqueShareFilename(
  filename: string,
  id: string = crypto.randomUUID(),
) {
  return `${id}-${filename}`;
}

/**
 * Share/save a generated file through the native iOS share sheet (which
 * includes Save Image / Save Video). Returns false on the web so callers can
 * fall back to the Web Share API. Throws if the user cancels or it fails.
 */
export async function nativeShareFile(
  blob: Blob,
  filename: string,
): Promise<boolean> {
  if (!isNativeShell()) return false;
  const [{ Filesystem, Directory }, { Share }] = await Promise.all([
    import("@capacitor/filesystem"),
    import("@capacitor/share"),
  ]);
  const path = uniqueShareFilename(filename);
  try {
    const data = await blobToBase64(blob);
    const { uri } = await boundedNativePhase(
      "cache write",
      () =>
        Filesystem.writeFile({
          path,
          data,
          directory: Directory.Cache,
        }),
      NATIVE_BRIDGE_TIMEOUT_MS.write,
    );
    await boundedNativePhase(
      "share",
      () => Share.share({ title: "BoothBop", files: [uri] }),
      NATIVE_BRIDGE_TIMEOUT_MS.share,
    );
    return true;
  } finally {
    await boundedNativePhase(
      "cache cleanup",
      () => Filesystem.deleteFile({ path, directory: Directory.Cache }),
      NATIVE_BRIDGE_TIMEOUT_MS.cleanup,
    ).catch(() => {});
  }
}
